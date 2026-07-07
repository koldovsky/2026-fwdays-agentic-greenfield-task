// tests/integration/kb-learning/full-flow.test.ts — kb-learning tasks.md
// §F.1: the full unanswered -> admin-answers -> lead-receives-answer loop,
// driven over the ALREADY-GREEN composed implementation of stages A-E.
// Mirrors booking-hitl's own `tests/integration/booking-hitl/full-flow.test.ts`
// harness exactly: real code paths, never re-implementations of them, glued
// together by SHARED STATE (one real on-disk SQLite file both the bot
// pipeline and the dashboard routes open their own connection to, WAL mode;
// one shared `FakeTelegramTransport` instance, mirroring the single real
// `TelegramTransport` a production bot process would use for both direct
// lead replies AND the drain's delivery sends).
//
// REAL code paths driven directly:
//   - the bot pipeline's `handleUpdate` (@kamerton/bot/src/pipeline.ts) for
//     every lead-side turn (KB-covered question -> `answer_faq`, uncovered
//     question -> `log_question`) — the model itself is a scripted
//     `FakeModelPort` (never a live Anthropic call in an integration test;
//     this test only proves the pieces connect, not model quality — that is
//     `evals/cases/fr-faq-01.eval.ts`'s/`fr-faq-02.eval.ts`'s job, stage H).
//   - the dashboard's answer route's exported `POST`
//     (apps/dashboard/app/api/questions/[id]/route.ts) for the admin
//     answer action, and its sibling retry route's exported `POST`
//     (apps/dashboard/app/api/questions/[id]/retry/route.ts).
//   - `@kamerton/bot/src/question-drain.ts`'s `drainQuestionDeliveries` for
//     the answer-delivery outbox side.
//
// THE KB-PATH SEAM (both sides honor `KAMERTON_KB_PATH`): the dashboard
// answer route resolves its write target via `resolveKbPath()` (falling back
// to the repo-root `knowledge/school.md`), and `packages/bot/src/pipeline.ts`
// now resolves its per-turn READ the same way —
// `readKnowledgeBaseText(process.env.KAMERTON_KB_PATH ?? DEFAULT_KNOWLEDGE_BASE_PATH)`
// — so a single env var redirects BOTH the read and the write to one file.
// This test uses that seam: `beforeEach` creates an isolated tmp KB file
// (seeded with a COPY of the real repo-root `knowledge/school.md` content, so
// the covered question still has real facts to ground on) and sets
// `KAMERTON_KB_PATH` at it. The route's step-3 append and the pipeline's
// step-7 read then share that tmp file — a genuine, unmocked, single-process
// shared file (exactly what design.md Decision 1's "no restart" claim is
// about), while the committed `knowledge/school.md` is only ever READ (never
// mutated), so no backup/restore dance is needed.
// The two questions this test asks ("Скільки триває індивідуальне
// заняття?" / covered; "Чи є у вас парковка?" / "Чи є знижка для двох
// дітей?" / uncovered) are chosen to match the seeded content's own
// coverage — the same two questions `packages/bot/src/pipeline.test.ts`'s
// own kb-learning C.11 suite already uses for exactly this reason.
//
// @trace FR-FAQ-01
// @trace FR-FAQ-02
// @trace FR-KB-01
// @trace FR-KB-02
// @trace FR-KB-03
// @trace FR-KB-04

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import {
  openDatabase,
  findOpenInboxQuestions,
  findQuestionById,
  type QuestionRow,
} from "@kamerton/db";
import { FakeModelPort, toolUseResponse } from "@kamerton/agent/src/testing/fake-model-port.ts";
import { serializeKbEntry } from "@kamerton/lib/src/kb/serialize-entry.ts";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import { handleUpdate, type HandleUpdateDeps } from "@kamerton/bot/src/pipeline.ts";
import { FakeTelegramTransport, type RecordedCall } from "@kamerton/bot/src/testing/fake-telegram-transport.ts";
import type { InboundTextUpdate } from "@kamerton/bot/src/telegram-transport.ts";
import { drainQuestionDeliveries } from "@kamerton/bot/src/question-drain.ts";
import { POST as postAnswerRoute } from "../../../apps/dashboard/app/api/questions/[id]/route.ts";
import { POST as postRetryRoute } from "../../../apps/dashboard/app/api/questions/[id]/retry/route.ts";

// The real, repo-root `knowledge/school.md` — read ONLY as the seed source
// for each test's isolated tmp KB fixture (never written). Three ".." from
// `tests/integration/kb-learning/` lands on the repo root, mirroring every
// other integration test's own relative-import convention in this repo.
const REAL_KB_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../..", "knowledge", "school.md");

// ---------------------------------------------------------------------------
// Scaffolding — mirrors `packages/bot/src/pipeline.test.ts`'s own
// `textUpdate`/`makeDeps` shape and `booking-hitl/full-flow.test.ts`'s own
// shared-on-disk-SQLite-file harness.
// ---------------------------------------------------------------------------

function textUpdate(overrides: Partial<InboundTextUpdate> = {}): InboundTextUpdate {
  return {
    type: "text",
    telegramUserId: "tg-user-kb-flow",
    telegramChatId: "tg-chat-kb-flow",
    telegramDisplayName: "Тестова Лідка",
    text: "Привіт",
    ...overrides,
  };
}

function sendMessageCalls(transport: FakeTelegramTransport): Array<Extract<RecordedCall, { kind: "sendMessage" }>> {
  return transport.calls.filter((call): call is Extract<RecordedCall, { kind: "sendMessage" }> => call.kind === "sendMessage");
}

function findQuestionByText(db: Database.Database, text: string): QuestionRow {
  const row = db.prepare(`SELECT * FROM questions WHERE text = ? ORDER BY id DESC LIMIT 1`).get(text) as
    | QuestionRow
    | undefined;
  if (row === undefined) {
    throw new Error(`full-flow.test.ts: expected a questions row for text ${JSON.stringify(text)}`);
  }
  return row;
}

function answerUrl(id: number): string {
  return `http://127.0.0.1:3000/api/questions/${id}`;
}

function retryUrl(id: number): string {
  return `http://127.0.0.1:3000/api/questions/${id}/retry`;
}

function postAnswer(id: number, answer: string): Promise<Response> {
  return postAnswerRoute(
    new Request(answerUrl(id), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer }),
    }),
    { params: Promise.resolve({ id: String(id) }) },
  );
}

function postRetry(id: number): Promise<Response> {
  return postRetryRoute(new Request(retryUrl(id), { method: "POST" }), {
    params: Promise.resolve({ id: String(id) }),
  });
}

describe("kb-learning full flow (tasks.md F.1): unanswered -> admin-answers -> lead-receives-answer, real SQLite + FakeTelegramTransport + the real knowledge/school.md file", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;
  let db: Database.Database;
  let transport: FakeTelegramTransport;
  let calendar: FakeCalendarPort;
  let kbPath: string;
  let previousKbPathEnv: string | undefined;

  beforeEach(() => {
    dbDir = mkdtempSync(join(tmpdir(), "kamerton-itest-kb-learning-"));
    dbPath = join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    // The answer/retry routes resolve their own `better-sqlite3` connection
    // from this env var (`apps/dashboard/lib/dashboard-db.ts`'s
    // `resolveDbPath`) — pointing it at the SAME file the pipeline's own
    // `db` below opens is what makes this a genuine shared-state
    // integration, not two isolated unit suites (mirrors
    // booking-hitl/full-flow.test.ts's own setup verbatim).
    process.env.KAMERTON_DB_PATH = dbPath;

    // Isolated tmp KB fixture, seeded with a COPY of the real seeded content
    // so the covered question still grounds on real facts. `KAMERTON_KB_PATH`
    // redirects BOTH the route's write and the pipeline's per-turn read here,
    // so the committed `knowledge/school.md` is never mutated.
    kbPath = join(dbDir, "school.md");
    writeFileSync(kbPath, readFileSync(REAL_KB_PATH, "utf8"));
    previousKbPathEnv = process.env.KAMERTON_KB_PATH;
    process.env.KAMERTON_KB_PATH = kbPath;

    db = openDatabase(dbPath);
    transport = new FakeTelegramTransport();
    calendar = new FakeCalendarPort();
  });

  afterEach(() => {
    db.close();
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    if (previousKbPathEnv === undefined) delete process.env.KAMERTON_KB_PATH;
    else process.env.KAMERTON_KB_PATH = previousKbPathEnv;
    rmSync(dbDir, { recursive: true, force: true });
  });

  function deps(model: FakeModelPort): HandleUpdateDeps {
    return { transport, db, model, calendar };
  }

  it("logs a KB-answered question with no inbox entry, logs an unanswered one, the admin answers it, the drain delivers it, a delivery failure stays retry-eligible, retry redelivers it, and a NEW lead's fresh conversation is answered from the KB with no restart", async () => {
    const leadAUser = "tg-user-kb-flow-a";
    const leadAChat = "tg-chat-kb-flow-a";

    // -----------------------------------------------------------------
    // Step 1 (@trace FR-FAQ-01, FR-KB-01): a KB-covered question drives an
    // `answer_faq` row (`answer_source='kb'`); the reply is the model's own
    // grounded narration; no inbox entry appears for it.
    // -----------------------------------------------------------------
    const coveredQuestion = "Скільки триває індивідуальне заняття?";
    const coveredNarration = "Індивідуальне заняття триває 45 хвилин.";
    await handleUpdate(
      textUpdate({ telegramUserId: leadAUser, telegramChatId: leadAChat, text: coveredQuestion }),
      deps(new FakeModelPort([toolUseResponse("answer_faq", { question: coveredQuestion }, { text: coveredNarration })])),
    );

    expect(sendMessageCalls(transport).some((call) => call.chatId === leadAChat && call.text.includes(coveredNarration))).toBe(
      true,
    );
    const kbRow = findQuestionByText(db, coveredQuestion);
    expect(kbRow.answer_source).toBe("kb");
    expect(findOpenInboxQuestions(db).map((row) => row.id)).not.toContain(kbRow.id);

    // -----------------------------------------------------------------
    // Step 2 (@trace FR-FAQ-02, FR-KB-01, FR-KB-02): an uncovered question
    // drives a `log_question` row (`unanswered`, `open`), visible in the
    // open-inbox query.
    // -----------------------------------------------------------------
    const parkingQuestion = "Чи є у вас парковка?";
    const parkingPromiseNarration = "Уточню це в адміністраторки і повернуся з відповіддю.";
    await handleUpdate(
      textUpdate({ telegramUserId: leadAUser, telegramChatId: leadAChat, text: parkingQuestion }),
      deps(new FakeModelPort([toolUseResponse("log_question", { question: parkingQuestion }, { text: parkingPromiseNarration })])),
    );

    const parkingRow = findQuestionByText(db, parkingQuestion);
    expect(parkingRow.answer_source).toBe("unanswered");
    expect(parkingRow.status).toBe("open");
    expect(findOpenInboxQuestions(db).map((row) => row.id)).toContain(parkingRow.id);

    // -----------------------------------------------------------------
    // Step 3 (@trace FR-KB-03): the admin answers via the REAL route — the
    // fixture file is appended (preserving prior content), the row becomes
    // `answered` + `delivery_status='pending'`.
    // -----------------------------------------------------------------
    const parkingAnswer = "Так, біля входу є невеликий безкоштовний паркувальний майданчик.";
    const beforeAppend = readFileSync(kbPath, "utf8");
    const answerResponse = await postAnswer(parkingRow.id, parkingAnswer);
    expect(answerResponse.status).toBe(200);
    const answerBody = (await answerResponse.json()) as { status: string };
    expect(answerBody.status).toBe("applied");

    const afterAppend = readFileSync(kbPath, "utf8");
    expect(afterAppend.startsWith(beforeAppend)).toBe(true);
    const expectedParkingEntry = serializeKbEntry({ question: parkingQuestion, answer: parkingAnswer });
    expect(afterAppend).toBe(beforeAppend + expectedParkingEntry);

    const answeredParkingRow = findQuestionById(db, parkingRow.id)!;
    expect(answeredParkingRow.status).toBe("answered");
    expect(answeredParkingRow.delivery_status).toBe("pending");
    expect(answeredParkingRow.admin_answer).toBe(parkingAnswer);
    expect(answeredParkingRow.answered_at).not.toBeNull();

    // -----------------------------------------------------------------
    // Step 4 (@trace FR-KB-04): a drain tick delivers it — `delivered`, the
    // row leaves the open-inbox query's result, and the lead's transport
    // received exactly one message containing the admin's answer.
    // -----------------------------------------------------------------
    const firstDrain = await drainQuestionDeliveries(db, transport);
    expect(firstDrain.delivered).toBe(1);
    expect(firstDrain.failed).toBe(0);

    const deliveredParkingRow = findQuestionById(db, parkingRow.id)!;
    expect(deliveredParkingRow.delivery_status).toBe("delivered");
    expect(findOpenInboxQuestions(db).map((row) => row.id)).not.toContain(parkingRow.id);

    const parkingDeliverySends = sendMessageCalls(transport).filter(
      (call) => call.chatId === leadAChat && call.text === parkingAnswer,
    );
    expect(parkingDeliverySends).toHaveLength(1);

    // -----------------------------------------------------------------
    // Step 5 (@trace FR-KB-04): a delivery failure on a DIFFERENT answered
    // row (a second, unrelated uncovered question) -> `failed`, stays in
    // the open-inbox query's result with retry eligibility.
    // -----------------------------------------------------------------
    const discountQuestion = "Чи є знижка для двох дітей?";
    const discountPromiseNarration = "Уточню це в адміністраторки і повернуся з відповіддю.";
    await handleUpdate(
      textUpdate({ telegramUserId: leadAUser, telegramChatId: leadAChat, text: discountQuestion }),
      deps(new FakeModelPort([toolUseResponse("log_question", { question: discountQuestion }, { text: discountPromiseNarration })])),
    );
    const discountRow = findQuestionByText(db, discountQuestion);
    expect(discountRow.answer_source).toBe("unanswered");

    const discountAnswer = "На жаль, знижок за кількість дітей наразі немає.";
    const discountAnswerResponse = await postAnswer(discountRow.id, discountAnswer);
    expect(discountAnswerResponse.status).toBe(200);
    expect(findQuestionById(db, discountRow.id)!.status).toBe("answered");
    expect(findQuestionById(db, discountRow.id)!.delivery_status).toBe("pending");

    // Simulate exactly ONE Telegram send failure for this row's delivery
    // attempt — `vi.spyOn` on this test's own `FakeTelegramTransport`
    // INSTANCE (never a module-level mock), so only the very next
    // `sendMessage` call fails; every other call (before and after) uses
    // the real recording/throwing behaviour already exercised above.
    vi.spyOn(transport, "sendMessage").mockImplementationOnce(async () => {
      throw new Error("full-flow.test.ts: simulated Telegram send failure");
    });

    const secondDrain = await drainQuestionDeliveries(db, transport);
    expect(secondDrain.delivered).toBe(0);
    expect(secondDrain.failed).toBe(1);

    const failedDiscountRow = findQuestionById(db, discountRow.id)!;
    expect(failedDiscountRow.delivery_status).toBe("failed");
    expect(findOpenInboxQuestions(db).map((row) => row.id)).toContain(discountRow.id);

    // -----------------------------------------------------------------
    // Step 6 (@trace FR-KB-04): the retry route flips it to `'pending'` ->
    // the next drain tick delivers it.
    // -----------------------------------------------------------------
    const retryResponse = await postRetry(discountRow.id);
    expect(retryResponse.status).toBe(200);
    const retryBody = (await retryResponse.json()) as { status: string };
    expect(retryBody.status).toBe("applied");
    expect(findQuestionById(db, discountRow.id)!.delivery_status).toBe("pending");

    const thirdDrain = await drainQuestionDeliveries(db, transport);
    expect(thirdDrain.delivered).toBe(1);
    expect(thirdDrain.failed).toBe(0);

    const redeliveredDiscountRow = findQuestionById(db, discountRow.id)!;
    expect(redeliveredDiscountRow.delivery_status).toBe("delivered");
    expect(findOpenInboxQuestions(db).map((row) => row.id)).not.toContain(discountRow.id);
    expect(
      sendMessageCalls(transport).filter((call) => call.chatId === leadAChat && call.text === discountAnswer),
    ).toHaveLength(1);

    // -----------------------------------------------------------------
    // Step 7 (@trace FR-KB-03 — the headline scenario): a NEW lead, in a
    // FRESH conversation, asks the SAME previously-uncovered parking
    // question -> answered from the KB this time (`answer_source='kb'`),
    // with NO bot restart between step 3's append and this turn. Proven not
    // just by the row's `answer_source`, but by asserting the actual system
    // prompt built for THIS turn contains the exact entry step 3 appended —
    // the real, load-bearing proof that `readKnowledgeBaseText` re-read the
    // file fresh (design.md Decision 1).
    // -----------------------------------------------------------------
    const leadBUser = "tg-user-kb-flow-b";
    const leadBChat = "tg-chat-kb-flow-b";
    const freshModel = new FakeModelPort([
      toolUseResponse("answer_faq", { question: parkingQuestion }, { text: parkingAnswer }),
    ]);
    await handleUpdate(
      textUpdate({ telegramUserId: leadBUser, telegramChatId: leadBChat, text: parkingQuestion }),
      deps(freshModel),
    );

    expect(freshModel.lastCall?.system).toContain(expectedParkingEntry);

    const freshKbRow = findQuestionByText(db, parkingQuestion);
    expect(freshKbRow.answer_source).toBe("kb");
    expect(freshKbRow.lead_id).not.toBe(kbRow.lead_id); // a genuinely different lead
    expect(
      sendMessageCalls(transport).some((call) => call.chatId === leadBChat && call.text.includes(parkingAnswer)),
    ).toBe(true);
  });
});
