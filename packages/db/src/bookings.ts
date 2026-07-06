// @kamerton/db — minimal `bookings` row helpers (tasks.md 5.5). Plain
// better-sqlite3 (synchronous), no ORM — same discipline as schema.ts.
// Added specifically so the slots slice's real-SQLite integration smoke
// (tests/integration/slots/) has something narrower than raw SQL to call
// for the two operations it needs: inserting a `pending` hold row and
// moving a row to a terminal status. Deliberately minimal — this slice does
// not need reads/finders beyond what the integration test asserts with its
// own `SELECT` (see schema.test.ts's existing style), and does not yet have
// a `request_id` column to join against (that follow-up column lands with
// S2 `intake`, per schema.ts's own comment).

import type Database from "better-sqlite3";
import type { BookingStatus } from "./schema.ts";

export interface InsertBookingInput {
  slotStart: string;
  slotEnd: string;
  status: BookingStatus;
  /** The tentative/confirmed Google Calendar event id backing this row, if
   *  any. `null`/omitted only for rows that never reached the calendar
   *  (not expected on the `pending` happy path — FR-SLOT-02 requires a
   *  `pending` row to always carry the hold's `calendar_event_id`). */
  calendarEventId?: string | null;
  /** S4 `booking-hitl` design.md Decision 4 item 3: closes the documented
   *  gap ("`insertBooking` does NOT persist `request_id`") — `HoldStorePort
   *  .holdSlot` is the first real caller that needs it. Optional so S1's
   *  own tests/fixtures (which never pass one) keep compiling unchanged.
   *
   *  TYPE-ONLY WIDENING (booking-hitl tasks.md B.5/B.6, RED phase): this
   *  field is intentionally NOT yet threaded into `insertBooking`'s
   *  `INSERT` below — a caller passing `requestId` still gets back
   *  `request_id: null` today, by design, so B.5's round-trip assertion
   *  fails at runtime until B.6 wires it in. */
  requestId?: number | null;
}

export interface BookingRow {
  id: number;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  calendar_event_id: string | null;
  created_at: string;
  /** See `InsertBookingInput.requestId`'s comment — always `null` until
   *  B.6 wires the column into `insertBooking`'s `INSERT` statement. */
  request_id: number | null;
}

/**
 * Inserts one `bookings` row and returns it as persisted (including the
 * autoincrement `id` and the DB-computed `created_at`) via `RETURNING *`
 * (TC-DATA-01; better-sqlite3 on SQLite >= 3.35 supports `RETURNING`).
 */
export function insertBooking(db: Database.Database, input: InsertBookingInput): BookingRow {
  return db
    .prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id)
       VALUES (@slot_start, @slot_end, @status, @calendar_event_id)
       RETURNING *`,
    )
    .get({
      slot_start: input.slotStart,
      slot_end: input.slotEnd,
      status: input.status,
      calendar_event_id: input.calendarEventId ?? null,
    }) as BookingRow;
}

/**
 * Moves an existing `bookings` row to a new status (e.g. `pending` ->
 * `cancelled` on a released hold). Returns the number of rows changed (0 if
 * `id` does not exist) — callers that need the row's new state should
 * re-`SELECT` it, same discipline as `insertBooking`'s explicit `RETURNING`.
 */
export function updateBookingStatus(
  db: Database.Database,
  id: number,
  status: BookingStatus,
): number {
  const result = db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).run(status, id);
  return result.changes;
}

/**
 * Returns every `bookings` row for `requestId`, newest first (`id DESC`),
 * `[]` if there are none. Replaces `packages/bot/src/pipeline.ts`'s inline
 * raw SQL (S4 `booking-hitl` design.md Decision 4 item 4) with a shared,
 * tested helper — used by the decision route and the idempotent-delete fix
 * to find every pending booking for a request/lead rather than assuming
 * exactly one.
 *
 * TYPED THROWING STUB — red state for booking-hitl tasks.md B.7; the body
 * is implemented in B.8.
 */
export function findBookingsByRequestId(db: Database.Database, requestId: number): BookingRow[] {
  void db;
  void requestId;
  throw new Error(
    "Not implemented — packages/db/src/bookings.ts findBookingsByRequestId (booking-hitl task B.8)",
  );
}
