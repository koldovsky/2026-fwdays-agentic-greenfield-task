// kb-learning tasks.md D.1 (RED): the bot's answer-delivery drain
// (design.md Decision 2: "a new `packages/bot/src/question-drain.ts`,
// structurally a near-twin of `notification-drain.ts`... queries
// `findDeliverableQuestions` — `status='answered' AND delivery_status
// ='pending'` ONLY"). `question-drain.ts` is a typed throwing stub today —
// every case below is expected to FAIL against that stub (the `Not
// implemented` throw propagating out of `await
// drainQuestionDeliveries(...)`), which is red for the right reason: the
// feature does not exist yet, not a false negative. Real in-memory SQLite
// (`openDatabase(":memory:")`, same convention as `packages/db`'s own
// `questions.test.ts`) + the existing `FakeTelegramTransport`
// (`notification-drain.test.ts`'s own fixture) — never a live Telegram chat.
//
// DIRECT precedent: `notification-drain.test.ts` — mirrored shape (in-flight
// re-entry guard covered structurally by D.2's implementation, per-row
// try/catch, `{delivered, failed}` return), with ONE deliberate, explicitly
// pinned divergence from that precedent: a `delivery_status='failed'` row is
// NEVER re-selected by a later call here (design.md Decision 2's named fork
// from S4's own auto-retry `IN ('pending','failed')` query) — see the
// "NEVER retries a failed row" case below, the regression pin for that fork.

import { describe, expect, it } from "vitest";
import {
  openDatabase,
  insertLead,
  insertRequest,
  insertQuestion,
  markQuestionAnswered,
  findQuestionById,
  type QuestionRow,
} from "@kamerton/db";
import { FakeTelegramTransport } from "./testing/fake-telegram-transport.ts";
import { drainQuestionDeliveries } from "./question-drain.ts";

/** Every case seeds its own fresh `:memory:` DB + its own lead/request rows
 *  (the `questions.lead_id` FK requires one to exist) — no test leaks state
 *  into another, same discipline as `questions.test.ts`/`pipeline.test.ts`. */
function seedLeadAndRequest(db: ReturnType<typeof openDatabase>, telegramChatId = "chat-kb-drain-1") {
  const lead = insertLead(db, {
    telegramUserId: `tg-${telegramChatId}`,
    telegramChatId,
  });
  const request = insertRequest(db, {
    leadId: lead.id,
    telegramChatId: lead.telegram_chat_id,
  });
  return { lead, request };
}

function readQuestion(db: ReturnType<typeof openDatabase>, id: number): QuestionRow {
  return findQuestionById(db, id) as QuestionRow;
}

describe("drainQuestionDeliveries (kb-learning design.md Decision 2)", () => {
  // @trace FR-KB-04, @trace NFR-REL-01
  it("sends admin_answer to telegram_chat_id for every answered+pending row and marks each delivered", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport();
    const { lead: leadA } = seedLeadAndRequest(db, "chat-kb-drain-a");
    const { lead: leadB } = seedLeadAndRequest(db, "chat-kb-drain-b");

    const questionA = insertQuestion(db, {
      leadId: leadA.id,
      telegramChatId: leadA.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, questionA.id, "Заняття коштує 800 грн за годину.");

    const questionB = insertQuestion(db, {
      leadId: leadB.id,
      telegramChatId: leadB.telegram_chat_id,
      text: "Скільки триває заняття?",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, questionB.id, "Заняття триває 60 хвилин.");

    const result = await drainQuestionDeliveries(db, transport);

    expect(result).toEqual({ delivered: 2, failed: 0 });

    const sendMessageCalls = transport.calls.filter((call) => call.kind === "sendMessage");
    expect(sendMessageCalls).toHaveLength(2);
    expect(sendMessageCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "sendMessage",
          chatId: "chat-kb-drain-a",
          text: "Заняття коштує 800 грн за годину.",
        }),
        expect.objectContaining({
          kind: "sendMessage",
          chatId: "chat-kb-drain-b",
          text: "Заняття триває 60 хвилин.",
        }),
      ]),
    );

    const rowA = readQuestion(db, questionA.id);
    expect(rowA.delivery_status).toBe("delivered");
    const rowB = readQuestion(db, questionB.id);
    expect(rowB.delivery_status).toBe("delivered");

    db.close();
  });

  // @trace NFR-REL-01
  it("marks the row failed without throwing out of drainQuestionDeliveries when the transport rejects", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport({ sendMessageFailures: 1 });
    const { lead } = seedLeadAndRequest(db);

    const question = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, question.id, "Заняття коштує 800 грн за годину.");

    // The whole point of this case: drainQuestionDeliveries resolves, it
    // never rejects even though the underlying transport call threw.
    await expect(drainQuestionDeliveries(db, transport)).resolves.toEqual({ delivered: 0, failed: 1 });

    const row = readQuestion(db, question.id);
    expect(row.delivery_status).toBe("failed");
    expect(row.delivery_status).not.toBe("pending");

    db.close();
  });

  // @trace FR-KB-04, @trace NFR-REL-01
  it("one bad row never aborts the batch: the other deliverable row still delivers", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport({ sendMessageFailures: 1 });
    const { lead: failingLead } = seedLeadAndRequest(db, "chat-kb-drain-failing");
    const { lead: okLead } = seedLeadAndRequest(db, "chat-kb-drain-ok");

    const failingQuestion = insertQuestion(db, {
      leadId: failingLead.id,
      telegramChatId: failingLead.telegram_chat_id,
      text: "Питання, доставка якого впаде",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, failingQuestion.id, "Відповідь 1");

    const okQuestion = insertQuestion(db, {
      leadId: okLead.id,
      telegramChatId: okLead.telegram_chat_id,
      text: "Питання, доставка якого вдасться",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, okQuestion.id, "Відповідь 2");

    const result = await drainQuestionDeliveries(db, transport);

    expect(result).toEqual({ delivered: 1, failed: 1 });
    expect(readQuestion(db, failingQuestion.id).delivery_status).toBe("failed");
    expect(readQuestion(db, okQuestion.id).delivery_status).toBe("delivered");

    db.close();
  });

  // @trace FR-KB-04
  it("never resends an already-delivered row on a second drainQuestionDeliveries call", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport();
    const { lead } = seedLeadAndRequest(db);

    const question = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, question.id, "Заняття коштує 800 грн за годину.");

    const first = await drainQuestionDeliveries(db, transport);
    expect(first).toEqual({ delivered: 1, failed: 0 });

    const sendMessageCountAfterFirst = transport.calls.filter((c) => c.kind === "sendMessage").length;

    const second = await drainQuestionDeliveries(db, transport);
    expect(second).toEqual({ delivered: 0, failed: 0 });

    const sendMessageCountAfterSecond = transport.calls.filter((c) => c.kind === "sendMessage").length;
    expect(sendMessageCountAfterSecond).toBe(sendMessageCountAfterFirst);

    expect(readQuestion(db, question.id).delivery_status).toBe("delivered");

    db.close();
  });

  // Regression pin for design.md Decision 2's explicit fork from S4's own
  // `notification-drain.ts` auto-retry precedent (`IN ('pending','failed')`):
  // a `delivery_status='failed'` row must NEVER be re-selected by a
  // subsequent `drainQuestionDeliveries` call — only the manual
  // `POST /api/questions/[id]/retry` route (stage E, `retryQuestionDelivery`)
  // may put it back in this queue.
  // @trace FR-KB-04, @trace NFR-REL-01
  it("NEVER retries a failed row on a later call — manual retry only (design.md Decision 2)", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport({ sendMessageFailures: 1 });
    const { lead } = seedLeadAndRequest(db);

    const question = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Питання, що не доставляється",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, question.id, "Відповідь адміністраторки");

    // First tick: the transport is scripted to fail once -> row becomes
    // 'failed'.
    const first = await drainQuestionDeliveries(db, transport);
    expect(first).toEqual({ delivered: 0, failed: 1 });
    expect(readQuestion(db, question.id).delivery_status).toBe("failed");

    const sendMessageCountAfterFirst = transport.calls.filter((c) => c.kind === "sendMessage").length;

    // Second tick: no manual retry route was ever called — unlike
    // `notification-drain.ts`'s own `IN ('pending','failed')` precedent, this
    // failed row must be silently skipped, not resent.
    const second = await drainQuestionDeliveries(db, transport);
    expect(second).toEqual({ delivered: 0, failed: 0 });

    const sendMessageCountAfterSecond = transport.calls.filter((c) => c.kind === "sendMessage").length;
    expect(sendMessageCountAfterSecond).toBe(sendMessageCountAfterFirst);

    const row = readQuestion(db, question.id);
    expect(row.delivery_status).toBe("failed");
    expect(row.delivery_status).not.toBe("pending");

    db.close();
  });

  // @trace FR-KB-04
  it("never touches an open (unanswered) question", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport();
    const { lead } = seedLeadAndRequest(db);

    const openQuestion = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Ще не відповіли на це питання",
      answerSource: "unanswered",
    });

    const result = await drainQuestionDeliveries(db, transport);

    expect(result).toEqual({ delivered: 0, failed: 0 });
    expect(transport.calls).toHaveLength(0);

    const row = readQuestion(db, openQuestion.id);
    expect(row.status).toBe("open");
    expect(row.delivery_status).toBe("pending");

    db.close();
  });
});
