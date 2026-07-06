// Test-first (RED): apps/dashboard/app/api/decisions/[requestId]/route.ts's
// `POST` is STILL the inert "not_connected" stub from the `dashboard` slice
// (booking-hitl tasks.md §D.1-D.11's red half) — every test below pins the
// REAL nine-step decision-route contract (design.md Decision 5) and is
// expected to FAIL against the stub for the right reason: the stub
// unconditionally returns `{ status: "not_connected" }` (HTTP 200) for every
// request, so every assertion on `body.status`/`body.code` below mismatches,
// and D.11's malformed-input cases (expecting 400) mismatch the stub's
// unconditional 200. `route.ts` is intentionally NOT touched by this pass —
// tasks.md D.12 (the real nine-step handler) makes these tests green.
//
// AMBIGUITY FLAGGED FOR THE GREEN IMPLEMENTER (see this file's own F.3
// section below for the pinned regression): design.md Decision 5 step 4
// literally says the route calls `calendar.deleteEvent(eventId)` for
// decline/propose-another-time, annotated "(idempotent per Decision 6, item
// 2)"; Decision 6 item 2 separately describes `lib/src/slots/hold.ts`'s
// `releaseHold` as "the ONE shared function every delete path already
// calls... every caller benefits" — but the CURRENT `apps/dashboard/app/api/
// leads/[id]/route.ts` calls `calendar.deleteEvent(...)` directly, not
// `releaseHold`, so that claim does not yet hold for either existing route.
// This file's F.3 case therefore pins the OBSERVABLE BEHAVIOR (a 404 on
// delete must not abort the decision) rather than asserting HOW the route
// gets there, so it passes whether the green implementer routes through
// `releaseHold` (recommended, matches Decision 6 item 2's stated intent) or
// re-implements the same 404/410 catch inline.
//
// Real SQLite (a temp file, same reasoning as the sibling
// `leads/[id]/route.test.ts`: the green route resolves its own connection
// from `KAMERTON_DB_PATH`, separate from this test's seeding connection) +
// a real `FakeCalendarPort` via the SAME `setCalendarPortForTesting` seam
// the leads route already uses (`../../../../lib/calendar-port.ts`) —
// mirrored, not reinvented.
//
// Dynamic route params as a `Promise`, `runtime = "nodejs"` — same Next.js
// 15+/16 convention as every other route in this app.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import {
  insertBooking,
  insertLead,
  insertRequest,
  openDatabase,
  parseOfferedSlots,
  updateRequestState,
  type RequestRow,
} from "@kamerton/db";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import { CalendarApiError, CalendarTimeoutError } from "@kamerton/lib/src/slots/calendar-port.ts";
import { kyivWallClockToUtc } from "@kamerton/lib/src/slots/timezone.ts";
import { compileFirstLessonBrief } from "@kamerton/lib/src/intake/first-lesson-brief.ts";
import {
  DECLINE_COPY,
  composeConfirmationMessage,
  composeReProposalMessage,
} from "@kamerton/lib/src/booking/copy.ts";
import { setCalendarPortForTesting } from "../../../../lib/calendar-port.ts";
import { subscribe, type AguiEventListener } from "../../../../lib/agui-hub.ts";
import { POST } from "./route.ts";

function decisionUrl(requestId: number | string): string {
  return `http://127.0.0.1:3000/api/decisions/${requestId}`;
}

function paramsFor(requestId: number | string): { params: Promise<{ requestId: string }> } {
  return { params: Promise.resolve({ requestId: String(requestId) }) };
}

function postDecision(requestId: number | string, body: unknown): Promise<Response> {
  return POST(
    new Request(decisionUrl(requestId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    paramsFor(requestId),
  );
}

interface SeededPending {
  leadId: number;
  requestId: number;
  bookingId: number;
  eventId: string;
  telegramChatId: string;
  /** Kyiv wall-clock local `Slot`, same shape `insertBooking` persists
   *  verbatim (design.md Decision 6 item 4). */
  slot: { start: string; end: string };
}

describe("POST /api/decisions/:requestId (booking-hitl tasks.md §D, design.md Decision 5)", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;
  let calendar: FakeCalendarPort;
  let unsubscribeAgui: (() => void) | undefined;

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-decisions-"));
    dbPath = path.join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    process.env.KAMERTON_DB_PATH = dbPath;
    calendar = new FakeCalendarPort();
    setCalendarPortForTesting(calendar);
  });

  afterEach(() => {
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    rmSync(dbDir, { recursive: true, force: true });
    setCalendarPortForTesting(undefined);
    unsubscribeAgui?.();
    unsubscribeAgui = undefined;
  });

  function watchAguiEvents(): { received: Parameters<AguiEventListener>[0][] } {
    const received: Parameters<AguiEventListener>[0][] = [];
    unsubscribeAgui = subscribe((event) => received.push(event));
    return { received };
  }

  /** Seeds lead + request + a `pending` booking with a real tentative
   *  `FakeCalendarPort` event, mirroring what `HoldStorePort.holdSlot`
   *  (Stage C) actually persists: `slot_start`/`slot_end` Kyiv-local
   *  verbatim, `calendar_event_id` set, `request_id` set. */
  async function seedPendingBooking(
    slot: { start: string; end: string },
    options: { leadSuffix?: string; requestFields?: Partial<RequestRow> } = {},
  ): Promise<SeededPending> {
    const suffix = options.leadSuffix ?? String(Math.random()).slice(2, 8);
    const telegramChatId = `tg-chat-${suffix}`;
    const db = openDatabase(dbPath);
    try {
      const lead = insertLead(db, {
        telegramUserId: `tg-user-${suffix}`,
        telegramChatId,
        telegramDisplayName: "Тестовий Лід",
      });
      const request = insertRequest(db, { leadId: lead.id, telegramChatId });
      updateRequestState(db, request.id, "awaiting_admin");

      const utcRange = {
        start: kyivWallClockToUtc(slot.start),
        end: kyivWallClockToUtc(slot.end),
      };
      const { eventId } = await calendar.createTentative(utcRange, "Пробне заняття — лід");

      const booking = insertBooking(db, {
        slotStart: slot.start,
        slotEnd: slot.end,
        status: "pending",
        calendarEventId: eventId,
        requestId: request.id,
      });

      return {
        leadId: lead.id,
        requestId: request.id,
        bookingId: booking.id,
        eventId,
        telegramChatId,
        slot,
      };
    } finally {
      db.close();
    }
  }

  function readBooking(bookingId: number): { status: string } {
    const db = openDatabase(dbPath);
    try {
      return db.prepare(`SELECT status FROM bookings WHERE id = ?`).get(bookingId) as { status: string };
    } finally {
      db.close();
    }
  }

  function readRequest(requestId: number): RequestRow {
    const db = openDatabase(dbPath);
    try {
      return db.prepare(`SELECT * FROM requests WHERE id = ?`).get(requestId) as RequestRow;
    } finally {
      db.close();
    }
  }

  interface NotificationRowForTest {
    id: number;
    booking_id: number;
    telegram_chat_id: string;
    kind: string;
    payload: string;
    delivery_status: string;
  }

  function readNotifications(bookingId: number): NotificationRowForTest[] {
    const db = openDatabase(dbPath);
    try {
      return db
        .prepare(`SELECT * FROM notifications WHERE booking_id = ? ORDER BY id ASC`)
        .all(bookingId) as NotificationRowForTest[];
    } finally {
      db.close();
    }
  }

  // ---------------------------------------------------------------------
  // D.1 — no pending booking -> stale, never 404
  // ---------------------------------------------------------------------
  describe("D.1 no pending booking for the request (@trace FR-HITL-03)", () => {
    it("responds 200 {status:'stale'} for a request that exists but has no pending booking, never 404", async () => {
      const db = openDatabase(dbPath);
      const lead = insertLead(db, {
        telegramUserId: "tg-user-stale",
        telegramChatId: "tg-chat-stale",
      });
      const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-stale" });
      db.close();

      const response = await postDecision(request.id, { action: "confirm" });

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(404);
      const body = await response.json();
      expect(body.status).toBe("stale");
    });

    it("responds 200 {status:'stale'} for a non-existent request id, never 404", async () => {
      const response = await postDecision(999999, { action: "confirm" });

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(404);
      const body = await response.json();
      expect(body.status).toBe("stale");
    });

    it("responds 200 {status:'stale'} when the request's only booking already left pending (e.g. already confirmed)", async () => {
      const seeded = await seedPendingBooking({ start: "2026-07-08T10:00", end: "2026-07-08T11:00" });
      const db = openDatabase(dbPath);
      db.prepare(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`).run(seeded.bookingId);
      db.close();

      const response = await postDecision(seeded.requestId, { action: "decline" });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("stale");
    });
  });

  // ---------------------------------------------------------------------
  // D.2 — Confirm happy path
  // ---------------------------------------------------------------------
  describe("D.2 Confirm happy path (@trace FR-HITL-01, @trace FR-HITL-02, @trace FR-HITL-04)", () => {
    it("upgrades the tentative event with the first-lesson brief, confirms the booking, inserts a notification, and republishes STATE_SNAPSHOT", async () => {
      const slot = { start: "2026-07-08T11:00", end: "2026-07-08T12:00" }; // Wednesday
      const seeded = await seedPendingBooking(slot);
      const { received } = watchAguiEvents();

      const response = await postDecision(seeded.requestId, { action: "confirm" });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("applied");

      // Calendar: the tentative event is upgraded to confirmed, carrying the
      // compiled first-lesson brief as its description.
      const event = calendar.getEvent(seeded.eventId);
      expect(event?.status).toBe("confirmed");
      const requestRow = readRequest(seeded.requestId);
      const expectedBrief = compileFirstLessonBrief(requestRow);
      expect(event?.description).toBe(expectedBrief);

      // DB: booking is confirmed.
      expect(readBooking(seeded.bookingId).status).toBe("confirmed");

      // Notification outbox: one 'confirmed' row, pending delivery, exact
      // date/time in the payload text.
      const notifications = readNotifications(seeded.bookingId);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.kind).toBe("confirmed");
      expect(notifications[0]?.delivery_status).toBe("pending");
      const payload = JSON.parse(notifications[0]!.payload) as { text: string };
      expect(payload.text).toBe(composeConfirmationMessage({ start: slot.start }));
      expect(payload.text).toContain("08.07.2026");
      expect(payload.text).toContain("11:00");

      // AG-UI: a fresh dashboard-scoped STATE_SNAPSHOT was published.
      const snapshotEvents = received.filter(
        (e) => e.type === "STATE_SNAPSHOT" && (e as { threadId?: string }).threadId === "dashboard",
      );
      expect(snapshotEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------
  // D.3 — Confirm collision
  // ---------------------------------------------------------------------
  describe("D.3 Confirm collision (@trace FR-HITL-04)", () => {
    it("responds {status:'conflict'} when a fresh free/busy check finds the slot now busy, booking stays pending, no confirmed event, no notification", async () => {
      const slot = { start: "2026-07-08T13:00", end: "2026-07-08T14:00" }; // Wednesday
      const seeded = await seedPendingBooking(slot);

      // A conflicting event appeared in the DEMO calendar after the hold was
      // created (spec.md "Slot no longer free at Confirm").
      calendar.addManualBusy({
        start: kyivWallClockToUtc(slot.start),
        end: kyivWallClockToUtc(slot.end),
      });

      const response = await postDecision(seeded.requestId, { action: "confirm" });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("conflict");

      expect(readBooking(seeded.bookingId).status).toBe("pending");
      expect(calendar.getEvent(seeded.eventId)?.status).toBe("tentative");
      expect(readNotifications(seeded.bookingId)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // D.4 — Confirm calendar failure
  // ---------------------------------------------------------------------
  describe("D.4 Confirm calendar failure (@trace NFR-REL-01)", () => {
    it("responds {status:'unavailable'} when freeBusy throws a CalendarError, booking stays pending, nothing sent", async () => {
      class ThrowingFreeBusy extends FakeCalendarPort {
        override async freeBusy(): Promise<never> {
          throw new CalendarTimeoutError();
        }
      }
      const throwingCalendar = new ThrowingFreeBusy();
      setCalendarPortForTesting(throwingCalendar);
      const slot = { start: "2026-07-08T14:00", end: "2026-07-08T15:00" };
      const { eventId } = await throwingCalendar.createTentative(
        { start: kyivWallClockToUtc(slot.start), end: kyivWallClockToUtc(slot.end) },
        "Пробне заняття — лід",
      );
      const db = openDatabase(dbPath);
      const lead = insertLead(db, { telegramUserId: "tg-user-d4a", telegramChatId: "tg-chat-d4a" });
      const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-d4a" });
      const booking = insertBooking(db, {
        slotStart: slot.start,
        slotEnd: slot.end,
        status: "pending",
        calendarEventId: eventId,
        requestId: request.id,
      });
      db.close();

      const response = await postDecision(request.id, { action: "confirm" });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("unavailable");
      expect(readBooking(booking.id).status).toBe("pending");
      expect(readNotifications(booking.id)).toHaveLength(0);
    });

    it("responds {status:'unavailable'} when upgradeToConfirmed throws a CalendarError, booking stays pending, nothing sent", async () => {
      class ThrowingUpgrade extends FakeCalendarPort {
        override async upgradeToConfirmed(): Promise<never> {
          throw new CalendarApiError("upgrade failed", { status: 500 });
        }
      }
      const throwingCalendar = new ThrowingUpgrade();
      setCalendarPortForTesting(throwingCalendar);
      const slot = { start: "2026-07-08T15:00", end: "2026-07-08T16:00" };
      const { eventId } = await throwingCalendar.createTentative(
        { start: kyivWallClockToUtc(slot.start), end: kyivWallClockToUtc(slot.end) },
        "Пробне заняття — лід",
      );
      const db = openDatabase(dbPath);
      const lead = insertLead(db, { telegramUserId: "tg-user-d4b", telegramChatId: "tg-chat-d4b" });
      const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-d4b" });
      const booking = insertBooking(db, {
        slotStart: slot.start,
        slotEnd: slot.end,
        status: "pending",
        calendarEventId: eventId,
        requestId: request.id,
      });
      db.close();

      const response = await postDecision(request.id, { action: "confirm" });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("unavailable");
      expect(readBooking(booking.id).status).toBe("pending");
      expect(readNotifications(booking.id)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // D.5 — Decline happy path
  // ---------------------------------------------------------------------
  describe("D.5 Decline happy path (@trace FR-HITL-03, @trace FR-HITL-04)", () => {
    it("deletes the tentative event, declines the booking, inserts a 'declined' notification", async () => {
      const slot = { start: "2026-07-08T16:00", end: "2026-07-08T17:00" };
      const seeded = await seedPendingBooking(slot);

      const response = await postDecision(seeded.requestId, { action: "decline" });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("applied");

      expect(calendar.getEvent(seeded.eventId)).toBeUndefined();
      expect(readBooking(seeded.bookingId).status).toBe("declined");

      const notifications = readNotifications(seeded.bookingId);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.kind).toBe("declined");
      const payload = JSON.parse(notifications[0]!.payload) as { text: string };
      expect(payload.text).toBe(DECLINE_COPY);
      expect(payload.text).not.toMatch(/!/);
    });
  });

  // ---------------------------------------------------------------------
  // D.6 — Decline calendar-delete failure
  // ---------------------------------------------------------------------
  describe("D.6 Decline calendar-delete failure (@trace NFR-REL-01)", () => {
    it("responds {status:'unavailable'} when deleteEvent throws a non-404/410 CalendarError, booking stays pending, slot not released", async () => {
      class ThrowingDelete extends FakeCalendarPort {
        override async deleteEvent(): Promise<never> {
          throw new CalendarApiError("delete failed", { status: 500 });
        }
      }
      const throwingCalendar = new ThrowingDelete();
      setCalendarPortForTesting(throwingCalendar);
      const slot = { start: "2026-07-08T17:00", end: "2026-07-08T18:00" };
      const { eventId } = await throwingCalendar.createTentative(
        { start: kyivWallClockToUtc(slot.start), end: kyivWallClockToUtc(slot.end) },
        "Пробне заняття — лід",
      );
      const db = openDatabase(dbPath);
      const lead = insertLead(db, { telegramUserId: "tg-user-d6", telegramChatId: "tg-chat-d6" });
      const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-d6" });
      const booking = insertBooking(db, {
        slotStart: slot.start,
        slotEnd: slot.end,
        status: "pending",
        calendarEventId: eventId,
        requestId: request.id,
      });
      db.close();

      const response = await postDecision(request.id, { action: "decline" });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("unavailable");
      expect(readBooking(booking.id).status).toBe("pending");
      // Slot not marked released: the event is still there, still tentative.
      expect(throwingCalendar.getEvent(eventId)?.status).toBe("tentative");
      expect(readNotifications(booking.id)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // D.7 — Propose-another-time, zero slots
  // ---------------------------------------------------------------------
  describe("D.7 Propose-another-time with zero slots (@trace FR-HITL-03)", () => {
    it("responds {status:'invalid', code:'NO_SLOTS_SELECTED'}, nothing touched", async () => {
      const slot = { start: "2026-07-08T18:00", end: "2026-07-08T19:00" };
      const seeded = await seedPendingBooking(slot);

      const response = await postDecision(seeded.requestId, { action: "propose_another_time", slots: [] });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("invalid");
      expect(body.code).toBe("NO_SLOTS_SELECTED");

      expect(readBooking(seeded.bookingId).status).toBe("pending");
      expect(calendar.getEvent(seeded.eventId)?.status).toBe("tentative");
      expect(readNotifications(seeded.bookingId)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // D.8 — Propose-another-time, off-grid slot
  // ---------------------------------------------------------------------
  describe("D.8 Propose-another-time with an off-grid slot (@trace BC-SCHEDULE-01)", () => {
    it("rejects a Saturday slot with {status:'invalid', code:'OFF_GRID'}, original tentative event untouched", async () => {
      const slot = { start: "2026-07-09T14:00", end: "2026-07-09T15:00" }; // Thursday
      const seeded = await seedPendingBooking(slot);

      const saturdaySlot = { start: "2026-07-11T14:00", end: "2026-07-11T15:00" }; // Saturday
      const response = await postDecision(seeded.requestId, {
        action: "propose_another_time",
        slots: [saturdaySlot],
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("invalid");
      expect(body.code).toBe("OFF_GRID");

      expect(readBooking(seeded.bookingId).status).toBe("pending");
      expect(calendar.getEvent(seeded.eventId)?.status).toBe("tentative");
      expect(readNotifications(seeded.bookingId)).toHaveLength(0);
    });

    it("rejects a 21:00 start with {status:'invalid', code:'OFF_GRID'}", async () => {
      const slot = { start: "2026-07-09T15:00", end: "2026-07-09T16:00" }; // Thursday
      const seeded = await seedPendingBooking(slot);

      const lateSlot = { start: "2026-07-09T21:00", end: "2026-07-09T22:00" }; // still Thursday, off-grid hour
      const response = await postDecision(seeded.requestId, {
        action: "propose_another_time",
        slots: [lateSlot],
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("invalid");
      expect(body.code).toBe("OFF_GRID");
      expect(readBooking(seeded.bookingId).status).toBe("pending");
    });
  });

  // ---------------------------------------------------------------------
  // D.9 — Propose-another-time, busy/held slot
  // ---------------------------------------------------------------------
  describe("D.9 Propose-another-time with a busy/held slot (@trace FR-HITL-03)", () => {
    it("responds {status:'invalid', code:'SLOT_UNAVAILABLE'} for a slot busy in the DEMO calendar", async () => {
      const slot = { start: "2026-07-09T11:00", end: "2026-07-09T12:00" }; // Thursday
      const seeded = await seedPendingBooking(slot);

      const busySlot = { start: "2026-07-09T16:00", end: "2026-07-09T17:00" }; // Thursday, different hour
      calendar.addManualBusy({
        start: kyivWallClockToUtc(busySlot.start),
        end: kyivWallClockToUtc(busySlot.end),
      });

      const response = await postDecision(seeded.requestId, {
        action: "propose_another_time",
        slots: [busySlot],
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("invalid");
      expect(body.code).toBe("SLOT_UNAVAILABLE");
      expect(readBooking(seeded.bookingId).status).toBe("pending");
      expect(readNotifications(seeded.bookingId)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // D.10 — Propose-another-time happy path
  // ---------------------------------------------------------------------
  describe("D.10 Propose-another-time happy path (@trace FR-HITL-03, @trace FR-HITL-04)", () => {
    it("deletes the old hold, cancels the booking, reopens the conversation with the admin's slots, notifies with buttons, republishes STATE_SNAPSHOT", async () => {
      const oldSlot = { start: "2026-07-09T12:00", end: "2026-07-09T13:00" }; // Thursday
      const seeded = await seedPendingBooking(oldSlot);
      const { received } = watchAguiEvents();

      const newSlots = [{ start: "2026-07-09T14:00", end: "2026-07-09T15:00" }]; // Thursday, free
      const response = await postDecision(seeded.requestId, {
        action: "propose_another_time",
        slots: newSlots,
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("applied");

      // The OLD tentative event is gone.
      expect(calendar.getEvent(seeded.eventId)).toBeUndefined();

      // The superseded booking is 'cancelled' (per spec.md wording), not a
      // new invented status.
      expect(readBooking(seeded.bookingId).status).toBe("cancelled");

      // The conversation reopens at 'proposing' with the admin's slots
      // persisted as the new offer.
      const requestRow = readRequest(seeded.requestId);
      expect(requestRow.state).toBe("proposing");
      expect(parseOfferedSlots(requestRow.offered_slots)).toEqual(newSlots);

      // A 'proposed_again' notification carries the re-proposal text and
      // tappable slot buttons.
      const notifications = readNotifications(seeded.bookingId);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.kind).toBe("proposed_again");
      const payload = JSON.parse(notifications[0]!.payload) as {
        text: string;
        buttons?: Array<Array<{ text: string; data: string }>>;
      };
      expect(payload.text).toBe(composeReProposalMessage(newSlots));
      expect(payload.text).not.toMatch(/!/);
      expect(Array.isArray(payload.buttons)).toBe(true);
      expect(payload.buttons).toHaveLength(newSlots.length);
      payload.buttons?.forEach((row, index) => {
        expect(row).toHaveLength(1);
        expect(row[0]?.data).toBe(`slot:${index}`);
      });

      // A fresh dashboard-scoped STATE_SNAPSHOT was published.
      const snapshotEvents = received.filter(
        (e) => e.type === "STATE_SNAPSHOT" && (e as { threadId?: string }).threadId === "dashboard",
      );
      expect(snapshotEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------
  // D.11 — Malformed input
  // ---------------------------------------------------------------------
  describe("D.11 Malformed input never surfaces a raw 500 or a pinned decision shape", () => {
    it.each(["abc", "1.5", "-1", "0", ""])(
      "a non-integer requestId ('%s') responds 400, never 500, never a decision-shape body",
      async (rawRequestId) => {
        const response = await postDecision(rawRequestId, { action: "confirm" });

        expect(response.status).toBe(400);
        expect(response.status).not.toBe(500);
        const body = await response.json();
        expect(body.status).not.toBe("applied");
        expect(body.status).not.toBe("stale");
        expect(body.status).not.toBe("conflict");
        expect(body.status).not.toBe("invalid");
        expect(body.status).not.toBe("unavailable");
      },
    );

    it.each([{ action: "banana" }, { action: undefined }, {}])(
      "an action outside the three-value enum (%j) responds 400, never 500",
      async (badBody) => {
        const seeded = await seedPendingBooking({ start: "2026-07-08T19:00", end: "2026-07-08T20:00" });

        const response = await postDecision(seeded.requestId, badBody);

        expect(response.status).toBe(400);
        expect(response.status).not.toBe(500);
        const body = await response.json();
        expect(body.status).not.toBe("applied");
        // The booking must be untouched by a wire-format rejection.
        expect(readBooking(seeded.bookingId).status).toBe("pending");
      },
    );
  });

  // ---------------------------------------------------------------------
  // F.3 carryover — idempotent delete (design.md Decision 6 item 2)
  // ---------------------------------------------------------------------
  describe("F.3 idempotent-delete regression pin (design.md Decision 6, item 2; @trace NFR-REL-01)", () => {
    it("Decline completes successfully even when deleteEvent rejects with a 404 CalendarApiError (already-deleted event)", async () => {
      class AlreadyDeletedCalendar extends FakeCalendarPort {
        override async deleteEvent(): Promise<void> {
          throw new CalendarApiError("already gone", { status: 404 });
        }
      }
      const alreadyDeletedCalendar = new AlreadyDeletedCalendar();
      setCalendarPortForTesting(alreadyDeletedCalendar);
      const slot = { start: "2026-07-10T10:00", end: "2026-07-10T11:00" }; // Friday
      const { eventId } = await alreadyDeletedCalendar.createTentative(
        { start: kyivWallClockToUtc(slot.start), end: kyivWallClockToUtc(slot.end) },
        "Пробне заняття — лід",
      );
      const db = openDatabase(dbPath);
      const lead = insertLead(db, { telegramUserId: "tg-user-f3", telegramChatId: "tg-chat-f3" });
      const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-f3" });
      const booking = insertBooking(db, {
        slotStart: slot.start,
        slotEnd: slot.end,
        status: "pending",
        calendarEventId: eventId,
        requestId: request.id,
      });
      db.close();

      const response = await postDecision(request.id, { action: "decline" });

      expect(response.status).toBe(200);
      const body = await response.json();
      // A 404 on an already-gone tentative event is NOT a failure — the
      // decision still completes (releaseHold's idempotent-delete fix,
      // A.13/A.14, benefits this call site too).
      expect(body.status).toBe("applied");
      expect(readBooking(booking.id).status).toBe("declined");
      const notifications = readNotifications(booking.id);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.kind).toBe("declined");
    });

    it("Propose-another-time completes successfully even when deleteEvent (on the OLD hold) rejects with a 410 CalendarApiError", async () => {
      class AlreadyGoneCalendar extends FakeCalendarPort {
        override async deleteEvent(): Promise<void> {
          throw new CalendarApiError("gone", { status: 410 });
        }
      }
      const alreadyGoneCalendar = new AlreadyGoneCalendar();
      setCalendarPortForTesting(alreadyGoneCalendar);
      const oldSlot = { start: "2026-07-10T12:00", end: "2026-07-10T13:00" }; // Friday
      const { eventId } = await alreadyGoneCalendar.createTentative(
        { start: kyivWallClockToUtc(oldSlot.start), end: kyivWallClockToUtc(oldSlot.end) },
        "Пробне заняття — лід",
      );
      const db = openDatabase(dbPath);
      const lead = insertLead(db, { telegramUserId: "tg-user-f3b", telegramChatId: "tg-chat-f3b" });
      const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-f3b" });
      const booking = insertBooking(db, {
        slotStart: oldSlot.start,
        slotEnd: oldSlot.end,
        status: "pending",
        calendarEventId: eventId,
        requestId: request.id,
      });
      db.close();

      const newSlots = [{ start: "2026-07-10T15:00", end: "2026-07-10T16:00" }]; // Friday, free
      const response = await postDecision(request.id, { action: "propose_another_time", slots: newSlots });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("applied");
      expect(readBooking(booking.id).status).toBe("cancelled");
      const requestRow = readRequest(request.id);
      expect(requestRow.state).toBe("proposing");
      expect(parseOfferedSlots(requestRow.offered_slots)).toEqual(newSlots);
    });
  });
});
