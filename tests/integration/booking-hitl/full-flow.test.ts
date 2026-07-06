// tests/integration/booking-hitl/full-flow.test.ts — booking-hitl tasks.md
// §G.1: three end-to-end round trips through the ALREADY-GREEN composed
// implementation of stages A-F. Unlike every RED-first unit stage in this
// slice, this file is GREEN-only from the start — stages A-F are already
// fully implemented (tasks.md's own checklist is all checked through F.5)
// — this is the cross-cutting proof that the composed pieces cohere, not a
// spec pinned against a throwing stub.
//
// REAL code paths driven directly, never re-implementations of them:
//   - the bot pipeline's `handleUpdate` (@kamerton/bot/src/pipeline.ts) for
//     the lead side: a free-text turn that drives the model to call
//     `propose_slots` (persisting `requests.offered_slots`), and
//     `"slot:<n>"` callback taps (`performHoldSlot`, a real `bookings` row
//     with `status:'pending'`).
//   - the dashboard decision route's exported `POST`
//     (apps/dashboard/app/api/decisions/[requestId]/route.ts) for the admin
//     side, invoked directly with a constructed `Request` + a resolved
//     `params` Promise — exactly how Next.js itself calls a route handler.
//   - `@kamerton/bot/src/notification-drain.ts`'s `drainNotifications` for
//     the outbox side.
//
// SHARED STATE, GENUINELY: the bot pipeline's `deps.db` and the decision
// route's own `openDatabase(resolveDbPath())` connection point at the SAME
// on-disk SQLite file (`KAMERTON_DB_PATH`, WAL mode — `@kamerton/db`'s
// `openDatabase` always sets `journal_mode = WAL`, so two connections to one
// file coexist safely, the same pattern
// `apps/dashboard/app/api/decisions/[requestId]/route.test.ts` already
// relies on for its own seeding connection vs. the route's connection). The
// bot pipeline's `deps.calendar` and the route's `resolveCalendarPort()` are
// the SAME `FakeCalendarPort` INSTANCE (`setCalendarPortForTesting`) — a
// tentative event the lead-side hold creates is the exact object the
// admin-side route upgrades/deletes, not a lookalike double. This is what
// makes the flow an "integration" test rather than two unit tests glued by
// assertion only.
//
// @trace FR-HITL-01
// @trace FR-HITL-02
// @trace FR-HITL-03
// @trace FR-HITL-04

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import {
  openDatabase,
  insertLead,
  insertRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
  parseOfferedSlots,
  type RequestRow,
  type UpdateRequestFieldsInput,
} from "@kamerton/db";
import { FakeModelPort, toolUseResponse } from "@kamerton/agent/src/testing/fake-model-port.ts";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import type { OfferedSlot } from "@kamerton/lib/src/intake/state-machine.ts";
import { composeConfirmationMessage, DECLINE_COPY } from "@kamerton/lib/src/booking/copy.ts";
import { handleUpdate, type HandleUpdateDeps } from "@kamerton/bot/src/pipeline.ts";
import { FakeTelegramTransport } from "@kamerton/bot/src/testing/fake-telegram-transport.ts";
import type { InboundCallbackUpdate, InboundTextUpdate } from "@kamerton/bot/src/telegram-transport.ts";
import { drainNotifications } from "@kamerton/bot/src/notification-drain.ts";
import { setCalendarPortForTesting } from "../../../apps/dashboard/lib/calendar-port.ts";
import { POST as postDecisionRoute } from "../../../apps/dashboard/app/api/decisions/[requestId]/route.ts";

// ---------------------------------------------------------------------------
// Scaffolding (mirrors packages/bot/src/pipeline.test.ts's own helpers and
// apps/dashboard/app/api/decisions/[requestId]/route.test.ts's own harness —
// nothing reinvented, just glued together for a shared-state round trip).
// ---------------------------------------------------------------------------

function textUpdate(overrides: Partial<InboundTextUpdate> = {}): InboundTextUpdate {
  return {
    type: "text",
    telegramUserId: "tg-user-g1",
    telegramChatId: "tg-chat-g1",
    telegramDisplayName: "Тестова Лідка",
    text: "Привіт",
    ...overrides,
  };
}

function callbackUpdate(overrides: Partial<InboundCallbackUpdate> = {}): InboundCallbackUpdate {
  return {
    type: "callback",
    telegramUserId: "tg-user-g1",
    telegramChatId: "tg-chat-g1",
    telegramDisplayName: "Тестова Лідка",
    data: "noop:default",
    ...overrides,
  };
}

/** Seeds a lead + a `proposing`-state request with a fully-collected
 *  profile, mirroring what a real intake conversation would have left
 *  behind by the time it reaches `proposing` — the same shortcut
 *  `pipeline.test.ts`'s own `seedProposingRequest` uses, so this test
 *  starts where the intake capability's own (already-covered) tests leave
 *  off rather than re-driving the whole S2 conversation here. */
function seedProposingLead(
  db: Database.Database,
  telegramUserId: string,
  telegramChatId: string,
  overrides: Partial<UpdateRequestFieldsInput> = {},
): { leadId: number; requestId: number } {
  const lead = insertLead(db, {
    telegramUserId,
    telegramChatId,
    telegramDisplayName: "Тестова Лідка",
  });
  const request = insertRequest(db, { leadId: lead.id, telegramChatId });
  updateRequestFields(db, request.id, {
    studentName: "Соломія",
    studentAge: 11,
    format: "individual",
    preferredWeekdays: "будь-який день",
    preferredTimeRange: "вдень",
    ...overrides,
  });
  updateRequestState(db, request.id, "proposing");
  return { leadId: lead.id, requestId: request.id };
}

function currentRequestRow(db: Database.Database, leadId: number): RequestRow {
  const row = findLatestRequestForLead(db, leadId);
  if (row === undefined) {
    throw new Error("full-flow.test.ts: expected a requests row to exist for this lead");
  }
  return row;
}

interface NotificationRowForTest {
  id: number;
  booking_id: number;
  telegram_chat_id: string;
  kind: string;
  payload: string;
  delivery_status: string;
}

function readNotifications(db: Database.Database, bookingId: number): NotificationRowForTest[] {
  return db
    .prepare(`SELECT * FROM notifications WHERE booking_id = ? ORDER BY id ASC`)
    .all(bookingId) as NotificationRowForTest[];
}

function readBooking(db: Database.Database, bookingId: number): { status: string; calendar_event_id: string | null } {
  return db
    .prepare(`SELECT status, calendar_event_id FROM bookings WHERE id = ?`)
    .get(bookingId) as { status: string; calendar_event_id: string | null };
}

function decisionUrl(requestId: number): string {
  return `http://127.0.0.1:3000/api/decisions/${requestId}`;
}

function postDecision(requestId: number, body: unknown): Promise<Response> {
  return postDecisionRoute(
    new Request(decisionUrl(requestId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ requestId: String(requestId) }) },
  );
}

describe("booking-hitl full flow (tasks.md G.1): bot pipeline + decision route + outbox, real SQLite + FakeCalendarPort", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;
  let db: Database.Database;
  let calendar: FakeCalendarPort;
  let transport: FakeTelegramTransport;

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-itest-booking-hitl-"));
    dbPath = path.join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    // The decision route resolves its own `better-sqlite3` connection from
    // this env var (`apps/dashboard/lib/dashboard-db.ts`'s `resolveDbPath`)
    // — pointing it at the SAME file the bot pipeline's `db` below opens is
    // what makes this a genuine shared-state integration, not two isolated
    // unit suites.
    process.env.KAMERTON_DB_PATH = dbPath;

    db = openDatabase(dbPath);
    calendar = new FakeCalendarPort();
    setCalendarPortForTesting(calendar);
    transport = new FakeTelegramTransport();
  });

  afterEach(() => {
    db.close();
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    setCalendarPortForTesting(undefined);
    rmSync(dbDir, { recursive: true, force: true });
  });

  function deps(model: FakeModelPort): HandleUpdateDeps {
    return { transport, db, model, calendar };
  }

  /** Drives a lead's free-text turn through a `propose_slots` tool call and
   *  returns the resulting `offered_slots` (parsed) actually persisted —
   *  read back rather than hand-computed, so this test exercises the REAL
   *  ranking algorithm (`widenAndRank`) instead of guessing its output. */
  async function driveProposeSlots(
    telegramUserId: string,
    telegramChatId: string,
    leadId: number,
    weekdays: string[],
    timeWindow: { start: string; end: string },
  ): Promise<OfferedSlot[]> {
    const model = new FakeModelPort([toolUseResponse("propose_slots", { weekdays, timeWindow })]);
    await handleUpdate(
      textUpdate({
        telegramUserId,
        telegramChatId,
        text: "Коли є вільний час?",
      }),
      deps(model),
    );
    const after = currentRequestRow(db, leadId);
    const offered = parseOfferedSlots(after.offered_slots);
    expect(offered).not.toBeNull();
    expect(offered!.length).toBeGreaterThan(0);
    return offered!;
  }

  /** Taps `slot:<index>` for the given chat, asserting the pending
   *  `bookings` row `performHoldSlot` is pinned to create, and returns its
   *  id + calendar event id for later assertions. */
  async function tapSlotAndExpectPending(
    telegramUserId: string,
    telegramChatId: string,
    requestId: number,
    index: number,
  ): Promise<{ bookingId: number; eventId: string }> {
    const model = new FakeModelPort();
    await handleUpdate(callbackUpdate({ telegramUserId, telegramChatId, data: `slot:${index}` }), deps(model));
    expect(model.callCount).toBe(0); // design.md Decision 3: never reaches ModelPort.send()

    const bookingRows = db
      .prepare(`SELECT id, status, request_id, calendar_event_id FROM bookings WHERE request_id = ? ORDER BY id DESC`)
      .all(requestId) as Array<{ id: number; status: string; request_id: number; calendar_event_id: string | null }>;
    const pending = bookingRows.find((row) => row.status === "pending");
    expect(pending).toBeDefined();
    expect(pending!.calendar_event_id).not.toBeNull();

    const requestRow = db.prepare(`SELECT state FROM requests WHERE id = ?`).get(requestId) as { state: string };
    expect(requestRow.state).toBe("awaiting_admin");

    return { bookingId: pending!.id, eventId: pending!.calendar_event_id! };
  }

  // -------------------------------------------------------------------
  // Round trip 1: propose -> hold -> confirm
  // -------------------------------------------------------------------
  it("round trip 1: propose -> hold -> confirm — real bookings/requests/notifications rows at every step", async () => {
    const telegramUserId = "tg-user-g1-confirm";
    const telegramChatId = "tg-chat-g1-confirm";
    const { leadId, requestId } = seedProposingLead(db, telegramUserId, telegramChatId);

    // Step 1: propose_slots (free text -> model tool call -> real
    // proposeSlots() against the FakeCalendarPort) persists offered_slots.
    const offered = await driveProposeSlots(telegramUserId, telegramChatId, leadId, ["Wed"], {
      start: "10:00",
      end: "12:00",
    });
    const lastSend = transport.calls
      .filter((call): call is Extract<(typeof transport.calls)[number], { kind: "sendMessage" }> => call.kind === "sendMessage")
      .at(-1)!;
    expect(lastSend.options?.buttons?.flat().some((button) => button.data === "slot:0")).toBe(true);

    // Step 2: the lead taps the first offered slot chip -> real pending
    // booking row, tentative calendar event, requests.state -> awaiting_admin.
    const { bookingId, eventId } = await tapSlotAndExpectPending(telegramUserId, telegramChatId, requestId, 0);
    expect(calendar.getEvent(eventId)?.status).toBe("tentative");
    const heldSlot = offered[0]!;
    const heldBookingRow = db
      .prepare(`SELECT slot_start, slot_end FROM bookings WHERE id = ?`)
      .get(bookingId) as { slot_start: string; slot_end: string };
    expect(heldBookingRow.slot_start).toBe(heldSlot.start);
    expect(heldBookingRow.slot_end).toBe(heldSlot.end);

    // Step 3: the administrator confirms via the REAL decision route,
    // pointed at the same DB file + the same FakeCalendarPort instance.
    const response = await postDecision(requestId, { action: "confirm" });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("applied");

    expect(readBooking(db, bookingId).status).toBe("confirmed");
    expect(calendar.getEvent(eventId)?.status).toBe("confirmed");

    const notifications = readNotifications(db, bookingId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.kind).toBe("confirmed");
    expect(notifications[0]?.delivery_status).toBe("pending");
    const payload = JSON.parse(notifications[0]!.payload) as { text: string };
    expect(payload.text).toBe(composeConfirmationMessage({ start: heldSlot.start }));

    // Step 4: drain the outbox -> the lead's FakeTelegramTransport receives
    // the confirmation, and the row flips to delivered.
    const drainResult = await drainNotifications(db, transport);
    expect(drainResult.delivered).toBe(1);
    expect(drainResult.failed).toBe(0);
    expect(readNotifications(db, bookingId)[0]?.delivery_status).toBe("delivered");
    const deliveredTexts = transport.sentTexts.filter((text) => text === payload.text);
    expect(deliveredTexts.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------
  // Round trip 2: propose -> hold -> decline
  // -------------------------------------------------------------------
  it("round trip 2: propose -> hold -> decline — real bookings/requests/notifications rows at every step", async () => {
    const telegramUserId = "tg-user-g1-decline";
    const telegramChatId = "tg-chat-g1-decline";
    const { leadId, requestId } = seedProposingLead(db, telegramUserId, telegramChatId);

    await driveProposeSlots(telegramUserId, telegramChatId, leadId, ["Thu"], { start: "13:00", end: "15:00" });
    const { bookingId, eventId } = await tapSlotAndExpectPending(telegramUserId, telegramChatId, requestId, 0);

    const response = await postDecision(requestId, { action: "decline" });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("applied");

    expect(readBooking(db, bookingId).status).toBe("declined");
    // FR-HITL-04: the tentative event is deleted, not merely marked.
    expect(calendar.getEvent(eventId)).toBeUndefined();

    const notifications = readNotifications(db, bookingId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.kind).toBe("declined");
    const payload = JSON.parse(notifications[0]!.payload) as { text: string };
    expect(payload.text).toBe(DECLINE_COPY);
    expect(payload.text).not.toMatch(/!/); // BC-BRAND-01: decline carries no "!"

    const drainResult = await drainNotifications(db, transport);
    expect(drainResult.delivered).toBe(1);
    expect(readNotifications(db, bookingId)[0]?.delivery_status).toBe("delivered");
    expect(transport.sentTexts).toContain(payload.text);
  });

  // -------------------------------------------------------------------
  // Round trip 3: propose -> hold -> propose-another-time -> lead re-picks
  // an admin slot -> confirm
  // -------------------------------------------------------------------
  it("round trip 3: propose -> hold -> propose-another-time -> lead picks an admin slot -> confirm — real bookings/requests/notifications rows at every step", async () => {
    const telegramUserId = "tg-user-g1-reprop";
    const telegramChatId = "tg-chat-g1-reprop";
    const { leadId, requestId } = seedProposingLead(db, telegramUserId, telegramChatId);

    // Lead-side: propose -> hold (original booking).
    await driveProposeSlots(telegramUserId, telegramChatId, leadId, ["Fri"], { start: "10:00", end: "12:00" });
    const original = await tapSlotAndExpectPending(telegramUserId, telegramChatId, requestId, 0);

    // Admin-side: Propose another time with a fresh, on-grid, free slot —
    // deliberately a DIFFERENT weekday/hour than the original hold so it
    // cannot collide with the still-tentative original event (the route
    // validates BEFORE deleting the old hold, per design.md Decision 5
    // step 3 preceding step 4).
    const adminSlot = { start: "2026-07-17T15:00", end: "2026-07-17T16:00" }; // Friday, two weeks out
    const reproposeResponse = await postDecision(requestId, {
      action: "propose_another_time",
      slots: [adminSlot],
    });
    expect(reproposeResponse.status).toBe(200);
    const reproposeBody = (await reproposeResponse.json()) as { status: string };
    expect(reproposeBody.status).toBe("applied");

    // The OLD booking is superseded (cancelled) and its tentative event gone.
    expect(readBooking(db, original.bookingId).status).toBe("cancelled");
    expect(calendar.getEvent(original.eventId)).toBeUndefined();

    // The conversation reopens at 'proposing' with the admin's slot offered.
    const reopenedRequest = db.prepare(`SELECT state, offered_slots FROM requests WHERE id = ?`).get(requestId) as {
      state: string;
      offered_slots: string | null;
    };
    expect(reopenedRequest.state).toBe("proposing");
    expect(parseOfferedSlots(reopenedRequest.offered_slots)).toEqual([adminSlot]);

    // A 'proposed_again' notification with tappable slot buttons was queued.
    const reproposeNotifications = readNotifications(db, original.bookingId);
    expect(reproposeNotifications).toHaveLength(1);
    expect(reproposeNotifications[0]?.kind).toBe("proposed_again");
    const reproposePayload = JSON.parse(reproposeNotifications[0]!.payload) as {
      text: string;
      buttons?: Array<Array<{ text: string; data: string }>>;
    };
    expect(reproposePayload.text).not.toMatch(/!/);
    expect(reproposePayload.buttons).toEqual([[{ text: expect.any(String), data: "slot:0" }]]);

    // Drain the re-proposal to the lead's transport before they "see" it.
    const firstDrain = await drainNotifications(db, transport);
    expect(firstDrain.delivered).toBe(1);
    const reproposalSend = transport.calls
      .filter((call): call is Extract<(typeof transport.calls)[number], { kind: "sendMessage" }> => call.kind === "sendMessage")
      .find((call) => call.text === reproposePayload.text);
    expect(reproposalSend).toBeDefined();
    expect(reproposalSend?.options?.buttons?.flat().some((button) => button.data === "slot:0")).toBe(true);

    // Lead-side: the lead taps the admin's re-offered slot -> a NEW pending
    // booking on the SAME request, a NEW tentative calendar event.
    const rebooked = await tapSlotAndExpectPending(telegramUserId, telegramChatId, requestId, 0);
    expect(rebooked.bookingId).not.toBe(original.bookingId);
    const rebookedRow = db
      .prepare(`SELECT slot_start, slot_end FROM bookings WHERE id = ?`)
      .get(rebooked.bookingId) as { slot_start: string; slot_end: string };
    expect(rebookedRow.slot_start).toBe(adminSlot.start);
    expect(rebookedRow.slot_end).toBe(adminSlot.end);

    // Admin-side: Confirm the NEW pending booking.
    const confirmResponse = await postDecision(requestId, { action: "confirm" });
    expect(confirmResponse.status).toBe(200);
    const confirmBody = (await confirmResponse.json()) as { status: string };
    expect(confirmBody.status).toBe("applied");

    expect(readBooking(db, rebooked.bookingId).status).toBe("confirmed");
    expect(calendar.getEvent(rebooked.eventId)?.status).toBe("confirmed");
    // The superseded original booking is untouched by this second decision.
    expect(readBooking(db, original.bookingId).status).toBe("cancelled");

    const confirmNotifications = readNotifications(db, rebooked.bookingId);
    expect(confirmNotifications).toHaveLength(1);
    expect(confirmNotifications[0]?.kind).toBe("confirmed");

    const secondDrain = await drainNotifications(db, transport);
    expect(secondDrain.delivered).toBe(1);
    expect(readNotifications(db, rebooked.bookingId)[0]?.delivery_status).toBe("delivered");
  });
});
