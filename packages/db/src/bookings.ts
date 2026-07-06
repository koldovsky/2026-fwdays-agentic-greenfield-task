// @kamerton/db — minimal `bookings` row helpers (tasks.md 5.5). Plain
// better-sqlite3 (synchronous), no ORM — same discipline as schema.ts.
// Added specifically so the slots slice's real-SQLite integration smoke
// (tests/integration/slots/) has something narrower than raw SQL to call
// for the two operations it needs: inserting a `pending` hold row and
// moving a row to a terminal status. `request_id` (S2 `intake`'s deferred
// column, wired by S4 `booking-hitl` design.md Decision 4 item 3) and
// `findBookingsByRequestId` (Decision 4 item 4) were added once `requests`
// existed and a real caller needed them.

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
   *  own tests/fixtures (which never pass one) keep compiling unchanged and
   *  still get back `request_id: null`. */
  requestId?: number | null;
}

export interface BookingRow {
  id: number;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  calendar_event_id: string | null;
  created_at: string;
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
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (@slot_start, @slot_end, @status, @calendar_event_id, @request_id)
       RETURNING *`,
    )
    .get({
      slot_start: input.slotStart,
      slot_end: input.slotEnd,
      status: input.status,
      calendar_event_id: input.calendarEventId ?? null,
      request_id: input.requestId ?? null,
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
 */
export function findBookingsByRequestId(db: Database.Database, requestId: number): BookingRow[] {
  return db
    .prepare(`SELECT * FROM bookings WHERE request_id = ? ORDER BY id DESC`)
    .all(requestId) as BookingRow[];
}
