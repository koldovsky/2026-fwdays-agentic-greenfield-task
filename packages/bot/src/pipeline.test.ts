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
import { ANTHROPIC_UNAVAILABLE_APOLOGY } from "@kamerton/agent/src/apology.ts";
import { FakeTelegramTransport } from "./testing/fake-telegram-transport.ts";
import { compileFirstLessonBrief, handleUpdate, type HandleUpdateDeps } from "./pipeline.ts";
import type { InboundCallbackUpdate, InboundTextUpdate } from "./telegram-transport.ts";
import { noopAguiPublisher, type AguiEvent } from "./agui-publisher.ts";
import { FakeAguiPublisher } from "./testing/fake-agui-publisher.ts";

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

  // --- review-gate finding #3: callback goalTag allow-list -----------------
  // @trace FR-GUARD-04-analog
  // @trace FR-INTAKE-05
  // Regression coverage: `parseCallbackEvent`'s "goal:<tag>" mapping used to
  // cast the raw wire payload straight to `GoalTag` with NO allow-list
  // check — a button callback (never validated by the model's tool-schema
  // enum, since it never reaches `ModelPort.send()` at all, design.md
  // Decision 3) could write an arbitrary string into `requests.goal_tag`.
  // The fix validates against the exact `REQUEST_GOAL_TAGS` allow-list
  // before building the event, ignoring (returning `null` for) anything
  // outside it — the same defensive shape the text path's validators use.
  it("a callback with a bogus goalTag payload is ignored — no requests row mutation, no crash", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded, lead } = seedNewLeadRequest(db);
    seedRequestAt(db, seeded.id, "profiling", {
      studentName: "Іван",
      studentAge: 8,
      format: "individual",
    });
    const before = findLatestRequestForLead(db, lead.id)!;

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort();
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(callbackUpdate({ data: "goal:instrument_lessons" }), deps);

    const after = findLatestRequestForLead(db, lead.id)!;
    expect(after).toEqual(before);
    expect(model.callCount).toBe(0);
    expect(transport.sentTexts[transport.sentTexts.length - 1]!.length).toBeGreaterThan(0);
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

  // --- Live-Telegram bug B sibling (docs/qa/intake-manual-smoke.md scenario
  // --- 3): the model calls the DEDICATED `explain_scope` tool (not
  // --- `save_format({format:"instrument"})`) for a scope question -- the
  // --- lead must still get SCOPE_EXPLANATION_COPY, never the generic
  // --- "Дякую, я це записала." fallback, and conversationState must not move.
  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  // @trace FR-INTAKE-02
  it("explain_scope tool-use path fires SCOPE_EXPLANATION_COPY (not the generic fallback) without moving conversationState", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db);
    seedRequestAt(db, seeded.id, "qualifying", { studentName: "Тарас", studentAge: 8 });

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([toolUseResponse("explain_scope", {})]);
    const deps = makeDeps({ transport, model, db });

    await handleUpdate(textUpdate({ text: "А фортепіано викладаєте?" }), deps);

    const lead = findLeadByTelegramUserId(db, "tg-user-1");
    const request2 = findLatestRequestForLead(db, lead!.id)!;
    expect(request2.state).toBe("qualifying");
    expect(request2.format).toBeNull();
    expect(transport.sentTexts[transport.sentTexts.length - 1]).toBe(SCOPE_EXPLANATION_COPY);
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

  // --- review-gate finding #4 (CRITICAL/MAJOR): booking-release throw -----
  // --- must not crash handleUpdate ------------------------------------------
  // Regression coverage: a Calendar failure (`deleteEvent` rejecting) during
  // the cancel path's booking-release orchestration used to propagate as an
  // uncaught rejection straight out of `handleUpdate()` — nothing in
  // `packages/bot` caught it, so ONE lead's Calendar outage crashed the
  // whole bot process for every other lead too. The fix (in `@kamerton/
  // agent/src/loop.ts`'s `runIntakeTurn`) catches it and falls back to the
  // deterministic `CALENDAR_UNAVAILABLE_APOLOGY` reply instead — this test
  // proves that at the `handleUpdate()` boundary this slice owns: it resolves
  // (never throws/rejects), sends a non-empty Ukrainian apology, and the
  // conversation's already-committed state is not corrupted.
  // @trace NFR-REL-01
  // @trace BC-LANG-01
  it("bookingStore/releaseHold throwing during cancel does NOT throw out of handleUpdate; a Ukrainian apology is sent and state is preserved", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db);
    seedRequestAt(db, seeded.id, "awaiting_admin", {
      studentName: "Ольга",
      studentAge: 10,
      format: "individual",
      preferredWeekdays: "середа",
      preferredTimeRange: "ввечері",
    });

    class ThrowingCalendarPort extends FakeCalendarPort {
      override async deleteEvent(): Promise<void> {
        throw new Error("Calendar unavailable (simulated)");
      }
    }
    const calendar = new ThrowingCalendarPort();
    const { eventId } = await calendar.createTentative(
      { start: "2026-07-15T10:00:00Z", end: "2026-07-15T11:00:00Z" },
      "Kamerton: Ольга (тримання)",
    );
    const bookingId = seedPendingBooking(db, seeded.id, eventId);

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([toolUseResponse("cancel_request", {})]);
    const deps = makeDeps({ transport, model, db, calendar });

    // The point of this assertion: reaching the line after it at all proves
    // handleUpdate() did not throw/reject — a bare `await` here is
    // deliberate, mirroring this file's own red-round convention (a thrown
    // rejection fails the test with an uncaught error, which IS the
    // regression this test guards against).
    await handleUpdate(textUpdate({ text: "Скасуйте, будь ласка" }), deps);

    // The booking release never completed — the row stays `pending`, never
    // silently marked `cancelled` while the calendar event itself still
    // exists (that would be a worse, silently-inconsistent outcome).
    const booking = getBookingById(db, bookingId);
    expect(booking.status).toBe("pending");

    const lead = findLeadByTelegramUserId(db, "tg-user-1");
    const after = findLatestRequestForLead(db, lead!.id)!;
    // The conversation-state move to "done" (transition()'s own,
    // synchronous half of cancel_request) already committed BEFORE the
    // Calendar call was even attempted — that write is not rolled back by
    // this catch, and is not itself corrupted/left partial.
    expect(after.state).toBe("done");

    const reply = transport.sentTexts[transport.sentTexts.length - 1]!;
    expect(reply.length).toBeGreaterThan(0);
    expect(reply).toMatch(/[а-яіїєґ]/i); // Ukrainian, not a raw error/stack trace
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

// ---------------------------------------------------------------------------
// dashboard tasks.md §4.3 — the AG-UI publisher seam on `handleUpdate()`.
// RED ROUND: `HandleUpdateDeps.publisher` exists (type + default only, see
// pipeline.ts's `handleUpdate` header) but nothing in `pipeline.ts` calls
// `deps.publisher.publish(...)` yet. Every event-sequence test below is
// therefore EXPECTED TO FAIL — a `FakeAguiPublisher` records zero events for
// a turn that (once §4.3's GREEN half wires the calls in) should record a
// full run-boundary sequence. The one test that MUST already pass is the
// regression guard, proving the type/default change alone does not disturb
// S2's committed transport-call behaviour.
// ---------------------------------------------------------------------------
describe("handleUpdate — AG-UI publisher seam (dashboard tasks.md 4.3)", () => {
  // --- REGRESSION GUARD — the single most important test in this section --
  // @trace TC-PROTO-01
  it("REGRESSION GUARD: transport calls are identical whether `publisher` is omitted or explicitly `noopAguiPublisher`", async () => {
    const transportOmitted = new FakeTelegramTransport();
    const depsOmitted = makeDeps({
      transport: transportOmitted,
      model: new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]),
    });
    await handleUpdate(
      textUpdate({ telegramUserId: "tg-regression-omitted", telegramChatId: "tg-chat-regression-omitted" }),
      depsOmitted,
    );

    const transportExplicitNoop = new FakeTelegramTransport();
    const depsExplicitNoop = makeDeps({
      transport: transportExplicitNoop,
      model: new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]),
      publisher: noopAguiPublisher,
    });
    await handleUpdate(
      textUpdate({ telegramUserId: "tg-regression-explicit", telegramChatId: "tg-chat-regression-explicit" }),
      depsExplicitNoop,
    );

    // Byte-for-byte identical outbound behaviour — same call kinds in the
    // same order, same sent texts — proves the §4.3 type/default change is
    // observationally a no-op for every S2 caller (`publisher` omitted) and
    // for an explicit `noopAguiPublisher` alike.
    expect(transportExplicitNoop.callKinds).toEqual(transportOmitted.callKinds);
    expect(transportExplicitNoop.sentTexts).toEqual(transportOmitted.sentTexts);
  });

  /** Narrows a `FakeAguiPublisher.events` array element to one variant, for
   *  assertions that need a variant-specific field (e.g. `.delta`,
   *  `.message`) — a small local helper so every test below stays readable
   *  instead of repeating an inline type-guard. */
  function eventsOfType<T extends AguiEvent["type"]>(
    events: AguiEvent[],
    type: T,
  ): Extract<AguiEvent, { type: T }>[] {
    return events.filter((event): event is Extract<AguiEvent, { type: T }> => event.type === type);
  }

  // --- free-text turn, brand-new request -> STATE_SNAPSHOT (RED) ----------
  // @trace FR-DASH-01
  it("RED: a free-text turn for a brand-new lead/request publishes RUN_STARTED -> TEXT_MESSAGE_START -> TEXT_MESSAGE_CONTENT(s) -> TEXT_MESSAGE_END -> STATE_SNAPSHOT -> RUN_FINISHED", async () => {
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]);
    const publisher = new FakeAguiPublisher();
    const deps = makeDeps({ transport, model, publisher });

    await handleUpdate(
      textUpdate({ telegramUserId: "tg-events-snapshot", telegramChatId: "tg-chat-events-snapshot", text: "Мене звати Оксана" }),
      deps,
    );

    // The reply ACTUALLY sent to the lead (design.md Decision 1's honesty
    // note: the already-assembled final string, including the brand-new-lead
    // Anthropic-processing notice prepended by pipeline.ts step 5/6 — the
    // dashboard must show exactly what the lead saw, not a pre-notice draft).
    const finalReply = transport.sentTexts[transport.sentTexts.length - 1]!;

    expect(publisher.events.length).toBeGreaterThan(0); // <- fails red: 0 events published today
    expect(publisher.events[0]!.type).toBe("RUN_STARTED");
    expect(publisher.events[1]!.type).toBe("TEXT_MESSAGE_START");

    const contentEvents = eventsOfType(publisher.events, "TEXT_MESSAGE_CONTENT");
    expect(contentEvents.length).toBeGreaterThanOrEqual(1);
    expect(contentEvents.map((event) => event.delta).join("")).toBe(finalReply);

    const startEvent = publisher.events[1] as Extract<AguiEvent, { type: "TEXT_MESSAGE_START" }>;
    const messageIds = new Set([startEvent.messageId, ...contentEvents.map((event) => event.messageId)]);
    expect(messageIds.size).toBe(1); // one messageId per turn, shared by START/CONTENT

    const endIndex = publisher.events.findIndex((event) => event.type === "TEXT_MESSAGE_END");
    expect(endIndex).toBeGreaterThan(0);
    expect((publisher.events[endIndex] as Extract<AguiEvent, { type: "TEXT_MESSAGE_END" }>).messageId).toBe(
      startEvent.messageId,
    );

    const snapshotEvent = publisher.events.find((event) => event.type === "STATE_SNAPSHOT") as
      | Extract<AguiEvent, { type: "STATE_SNAPSHOT" }>
      | undefined;
    expect(snapshotEvent).toBeDefined();
    expect(snapshotEvent!.snapshot).toMatchObject({ studentName: "Оксана" });

    expect(publisher.events[publisher.events.length - 1]!.type).toBe("RUN_FINISHED");

    const runStarted = publisher.events[0] as Extract<AguiEvent, { type: "RUN_STARTED" }>;
    const runFinished = publisher.events[publisher.events.length - 1] as Extract<
      AguiEvent,
      { type: "RUN_FINISHED" }
    >;
    expect(runFinished.runId).toBe(runStarted.runId);
    expect(runStarted.runId.length).toBeGreaterThan(0);
    expect(runStarted.threadId).toBe("tg-chat-events-snapshot");
    expect(runFinished.threadId).toBe("tg-chat-events-snapshot");
  });

  // --- free-text turn, resuming an existing request -> STATE_DELTA (RED) --
  // @trace FR-DASH-01
  it("RED: a free-text turn resuming an already-existing request publishes a STATE_DELTA (not a STATE_SNAPSHOT) reflecting the fields runIntakeTurn just persisted", async () => {
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([
      toolUseResponse("save_name", { name: "Дмитро" }),
      toolUseResponse("save_age", { age: 9 }),
    ]);
    const setupDeps = makeDeps({ transport, model, publisher: new FakeAguiPublisher() });

    // Turn 1 (brand-new lead/request) — its own event sequence is covered by
    // the dedicated STATE_SNAPSHOT test above; only used here to reach a
    // resumed, non-terminal request row for turn 2.
    await handleUpdate(
      textUpdate({ telegramUserId: "tg-events-delta", telegramChatId: "tg-chat-events-delta", text: "Мене звати Дмитро" }),
      setupDeps,
    );

    const publisher = new FakeAguiPublisher();
    const deps: HandleUpdateDeps = { ...setupDeps, publisher };

    // Turn 2 (same lead, resuming the same non-terminal request row).
    await handleUpdate(
      textUpdate({ telegramUserId: "tg-events-delta", telegramChatId: "tg-chat-events-delta", text: "Йому 9 років" }),
      deps,
    );

    expect(publisher.events.length).toBeGreaterThan(0); // <- fails red: 0 events published today
    expect(publisher.events[0]!.type).toBe("RUN_STARTED");

    const snapshotEvents = eventsOfType(publisher.events, "STATE_SNAPSHOT");
    expect(snapshotEvents).toHaveLength(0); // turn 2 is NOT the brand-new-request turn

    const deltaEvent = publisher.events.find((event) => event.type === "STATE_DELTA") as
      | Extract<AguiEvent, { type: "STATE_DELTA" }>
      | undefined;
    expect(deltaEvent).toBeDefined();
    expect(deltaEvent!.delta).toContainEqual(expect.objectContaining({ path: "/studentAge", value: 9 }));
    expect(deltaEvent!.threadId).toBe("tg-chat-events-delta");

    expect(publisher.events[publisher.events.length - 1]!.type).toBe("RUN_FINISHED");
  });

  // --- button-callback turn -> event sequence (RED) ------------------------
  // CORRECTION to dashboard tasks.md §4.3's own callback bullet (recorded
  // here per this task's explicit instruction, so the reviewer sees the
  // reasoning): tasks.md's text says a callback turn publishes "the same
  // run-boundary + state-update events" but NO `TEXT_MESSAGE_*` at all. That
  // is wrong for THIS pipeline: the callback branch (pipeline.ts's
  // `update.type === "callback"` arm, ~341-348) DOES compute a real
  // `replyText` and DOES send it to the lead via `sendWithRetry` (~396) —
  // the dashboard's ChatStream must be able to render that reply too, or a
  // teacher watching the dashboard would see the lead's own chat update with
  // no visible cause. So this test asserts a callback turn IS wrapped in
  // TEXT_MESSAGE_START/CONTENT/END, symmetric with the free-text path. The
  // distinction tasks.md's bullet actually meant to draw is narrower, and IS
  // asserted below: a callback never calls `ModelPort.send()` — there is
  // simply no model call for any TEXT_MESSAGE_* content to be "about".
  // @trace FR-DASH-01
  it("RED: a button-callback turn publishes RUN_STARTED -> TEXT_MESSAGE_* (wrapping its own deterministic replyText) -> STATE_DELTA -> RUN_FINISHED, with zero ModelPort.send() calls", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db, "tg-callback-events", "tg-chat-callback-events");
    seedRequestAt(db, seeded.id, "qualifying", { studentName: "Тарас", studentAge: 8 });

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort();
    const publisher = new FakeAguiPublisher();
    const deps = makeDeps({ transport, model, db, publisher });

    await handleUpdate(
      callbackUpdate({
        telegramUserId: "tg-callback-events",
        telegramChatId: "tg-chat-callback-events",
        data: "format:individual",
      }),
      deps,
    );

    expect(model.callCount).toBe(0);

    const finalReply = transport.sentTexts[transport.sentTexts.length - 1]!;
    expect(publisher.events.length).toBeGreaterThan(0); // <- fails red: 0 events published today
    expect(publisher.events[0]!.type).toBe("RUN_STARTED");
    expect(publisher.events[1]!.type).toBe("TEXT_MESSAGE_START");

    const contentEvents = eventsOfType(publisher.events, "TEXT_MESSAGE_CONTENT");
    expect(contentEvents.length).toBeGreaterThanOrEqual(1);
    expect(contentEvents.map((event) => event.delta).join("")).toBe(finalReply);

    const endEvent = publisher.events.find((event) => event.type === "TEXT_MESSAGE_END");
    expect(endEvent).toBeDefined();

    const deltaEvent = publisher.events.find((event) => event.type === "STATE_DELTA") as
      | Extract<AguiEvent, { type: "STATE_DELTA" }>
      | undefined;
    expect(deltaEvent).toBeDefined();
    expect(deltaEvent!.delta).toContainEqual(expect.objectContaining({ path: "/format", value: "individual" }));

    expect(publisher.events[publisher.events.length - 1]!.type).toBe("RUN_FINISHED");
  });

  // --- ModelPort.send() rejection -> RUN_ERROR (RED) -----------------------
  // The apology is still sent to the lead exactly as today (NFR-REL-01,
  // unchanged); this stage's contract does NOT stream the apology text via
  // TEXT_MESSAGE_* — RUN_ERROR is the dashboard's own signal that the run
  // failed, so the run boundary always closes, never leaving a silent gap.
  // @trace NFR-REL-01
  it("RED: a ModelPort.send() rejection publishes RUN_STARTED -> RUN_ERROR -> RUN_FINISHED only (no TEXT_MESSAGE_*), while the lead still receives the deterministic apology", async () => {
    const db = openDatabase(":memory:");
    const { request: seeded } = seedNewLeadRequest(db, "tg-model-error", "tg-chat-model-error");
    seedRequestAt(db, seeded.id, "qualifying", { studentName: "Іван" });

    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([{ reject: new Error("Anthropic unavailable (simulated)") }]);
    const publisher = new FakeAguiPublisher();
    const deps = makeDeps({ transport, model, db, publisher });

    await handleUpdate(
      textUpdate({ telegramUserId: "tg-model-error", telegramChatId: "tg-chat-model-error", text: "Ще одне повідомлення" }),
      deps,
    );

    // The existing NFR-REL-01 behaviour is unaffected by this seam.
    expect(transport.sentTexts[transport.sentTexts.length - 1]).toBe(ANTHROPIC_UNAVAILABLE_APOLOGY);

    expect(publisher.eventTypes).toEqual(["RUN_STARTED", "RUN_ERROR", "RUN_FINISHED"]); // <- fails red: [] today

    const runStarted = publisher.events[0] as Extract<AguiEvent, { type: "RUN_STARTED" }>;
    const runError = publisher.events[1] as Extract<AguiEvent, { type: "RUN_ERROR" }>;
    const runFinished = publisher.events[2] as Extract<AguiEvent, { type: "RUN_FINISHED" }>;
    expect(runStarted.threadId).toBe("tg-chat-model-error");
    expect(runError.threadId).toBe("tg-chat-model-error");
    expect(runFinished.threadId).toBe("tg-chat-model-error");
    expect(runError.message.length).toBeGreaterThan(0);
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
