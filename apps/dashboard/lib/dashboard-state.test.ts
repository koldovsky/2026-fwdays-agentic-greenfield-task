// Test-first (red): apps/dashboard/lib/dashboard-state.ts's
// `buildStateSnapshot` is a typed throwing stub (dashboard tasks.md §5.2's
// red half) — every test below is expected to FAIL against the stub, for
// the right reason (the stub's synchronous throw), until §5.2's green half
// implements the real pure assembly. Plain fixture arrays only — no
// `better-sqlite3` here at all (that is §5.5's `dashboard-db.test.ts`'s job);
// this suite proves `buildStateSnapshot` is testable with zero I/O.

import { describe, expect, it } from "vitest";
import type { LeadRow, MessageRow, RequestRow } from "@kamerton/db";
import { buildStateSnapshot, type DashboardBookingRow } from "./dashboard-state.ts";

function lead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 1,
    telegram_user_id: "tg-user-1",
    telegram_chat_id: "tg-chat-1",
    telegram_display_name: "Тестова Лідка",
    created_at: "2026-07-06T10:00:00.000Z",
    ...overrides,
  };
}

function request(overrides: Partial<RequestRow> = {}): RequestRow {
  return {
    id: 1,
    lead_id: 1,
    telegram_chat_id: "tg-chat-1",
    state: "awaiting_admin",
    student_name: null,
    student_age: null,
    format: null,
    goal_tag: null,
    goal_text: null,
    tastes: null,
    dream_song: null,
    experience: null,
    comfort: null,
    preferred_weekdays: null,
    preferred_time_range: null,
    created_at: "2026-07-06T10:00:00.000Z",
    offered_slots: null,
    ...overrides,
  };
}

function booking(overrides: Partial<DashboardBookingRow> = {}): DashboardBookingRow {
  return {
    id: 1,
    slot_start: "2026-07-06T10:00:00+03:00",
    slot_end: "2026-07-06T11:00:00+03:00",
    status: "pending",
    calendar_event_id: "cal-evt-1",
    request_id: 1,
    created_at: "2026-07-06T09:00:00.000Z",
    ...overrides,
  };
}

function message(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    id: 1,
    request_id: 1,
    role: "user",
    content: "Привіт",
    created_at: "2026-07-06T10:00:00.000Z",
    ...overrides,
  };
}

const MONDAY_WEEK_START = "2026-07-06"; // a Monday (this suite's own fixture week)

describe("buildStateSnapshot (apps/dashboard/lib/dashboard-state.ts, dashboard tasks.md §5.2)", () => {
  // @trace FR-DASH-01
  it("a pending request appears in the queue with its compiled first-lesson brief", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [
          request({
            id: 1,
            student_name: "Оксана",
            student_age: 9,
            format: "individual",
            goal_tag: "hobby",
            goal_text: "для задоволення",
          }),
        ],
        bookings: [booking({ request_id: 1, status: "pending" })],
      },
      MONDAY_WEEK_START,
    );

    expect(state.pendingQueue).toHaveLength(1);
    const entry = state.pendingQueue[0]!;
    expect(entry.requestId).toBe(1);
    expect(entry.studentName).toBe("Оксана");
    expect(entry.brief).toContain("Оксана");
    expect(entry.brief).toContain("Формат:");
  });

  // @trace FR-DASH-03
  it("a seat with a confirmed AND a pending booking this week resolves to 'confirmed' via hallSeatStatus's precedence", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [request({ id: 1 }), request({ id: 2, lead_id: 1 })],
        bookings: [
          booking({ id: 1, request_id: 1, status: "pending", slot_start: "2026-07-06T10:00:00+03:00" }),
          booking({ id: 2, request_id: 2, status: "confirmed", slot_start: "2026-07-06T10:00:00+03:00" }),
        ],
      },
      MONDAY_WEEK_START,
    );

    const seat = state.hallMap.find((s) => s.weekday === 1 && s.hour === 10);
    expect(seat).toBeDefined();
    expect(seat!.status).toBe("confirmed");
  });

  // @trace FR-DASH-03
  it("empty rows produce an empty queue and an all-free week, without throwing", () => {
    const state = buildStateSnapshot({ leads: [], requests: [], bookings: [] }, MONDAY_WEEK_START);

    expect(state.pendingQueue).toHaveLength(0);
    expect(state.hallMap.length).toBeGreaterThan(0); // the grid itself is always present
    expect(state.hallMap.every((seat) => seat.status === "free")).toBe(true);
    expect(state.hallMap.every((seat) => seat.occupantName == null)).toBe(true); // no bookings, nobody on any seat
    expect(state.conversationMessages).toEqual({}); // no threads, no persisted transcripts
    expect(state.confirmedBookings).toEqual([]);
  });

  // @trace FR-DASH-03 — the HallMap hover tooltip: a booked seat must reveal
  // WHO is on it, for confirmed seats too (not just pending). The seat carries
  // the precedence-winning booking's student name so `HallMap` can render it.
  it("a confirmed seat carries the student's name as its occupant", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [request({ id: 1, student_name: "Оля", state: "awaiting_admin" })],
        bookings: [booking({ id: 1, request_id: 1, status: "confirmed", slot_start: "2026-07-06T10:00:00+03:00" })],
      },
      MONDAY_WEEK_START,
    );

    const seat = state.hallMap.find((s) => s.weekday === 1 && s.hour === 10)!;
    expect(seat.status).toBe("confirmed");
    expect(seat.occupantName).toBe("Оля");
  });

  // @trace FR-DASH-03 — precedence: confirmed wins over pending for the seat's
  // status AND its occupant (the tooltip names the confirmed student, matching
  // the green seat, never the released pending one).
  it("when a seat has both a pending and a confirmed booking, the occupant is the confirmed student", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [
          request({ id: 1, student_name: "Пендінг", state: "awaiting_admin" }),
          request({ id: 2, student_name: "Конфірм", state: "awaiting_admin" }),
        ],
        bookings: [
          booking({ id: 1, request_id: 1, status: "pending", slot_start: "2026-07-06T10:00:00+03:00" }),
          booking({ id: 2, request_id: 2, status: "confirmed", slot_start: "2026-07-06T10:00:00+03:00" }),
        ],
      },
      MONDAY_WEEK_START,
    );

    const seat = state.hallMap.find((s) => s.weekday === 1 && s.hour === 10)!;
    expect(seat.status).toBe("confirmed");
    expect(seat.occupantName).toBe("Конфірм");
  });

  // @trace FR-DASH-01 — confirmed bookings need their own display with date &
  // time (they leave the pending queue the moment they're confirmed). Every
  // confirmed booking, with its student and slot times, sorted by start.
  it("confirmedBookings lists every confirmed booking with its student and slot times, sorted by start", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [
          request({ id: 1, student_name: "Пізніше", student_age: 10, state: "awaiting_admin" }),
          request({ id: 2, student_name: "Раніше", student_age: 8, state: "done" }),
        ],
        bookings: [
          booking({ id: 1, request_id: 1, status: "confirmed", slot_start: "2026-07-08T15:00", slot_end: "2026-07-08T16:00" }),
          booking({ id: 2, request_id: 2, status: "confirmed", slot_start: "2026-07-06T11:00", slot_end: "2026-07-06T12:00" }),
          booking({ id: 3, request_id: 1, status: "pending", slot_start: "2026-07-09T10:00", slot_end: "2026-07-09T11:00" }),
        ],
      },
      MONDAY_WEEK_START,
    );

    expect(state.confirmedBookings).toEqual([
      { requestId: 2, studentName: "Раніше", studentAge: 8, slotStart: "2026-07-06T11:00", slotEnd: "2026-07-06T12:00" },
      { requestId: 1, studentName: "Пізніше", studentAge: 10, slotStart: "2026-07-08T15:00", slotEnd: "2026-07-08T16:00" },
    ]);
  });

  // @trace FR-DASH-01 — the durable conversation transcript, keyed by the
  // active request's Telegram chat id, so the dashboard's live "Розмови"
  // panel can be rehydrated from SQLite on a page refresh (not just from the
  // ephemeral SSE stream). Regression: the panel went blank after reload
  // because the persisted `messages` never reached the snapshot.
  it("groups an active request's persisted messages under its telegram_chat_id, oldest-first, role-labelled", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead({ id: 1, telegram_chat_id: "tg-chat-1" })],
        requests: [request({ id: 1, telegram_chat_id: "tg-chat-1", state: "collecting" })],
        bookings: [],
        messages: [
          message({ id: 1, request_id: 1, role: "user", content: "Хочу записати доньку" }),
          message({ id: 2, request_id: 1, role: "assistant", content: "Радо! Як звати дитину?" }),
          message({ id: 3, request_id: 1, role: "user", content: "Саша, 7" }),
        ],
      },
      MONDAY_WEEK_START,
    );

    expect(state.conversationMessages["tg-chat-1"]).toEqual([
      { role: "user", content: "Хочу записати доньку" },
      { role: "assistant", content: "Радо! Як звати дитину?" },
      { role: "user", content: "Саша, 7" },
    ]);
  });

  // @trace FR-DASH-01 — a message whose request is terminal (`done`/
  // `soft_decline`, so it never appears in `activeRequests`) is not carried
  // in the live panel's transcript map: the panel only shows active
  // conversations (the full transcript of a closed request is still reachable
  // via the pending-card's on-demand `/api/requests/:id/messages` route).
  it("omits transcripts for requests that are not active", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead({ id: 1, telegram_chat_id: "tg-chat-1" })],
        requests: [request({ id: 1, telegram_chat_id: "tg-chat-1", state: "done" })],
        bookings: [],
        messages: [message({ id: 1, request_id: 1, role: "user", content: "давня розмова" })],
      },
      MONDAY_WEEK_START,
    );

    expect(state.conversationMessages).toEqual({});
  });

  // -------------------------------------------------------------------
  // F.4 carryover cross-check (booking-hitl tasks.md §F.4, design.md
  // Decision 6 item 4) — "dashboard-state.dateAndHourOf slices slot_start
  // assuming a Europe/Kyiv wall-clock offset... a UTC/Z-formatted
  // slot_start... would mis-bucket HallMap seats by the Kyiv offset with no
  // error" (`review-findings.json`'s `deferredWithOwner`, owner: S4
  // booking-hitl).
  //
  // `HoldStorePort.holdSlot` (design.md Decision 2) is the FIRST live code
  // that ever writes `bookings.slot_start`/`slot_end`, and it writes the
  // `OfferedSlot`'s own Kyiv wall-clock `start`/`end` strings VERBATIM
  // (`lib/src/slots/grid.ts`'s `Slot` shape — fixed-width
  // "YYYY-MM-DDTHH:mm", no offset, no "Z"; pinned at the write boundary by
  // `packages/db/src/bookings.test.ts`'s own B.5 assertion). This case
  // closes the loop from write to render: feeding that EXACT wall-clock
  // shape into `buildStateSnapshot` must bucket the seat at the WRITTEN
  // hour (17), never at some UTC-converted hour.
  //
  // This is a REGRESSION PIN, not a new red assertion — per booking-hitl
  // tasks.md's own F.4 wording ("No new production code expected here if
  // B/C are already green — this task is the cross-check"), it is expected
  // to be GREEN ON ARRIVAL: `dateAndHourOf` already reads `slot_start` by
  // literal character-slicing (`isoLike.slice(0, 10)` / `.slice(11, 13)`),
  // never through a timezone-aware `Date` parse, so it already buckets a
  // bare "YYYY-MM-DDTHH:mm" Kyiv wall-clock string correctly. The second
  // assertion below demonstrates WHY the write contract matters: a
  // same-real-world-instant value written with a "Z"/UTC suffix instead
  // (as a regressed write path might do) buckets into a DIFFERENT seat,
  // because the literal-slice contract has no timezone awareness at all —
  // it trusts the writer completely. A future regression that starts
  // writing UTC would fail this test loudly (a seat landing in the wrong
  // hour) rather than silently mis-bucketing in production.
  it("F.4: a Kyiv-wall-clock slot_start ('2026-07-14T17:00', HoldStorePort's write shape) buckets the seat at hour 17, never at a UTC-shifted hour", () => {
    // 2026-07-14 is a Tuesday (ISO weekday 2); "2026-07-13" is that week's
    // Monday.
    const TUESDAY_WEEK_START = "2026-07-13";

    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [request({ id: 1, state: "awaiting_admin" })],
        bookings: [
          booking({
            id: 1,
            request_id: 1,
            status: "pending",
            slot_start: "2026-07-14T17:00",
            slot_end: "2026-07-14T18:00",
          }),
        ],
      },
      TUESDAY_WEEK_START,
    );

    const seatAtWrittenHour = state.hallMap.find((s) => s.weekday === 2 && s.hour === 17);
    expect(seatAtWrittenHour).toBeDefined();
    expect(seatAtWrittenHour!.status).not.toBe("free");
  });

  it("F.4 cross-check: the SAME real-world instant written with a UTC 'Z' suffix instead buckets into a DIFFERENT seat — proves the literal-slice contract has no timezone awareness and depends entirely on the Kyiv-wall-clock write contract holding", () => {
    const TUESDAY_WEEK_START = "2026-07-13";

    // "2026-07-14T14:00:00.000Z" is the SAME real-world instant as Kyiv
    // wall-clock "2026-07-14T17:00" (Europe/Kyiv is UTC+3 in July, DST) —
    // but if a regression ever wrote it in this UTC/Z form instead of the
    // Kyiv-local form B.5 pins, `dateAndHourOf`'s literal slice would read
    // hour 14, not 17.
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [request({ id: 1, state: "awaiting_admin" })],
        bookings: [
          booking({
            id: 1,
            request_id: 1,
            status: "pending",
            slot_start: "2026-07-14T14:00:00.000Z",
            slot_end: "2026-07-14T15:00:00.000Z",
          }),
        ],
      },
      TUESDAY_WEEK_START,
    );

    const seatAtIntendedKyivHour = state.hallMap.find((s) => s.weekday === 2 && s.hour === 17);
    const seatAtLiteralSlicedHour = state.hallMap.find((s) => s.weekday === 2 && s.hour === 14);
    expect(seatAtIntendedKyivHour).toBeDefined();
    expect(seatAtLiteralSlicedHour).toBeDefined();

    // Mis-bucketed: the "Z"-suffixed write lands on hour 14's seat, not
    // hour 17's — exactly the silent mis-bucketing the finding warns about.
    expect(seatAtLiteralSlicedHour!.status).not.toBe("free");
    expect(seatAtIntendedKyivHour!.status).toBe("free");
  });
});
