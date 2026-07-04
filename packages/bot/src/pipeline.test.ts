// Test-first (red): `pipeline.ts`'s `handleUpdate`/`compileFirstLessonBrief`
// bodies are Not-implemented throwing stubs (tasks.md 5.4's red half) —
// every test below is expected to FAIL against the stub, for the right
// reason (the stub's throw propagating out of `await handleUpdate(...)`),
// until 5.4's green half implements the real pipeline. Same convention as
// `packages/agent/src/loop.test.ts`'s own red round: assertions are written
// against the SPECIFIED behaviour (`pipeline.ts`'s pinned header contract),
// not wrapped in a try/catch — a bare uncaught rejection IS "red for the
// right reason" here.
//
// Real in-memory SQLite (`openDatabase(":memory:")`, design.md Decision 5)
// + `FakeTelegramTransport` + `FakeModelPort` + S1's `FakeCalendarPort` —
// never a live Telegram chat, never a live Anthropic call, never the real
// DEMO calendar.
//
// tasks.md 5.4 lists exactly eleven behavioural bullets; every `it()` below
// is commented with which bullet(s) and `@trace` id(s) it covers, and all
// eleven are covered.

import { describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import {
  openDatabase,
  insertLead,
  findLeadByTelegramUserId,
  insertRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
  type LeadRow,
  type RequestRow,
  type RequestState,
  type UpdateRequestFieldsInput,
} from "@kamerton/db";
import {
  FakeModelPort,
  textResponse,
  toolUseResponse,
} from "@kamerton/agent/src/testing/fake-model-port.ts";
import type { ModelResponse } from "@kamerton/agent/src/model-port.ts";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import { AGE_REFUSAL_COPY, SCOPE_EXPLANATION_COPY } from "@kamerton/lib/src/intake/copy.ts";
import { ANTHROPIC_PROCESSING_NOTICE } from "./copy.ts";
import { TELEGRAM_SEND_FAILURE_APOLOGY } from "./apology.ts";
import { FakeTelegramTransport } from "./testing/fake-telegram-transport.ts";
import { compileFirstLessonBrief, handleUpdate, type HandleUpdateDeps } from "./pipeline.ts";
import type { InboundCallbackUpdate, InboundTextUpdate } from "./telegram-transport.ts";

// ---------------------------------------------------------------------------
// Test scaffolding — every scenario builds its own fresh `:memory:` DB, its
// own `FakeTelegramTransport`/`FakeModelPort`/`FakeCalendarPort`, so no test
// leaks state into another (mirrors S1/S2's per-test fresh-fixture
// convention throughout this codebase).
// ---------------------------------------------------------------------------

function makeDeps(overrides: Partial<HandleUpdateDeps> = {}): HandleUpdateDeps {
  return {
    transport: new FakeTelegramTransport(),
    db: openDatabase(":memory:"),
    model: new FakeModelPort(),
    calendar: new FakeCalendarPort(),
    ...overrides,
  };
}

function textUpdate(overrides: Partial<InboundTextUpdate> = {}): InboundTextUpdate {
  return {
    type: "text",
    telegramUserId: "tg-user-1",
    telegramChatId: "tg-chat-1",
    telegramDisplayName: "Тестова Лідка",
    text: "Привіт",
    ...overrides,
  };
}

function callbackUpdate(overrides: Partial<InboundCallbackUpdate> = {}): InboundCallbackUpdate {
  return {
    type: "callback",
    telegramUserId: "tg-user-1",
    telegramChatId: "tg-chat-1",
    telegramDisplayName: "Тестова Лідка",
    data: "slot:0",
    ...overrides,
  };
}

/** Seeds a brand-new lead + a fresh `greeting`-state request row, mirroring
 *  what `handleUpdate()`'s own step 2b is pinned to do for a truly new
 *  `telegram_user_id` — used by scenarios that need to start MID-flow
 *  without exercising the new-lead path itself (that path has its own
 *  dedicated scenario below). */
function seedNewLeadRequest(
  db: Database.Database,
  telegramUserId = "tg-user-1",
  telegramChatId = "tg-chat-1",
): { lead: LeadRow; request: RequestRow } {
  const lead = insertLead(db, {
    telegramUserId,
    telegramChatId,
    telegramDisplayName: "Тестова Лідка",
  });
  const request = insertRequest(db, { leadId: lead.id, telegramChatId });
  return { lead, request };
}

/** Advances an already-seeded request row directly to `state` with `fields`
 *  applied — test-only shortcut so a scenario can start mid-conversation
 *  without replaying every prior turn through `handleUpdate()` itself. */
function seedRequestAt(
  db: Database.Database,
  requestId: number,
  state: RequestState,
  fields: UpdateRequestFieldsInput,
): void {
  updateRequestFields(db, requestId, fields);
  updateRequestState(db, requestId, state);
}

/** Raw insert for a `pending` `bookings` row wired to `requestId` — no
 *  `@kamerton/db` helper exposes `request_id` yet (`insertBooking`'s
 *  `InsertBookingInput` predates S2's column, tasks.md 1.3's own comment);
 *  test-only, not a production code path. */
function seedPendingBooking(db: Database.Database, requestId: number, calendarEventId: string): number {
  const result = db
    .prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, 'pending', ?, ?)`,
    )
    .run("2026-07-10T10:00:00+03:00", "2026-07-10T11:00:00+03:00", calendarEventId, requestId);
  return Number(result.lastInsertRowid);
}

function getBookingById(db: Database.Database, id: number): { status: string; request_id: number | null } {
  return db.prepare(`SELECT status, request_id FROM bookings WHERE id = ?`).get(id) as {
    status: string;
    request_id: number | null;
  };
}

function allRequestsForLead(db: Database.Database, leadId: number): RequestRow[] {
  return db
    .prepare(`SELECT * FROM requests WHERE lead_id = ? ORDER BY id ASC`)
    .all(leadId) as RequestRow[];
}

const PRESSURE_VOCABULARY = ["останнє місце", "тільки сьогодні", "поспішайте"];

describe("handleUpdate (packages/bot/src/pipeline.ts, tasks.md 5.4)", () => {
  // --- bullet 1 (part 1): ack-before-reply ordering, text update ----------
  // @trace NFR-UX-01
  it("sendChatAction is always the first call recorded, strictly before sendMessage — text update", async () => {
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([textResponse("Привіт! Як звати дитину?")]);
    const deps = makeDeps({ transport, model });

    await handleUpdate(textUpdate(), deps);

    expect(transport.callKinds[0]).toBe("sendChatAction");
    const firstSendMessageIndex = transport.callKinds.indexOf("sendMessage");
    expect(firstSendMessageIndex).toBeGreaterThan(0);
  });

  // --- bullet 1 (part 2) + bullet 2: callback ordering + no model call ----
  // @trace NFR-UX-01
  // design.md Decision 3: "resolve without an agent call"
  it("sendChatAction is first for a button-callback update too, and it resolves without any ModelPort.send() call", async () => {
    const db = openDatabase(":memory:");
    seedNewLeadRequest(db);
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort();
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(callbackUpdate(), deps);

    expect(transport.callKinds[0]).toBe("sendChatAction");
    expect(model.callCount).toBe(0);
  });

  // --- bullet 3: new lead creates leads+requests rows, greeting notice ----
  // @trace NFR-PRIV-02
  // @trace FR-INTAKE-01
  it("first message from a new telegram_user_id creates a leads row and a requests row in greeting->qualifying, with the Anthropic-processing notice in the reply", async () => {
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]);
    const deps = makeDeps({ transport, model });

    await handleUpdate(textUpdate({ telegramUserId: "tg-new-1", text: "Мене звати Оксана" }), deps);

    const lead = findLeadByTelegramUserId(deps.db, "tg-new-1");
    expect(lead).toBeDefined();
    const request = findLatestRequestForLead(deps.db, lead!.id);
    expect(request).toBeDefined();
    expect(request!.state).toBe("qualifying");
    expect(request!.student_name).toBe("Оксана");

    const greetingReply = transport.sentTexts[transport.sentTexts.length - 1];
    expect(greetingReply).toContain(ANTHROPIC_PROCESSING_NOTICE);
  });

  // --- bullet 4: full happy-path transcript persists matching columns; ----
  // --- first-lesson brief compilable, skipped fields explicitly marked ----
  // @trace FR-INTAKE-01
  // @trace FR-INTAKE-02
  // @trace FR-INTAKE-03
  // @trace FR-INTAKE-04
  // @trace FR-INTAKE-05
  // @trace FR-INTAKE-06
  it("a full happy-path transcript (with goal/tastes explicitly skipped) persists matching requests columns and compiles into a first-lesson brief with skipped fields marked", async () => {
    const transport = new FakeTelegramTransport();
    const calendar = new FakeCalendarPort();
    const script: ModelResponse[] = [
      toolUseResponse("save_name", { name: "Оксана" }),
      toolUseResponse("save_age", { age: 9 }),
      toolUseResponse("save_format", { format: "individual" }),
      toolUseResponse("skip_goal", {}),
      toolUseResponse("skip_tastes", {}),
      toolUseResponse("save_experience_comfort", {
        experience: "ніколи не займалась",
        comfort: "трохи хвилюється",
      }),
      toolUseResponse("save_weekdays", { weekdays: "вівторок, четвер" }),
      toolUseResponse("save_time_range", { timeRange: "після 16:00" }),
    ];
    const model = new FakeModelPort(script);
    const deps = makeDeps({ transport, model, calendar });

    const messages = [
      "Мене звати Оксана",
      "Їй 9 років",
      "Індивідуальні, будь ласка",
      "Поки не думали про мету",
      "Смаки поки не скажу",
      "Ніколи не займалась, трохи хвилюється",
      "Вівторок і четвер",
      "Після 16:00",
    ];
    for (const text of messages) {
      await handleUpdate(textUpdate({ text }), deps);
    }

    const lead = findLeadByTelegramUserId(deps.db, "tg-user-1");
    const request = findLatestRequestForLead(deps.db, lead!.id)!;
    expect(request.state).toBe("proposing");
    expect(request.student_name).toBe("Оксана");
    expect(request.student_age).toBe(9);
    expect(request.format).toBe("individual");
    expect(request.goal_tag).toBeNull();
    expect(request.goal_text).toBeNull();
    expect(request.tastes).toBeNull();
    expect(request.experience).toBe("ніколи не займалась");
    expect(request.comfort).toBe("трохи хвилюється");
    expect(request.preferred_weekdays).toBe("вівторок, четвер");
    expect(request.preferred_time_range).toBe("після 16:00");

    const brief = compileFirstLessonBrief(request);
    expect(brief).toContain("Оксана");
    expect(brief).toContain("9");
    expect(brief.toLowerCase()).toMatch(/не назвав.*мет|пропущен/);
    expect(brief.toLowerCase()).toMatch(/не назвав.*смак|пропущен/);
  });

  // --- bullet 5: age-3 path ------------------------------------------------
  // @trace FR-GUARD-04
  it("age-3 path ends at soft_decline, creates no bookings row, and sends the Ukrainian refusal constant verbatim", async () => {
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([
      toolUseResponse("save_name", { name: "Малюк" }),
      toolUseResponse("save_age", { age: 3 }, { text: "Записую вік дитини." }),
    ]);
    const deps = makeDeps({ transport, model });

    await handleUpdate(textUpdate({ telegramUserId: "tg-age3", text: "Мене звати Малюк" }), deps);
    await handleUpdate(textUpdate({ telegramUserId: "tg-age3", text: "Йому 3 роки" }), deps);

    const lead = findLeadByTelegramUserId(deps.db, "tg-age3");
    const request = findLatestRequestForLead(deps.db, lead!.id)!;
    expect(request.state).toBe("soft_decline");

    const bookingsCount = deps.db.prepare(`SELECT COUNT(*) AS n FROM bookings`).get() as { n: number };
    expect(bookingsCount.n).toBe(0);

    expect(transport.sentTexts[transport.sentTexts.length - 1]).toBe(AGE_REFUSAL_COPY);
  });

  // --- bullet 6: piano-format detour + resume ------------------------------
  // @trace FR-INTAKE-02
  // BC-SCOPE-01, BC-SCOPE-02
  it("piano-format path fires explain-scope copy without moving conversationState, then resumes qualifying normally after a voice-trial follow-up", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db);
    seedRequestAt(db, seeded.id, "qualifying", { studentName: "Тарас", studentAge: 8 });

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([
      toolUseResponse("save_format", { format: "instrument" }),
      toolUseResponse("save_format", { format: "individual" }),
    ]);
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(textUpdate({ text: "А фортепіано викладаєте?" }), deps);

    const lead = findLeadByTelegramUserId(db, "tg-user-1");
    let request2 = findLatestRequestForLead(db, lead!.id)!;
    expect(request2.state).toBe("qualifying");
    expect(request2.format).toBeNull();
    expect(transport.sentTexts[transport.sentTexts.length - 1]).toBe(SCOPE_EXPLANATION_COPY);

    await handleUpdate(textUpdate({ text: "Ну добре, тоді пробне заняття з вокалу" }), deps);

    request2 = findLatestRequestForLead(db, lead!.id)!;
    expect(request2.state).toBe("profiling");
    expect(request2.format).toBe("individual");
  });

  // --- bullet 7: off-topic mid-profiling -----------------------------------
  // @trace FR-GUARD-05
  it("off-topic-mid-profiling path leaves the requests row unchanged across two off-topic turns, goal fields still null", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db);
    seedRequestAt(db, seeded.id, "profiling", {
      studentName: "Ірина",
      studentAge: 10,
      format: "group",
    });
    const before = findLatestRequestForLead(db, seeded.lead_id) ?? seeded;

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([
      textResponse("А що ви думаєте про останні новини?"),
      textResponse("То яка мета занять — карaoke, виступи чи для задоволення?"),
    ]);
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(textUpdate({ text: "Хто зараз президент?" }), deps);
    await handleUpdate(textUpdate({ text: "Ну добре, а мета занять яка була?" }), deps);

    const lead = findLeadByTelegramUserId(db, "tg-user-1");
    const after = findLatestRequestForLead(db, lead!.id)!;
    expect(after.state).toBe("profiling");
    expect(after.goal_tag).toBeNull();
    expect(after.goal_text).toBeNull();
    expect(after).toMatchObject({
      student_name: before.student_name,
      student_age: before.student_age,
      format: before.format,
    });
    expect(model.callCount).toBe(2);
  });

  // --- bullet 8: amend path -------------------------------------------------
  // @trace FR-INTAKE-07
  it("amend path corrects student_age 6 -> 7 mid-profiling on the real requests row and resumes the conversation", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db);
    seedRequestAt(db, seeded.id, "profiling", {
      studentName: "Марко",
      studentAge: 6,
      format: "individual",
    });

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([
      toolUseResponse("amend_field", { field: "studentAge", value: 7 }),
    ]);
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(textUpdate({ text: "Насправді йому 7, не 6" }), deps);

    const lead = findLeadByTelegramUserId(db, "tg-user-1");
    const after = findLatestRequestForLead(db, lead!.id)!;
    expect(after.student_age).toBe(7);
    expect(after.state).toBe("profiling");
  });

  // --- bullet 9: cancel path -------------------------------------------------
  // @trace FR-INTAKE-07
  it("cancel path moves a pending bookings row to cancelled, deletes its tentative calendar event, and replies kindly in Ukrainian", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db);
    seedRequestAt(db, seeded.id, "awaiting_admin", {
      studentName: "Соломія",
      studentAge: 11,
      format: "individual",
      preferredWeekdays: "понеділок",
      preferredTimeRange: "зранку",
    });

    const calendar = new FakeCalendarPort();
    const { eventId } = await calendar.createTentative(
      { start: "2026-07-13T07:00:00Z", end: "2026-07-13T08:00:00Z" },
      "Kamerton: Соломія (тримання)",
    );
    const bookingId = seedPendingBooking(db, seeded.id, eventId);

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([toolUseResponse("cancel_request", {})]);
    const deps = makeDeps({ transport, model, db, calendar });

    await handleUpdate(textUpdate({ text: "Скасуйте, будь ласка, заявку" }), deps);

    const booking = getBookingById(db, bookingId);
    expect(booking.status).toBe("cancelled");
    expect(calendar.getEvent(eventId)).toBeUndefined();

    const lead = findLeadByTelegramUserId(db, "tg-user-1");
    const after = findLatestRequestForLead(db, lead!.id)!;
    expect(after.state).toBe("done");

    const reply = transport.sentTexts[transport.sentTexts.length - 1]!;
    expect(reply).not.toContain("!");
    for (const phrase of PRESSURE_VOCABULARY) {
      expect(reply.toLowerCase()).not.toContain(phrase);
    }
    expect(reply.length).toBeGreaterThan(0);
  });

  // --- bullet 10: returning-lead / sibling path ------------------------------
  // @trace FR-INTAKE-08
  it("returning-lead path: a new message after a done request creates a NEW requests row starting at qualifying, the first row untouched", async () => {
    const db = openDatabase(":memory:");
    const { lead, request: first } = seedNewLeadRequest(db, "tg-returning", "tg-chat-returning");
    seedRequestAt(db, first.id, "done", { studentName: "Оксана", studentAge: 9, format: "individual" });
    const firstSnapshot = findLatestRequestForLead(db, lead.id)!;

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([toolUseResponse("save_name", { name: "Дмитрик" })]);
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(
      textUpdate({ telegramUserId: "tg-returning", telegramChatId: "tg-chat-returning", text: "Хочу записати ще одну дитину, Дмитрика" }),
      deps,
    );

    const rows = allRequestsForLead(db, lead.id);
    expect(rows).toHaveLength(2);
    const firstAfter = rows.find((row) => row.id === first.id)!;
    expect(firstAfter).toEqual(firstSnapshot);

    const secondRow = rows.find((row) => row.id !== first.id)!;
    expect(secondRow.state).toBe("qualifying");
    expect(secondRow.student_name).toBe("Дмитрик");
  });

  // --- bullet 10 (sibling variant): differing profile values -----------------
  // @trace FR-INTAKE-08
  it("sibling variant: the new request row's student_name/student_age differ from the first row's", async () => {
    const db = openDatabase(":memory:");
    const { lead, request: first } = seedNewLeadRequest(db, "tg-sibling", "tg-chat-sibling");
    seedRequestAt(db, first.id, "done", { studentName: "Оксана", studentAge: 9, format: "individual" });

    const multiToolResponse: ModelResponse = {
      content: [
        { type: "tool_use", id: "call-1", name: "save_name", input: { name: "Богдан" } },
        { type: "tool_use", id: "call-2", name: "save_age", input: { age: 5 } },
      ],
    };
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([multiToolResponse]);
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(
      textUpdate({
        telegramUserId: "tg-sibling",
        telegramChatId: "tg-chat-sibling",
        text: "Ще й для сина Богдана, йому 5",
      }),
      deps,
    );

    const rows = allRequestsForLead(db, lead.id);
    const secondRow = rows.find((row) => row.id !== first.id)!;
    expect(secondRow.student_name).not.toBe("Оксана");
    expect(secondRow.student_age).not.toBe(9);
    expect(secondRow.student_name).toBe("Богдан");
    expect(secondRow.student_age).toBe(5);
  });

  // --- bullet 11: Telegram-send-failure path ---------------------------------
  // @trace NFR-REL-01
  it("Telegram-send-failure path retries with the deterministic apology and never loses the inbound message", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport({ sendMessageFailures: 1 });
    const model = new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]);
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(textUpdate({ telegramUserId: "tg-flaky", text: "Мене звати Оксана" }), deps);

    expect(transport.sentTexts.length).toBeGreaterThanOrEqual(2);
    expect(transport.sentTexts[transport.sentTexts.length - 1]).toBe(TELEGRAM_SEND_FAILURE_APOLOGY);

    const lead = findLeadByTelegramUserId(db, "tg-flaky");
    expect(lead).toBeDefined();
    const request = findLatestRequestForLead(db, lead!.id)!;
    expect(request.student_name).toBe("Оксана");
  });
});

describe("compileFirstLessonBrief (packages/bot/src/pipeline.ts, tasks.md 5.4)", () => {
  // @trace FR-INTAKE-01
  // @trace FR-INTAKE-02
  // @trace FR-INTAKE-03
  it("compiles a brief from a fully-answered request row", () => {
    const db = openDatabase(":memory:");
    const { request } = seedNewLeadRequest(db);
    seedRequestAt(db, request.id, "proposing", {
      studentName: "Оксана",
      studentAge: 9,
      format: "individual",
      goalTag: "hobby",
      goalText: "для задоволення",
      tastes: "поп, джаз",
      dreamSong: "Червона рута",
      experience: "ніколи не займалась",
      comfort: "трохи хвилюється",
      preferredWeekdays: "вівторок, четвер",
      preferredTimeRange: "після 16:00",
    });
    const row = findLatestRequestForLead(db, request.lead_id)!;

    const brief = compileFirstLessonBrief(row);

    expect(brief).toContain("Оксана");
    expect(brief).toContain("9");
    expect(brief).toContain("Червона рута");
    expect(brief).not.toContain("null");
  });

  // @trace FR-INTAKE-03
  it("explicitly marks a skipped goal/tastes, never silently omitting them", () => {
    const db = openDatabase(":memory:");
    const { request } = seedNewLeadRequest(db);
    seedRequestAt(db, request.id, "proposing", {
      studentName: "Тарас",
      studentAge: 8,
      format: "group",
      experience: "трохи співав у школі",
      comfort: "комфортно",
      preferredWeekdays: "субота",
      preferredTimeRange: "вранці",
    });
    const row = findLatestRequestForLead(db, request.lead_id)!;

    const brief = compileFirstLessonBrief(row);

    expect(brief.toLowerCase()).toMatch(/не назвав.*мет|пропущен/);
    expect(brief.toLowerCase()).toMatch(/не назвав.*смак|пропущен/);
  });
});
