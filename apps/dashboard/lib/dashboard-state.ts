// apps/dashboard — the PURE state-assembly layer (dashboard tasks.md §5.2,
// design.md Decision 3: "server-only glue... stays in apps/dashboard, never
// in lib/"). Takes plain `leads`/`requests`/`bookings` row arrays (whatever
// `dashboard-db.ts`, §5.5, actually reads from SQLite) and assembles the
// `DashboardState` the SSE stream's `STATE_SNAPSHOT` frame carries and the
// UI (section 6, not this pass) renders from.
//
// `DashboardBookingRow` extends `@kamerton/db`'s `BookingRow` with
// `request_id` — the column `packages/db/src/schema.ts`'s
// `ensureBookingsRequestIdColumn()` adds at the SQL level (S2 `intake`
// design.md Decision 4), but `BookingRow`'s own TS interface (`bookings.ts`)
// predates that column and was never updated to include it (a real,
// pre-existing gap in `@kamerton/db`, not something this slice invented) —
// `dashboard-db.ts`'s raw `SELECT *` will actually return the column, so this
// extension is the accurate row shape this layer receives, not a guess.

import type { BookingRow, LeadRow, MessageRole, MessageRow, RequestRow } from "@kamerton/db";
import { compileFirstLessonBrief } from "@kamerton/lib/src/intake/first-lesson-brief.ts";
import { hallSeatStatus, type SeatStatus } from "@kamerton/lib/src/dashboard/hall-status.ts";
import { weekSeatGrid, type SeatCoordinate } from "@kamerton/lib/src/dashboard/week-grid.ts";

/** See this file's header comment: `BookingRow` plus the `request_id` column
 *  its own TS interface omits. */
export type DashboardBookingRow = BookingRow & { request_id: number | null };

export interface DashboardRows {
  leads: LeadRow[];
  requests: RequestRow[];
  bookings: DashboardBookingRow[];
  /** The persisted `messages` transcript rows for (at least) every ACTIVE
   *  request — the source for `DashboardState.conversationMessages`. Optional
   *  so existing pure-assembly tests that don't exercise transcripts can omit
   *  it (treated as `[]`); the live read (`dashboard-db.ts`) always supplies
   *  the active requests' rows. */
  messages?: MessageRow[];
}

/** One transcript line as the dashboard's live "Розмови" panel needs it — the
 *  wire subset of a `MessageRow` (role + content), dropped ids/timestamps. */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
}

/** One pending request in the admin queue (baseline spec's DecisionBar
 *  queue) — the request's own collected fields plus its compiled
 *  first-lesson brief (`compileFirstLessonBrief`, reused from `lib/`, never
 *  duplicated) and the tentative booking backing it. */
export interface PendingQueueEntry {
  requestId: number;
  leadId: number;
  telegramChatId: string;
  studentName: string | null;
  studentAge: number | null;
  brief: string;
  bookingId: number;
  calendarEventId: string | null;
  slotStart: string;
  slotEnd: string;
}

/** One HallMap seat, its fixed grid position (`lib/`'s `SeatCoordinate`) plus
 *  its precedence-resolved rendered status (`lib/`'s `hallSeatStatus`). */
export interface HallMapSeat extends SeatCoordinate {
  status: SeatStatus;
  /** The student on the seat's precedence-WINNING booking (confirmed >
   *  pending) — so the HallMap hover tooltip can reveal WHO is booked, for
   *  confirmed seats too, not only pending ones. `null`/absent for a free seat,
   *  a cancelled-only seat, or a booking whose student name isn't known yet. */
  occupantName?: string | null;
}

/** One confirmed booking, for the dashboard's confirmed-bookings section —
 *  it carries the slot's date/time (which the pending queue shows but a
 *  confirmed booking otherwise loses, since it leaves the queue the moment
 *  it's confirmed) plus the student it's for. */
export interface ConfirmedBooking {
  requestId: number;
  studentName: string | null;
  studentAge: number | null;
  slotStart: string;
  slotEnd: string;
}

/** The assembled shape a `STATE_SNAPSHOT` AG-UI event carries and the
 *  dashboard UI renders from (design.md's AG-UI contract). */
export interface DashboardState {
  /** Every non-terminal (`requests.state` not `'done'`/`'soft_decline'`)
   *  request row — the conversation panel/`RequestCard`'s data source
   *  (section 6, not this pass). */
  activeRequests: RequestRow[];
  /** `awaiting_admin`-state requests with a `pending` booking — the
   *  DecisionBar queue (FR-DASH-01). */
  pendingQueue: PendingQueueEntry[];
  /** The current week's HallMap seats, each resolved via `hallSeatStatus`
   *  (FR-DASH-03). Exactly 5 weekdays x 10 hourly-start seats
   *  (`weekSeatGrid`'s own contract), in `weekSeatGrid`'s order. */
  hallMap: HallMapSeat[];
  /** Each ACTIVE request's durable conversation transcript, keyed by its
   *  Telegram chat id (the conversation panel's `threadId`), oldest-first —
   *  so the live "Розмови" panel can be rehydrated from SQLite on a page
   *  reload rather than going blank until the next live SSE turn (the AG-UI
   *  stream only carries messages sent while a tab is open). A thread with no
   *  persisted messages yet simply has no entry. */
  conversationMessages: Record<string, ConversationMessage[]>;
  /** Every confirmed booking, sorted by slot start (chronological) — the
   *  confirmed-bookings section's data source. Not week-scoped (unlike
   *  `hallMap`): the teacher sees every confirmed lesson with its date/time. */
  confirmedBookings: ConfirmedBooking[];
}

const TERMINAL_REQUEST_STATES = new Set(["done", "soft_decline"]);

/** "YYYY-MM-DDTHH:mm:ss[+offset|Z]" (or any prefix-compatible ISO string) ->
 *  its "YYYY-MM-DD" calendar-date and hour-of-day components, read as
 *  literal characters (never parsed through `Date`/a timezone library) —
 *  `bookings.slot_start`/`slot_end` are already Europe/Kyiv wall-clock
 *  timestamps (BC-SCHEDULE-01), so slicing the string is the correct,
 *  timezone-safe way to recover "which HallMap seat is this". */
function dateAndHourOf(isoLike: string): { dateStr: string; hour: number } {
  return { dateStr: isoLike.slice(0, 10), hour: Number(isoLike.slice(11, 13)) };
}

/** Builds a "YYYY-MM-DD" -> ISO weekday (1 = Monday .. 5 = Friday) lookup for
 *  the target week's 5 weekdays, derived from `weekSeatGrid`'s own seats so
 *  the date span this function uses to bucket bookings can never drift from
 *  the grid's own week-boundary logic. */
function weekdayByDate(seats: SeatCoordinate[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const seat of seats) {
    map.set(seat.slotStartIso.slice(0, 10), seat.weekday);
  }
  return map;
}

/**
 * Assembles a `DashboardState` from plain row arrays — PURE, no I/O of its
 * own (the actual `better-sqlite3` read is `dashboard-db.ts`'s job, §5.5).
 * `weekStartIso` is an explicit "YYYY-MM-DD" argument (never
 * `Date.now()`-derived here either — same purity discipline as `lib/`'s own
 * `weekSeatGrid`) so this function is deterministically testable for any
 * week.
 */
export function buildStateSnapshot(rows: DashboardRows, weekStartIso: string): DashboardState {
  const activeRequests = rows.requests.filter((request) => !TERMINAL_REQUEST_STATES.has(request.state));

  const pendingQueue: PendingQueueEntry[] = [];
  for (const request of rows.requests) {
    if (request.state !== "awaiting_admin") continue;
    const booking = rows.bookings.find(
      (b) => b.request_id === request.id && b.status === "pending",
    );
    if (booking === undefined) continue;

    pendingQueue.push({
      requestId: request.id,
      leadId: request.lead_id,
      telegramChatId: request.telegram_chat_id,
      studentName: request.student_name,
      studentAge: request.student_age,
      brief: compileFirstLessonBrief(request),
      bookingId: booking.id,
      calendarEventId: booking.calendar_event_id,
      slotStart: booking.slot_start,
      slotEnd: booking.slot_end,
    });
  }

  const requestById = new Map<number, RequestRow>();
  for (const request of rows.requests) requestById.set(request.id, request);

  /** The student name on a booking, via its request row (`null` when the
   *  request is unknown — e.g. `request_id` set null after a lead delete). */
  function studentNameOf(booking: DashboardBookingRow): string | null {
    return booking.request_id !== null ? (requestById.get(booking.request_id)?.student_name ?? null) : null;
  }

  const seats = weekSeatGrid(weekStartIso);
  const weekdayForDate = weekdayByDate(seats);

  const bookingsBySeatKey = new Map<
    string,
    { status: DashboardBookingRow["status"]; studentName: string | null }[]
  >();
  for (const booking of rows.bookings) {
    const { dateStr, hour } = dateAndHourOf(booking.slot_start);
    const weekday = weekdayForDate.get(dateStr);
    if (weekday === undefined) continue; // outside this week's Mon-Fri span
    const key = `${weekday}-${hour}`;
    const bucket = bookingsBySeatKey.get(key) ?? [];
    bucket.push({ status: booking.status, studentName: studentNameOf(booking) });
    bookingsBySeatKey.set(key, bucket);
  }

  const hallMap: HallMapSeat[] = seats.map((seat) => {
    const key = `${seat.weekday}-${seat.hour}`;
    const seatBookings = bookingsBySeatKey.get(key) ?? [];
    const status = hallSeatStatus(seatBookings);
    // The occupant is the student on the booking whose status WON the seat's
    // precedence (confirmed, else pending) — so the tooltip name always matches
    // the colour shown. Free/cancelled seats name nobody.
    const occupantName =
      status === "confirmed" || status === "pending"
        ? (seatBookings.find((b) => b.status === status)?.studentName ?? null)
        : null;
    return { ...seat, status, occupantName };
  });

  const confirmedBookings: ConfirmedBooking[] = rows.bookings
    .filter((booking) => booking.status === "confirmed")
    .map((booking) => ({
      requestId: booking.request_id ?? 0,
      studentName: studentNameOf(booking),
      studentAge: booking.request_id !== null ? (requestById.get(booking.request_id)?.student_age ?? null) : null,
      slotStart: booking.slot_start,
      slotEnd: booking.slot_end,
    }))
    .sort((a, b) => (a.slotStart < b.slotStart ? -1 : a.slotStart > b.slotStart ? 1 : 0));

  // Group each ACTIVE request's transcript under its Telegram chat id. Only
  // active requests are keyed (the live panel shows active conversations); a
  // closed request's full transcript stays reachable via the pending-card's
  // on-demand `/api/requests/:id/messages` route. `messages` is already
  // oldest-first from the read layer (`findMessagesForRequest`'s `ORDER BY id
  // ASC`), so a stable-sort push preserves that order.
  const threadIdByRequestId = new Map<number, string>();
  for (const request of activeRequests) threadIdByRequestId.set(request.id, request.telegram_chat_id);
  const conversationMessages: Record<string, ConversationMessage[]> = {};
  for (const row of rows.messages ?? []) {
    const threadId = threadIdByRequestId.get(row.request_id);
    if (threadId === undefined) continue; // message for a non-active (or unknown) request
    (conversationMessages[threadId] ??= []).push({ role: row.role, content: row.content });
  }

  return { activeRequests, pendingQueue, hallMap, conversationMessages, confirmedBookings };
}
