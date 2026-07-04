// Table DDL for @kamerton/db (TC-DATA-01). Plain better-sqlite3 (synchronous),
// no ORM — each `CREATE TABLE IF NOT EXISTS` is idempotent so it is safe to
// call on every process start.

import type Database from "better-sqlite3";

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// bookings — this slice (S1 `slots`) owns only the columns it needs to prove
// FR-SLOT-02's tentative-hold lifecycle: no `request_id` column yet, because
// the `requests` table (the intake profile, FR-INTAKE-08) does not exist
// until S2 `intake` lands. S2's own schema task adds `request_id` as a
// follow-up column (cheap `ALTER TABLE ADD COLUMN` on SQLite) once `requests`
// exists — see openspec/changes/slots/design.md Decision 2. Until then a
// `pending` row here is not linked to any lead.
const CREATE_BOOKINGS_TABLE = `
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_start TEXT NOT NULL,
  slot_end TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  calendar_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

// Defense-in-depth backstop for the hold TOCTOU window (review-gate S1
// finding): the primary double-booking guard is the calendar-side freeBusy
// re-check in lib/src/slots/hold.ts, but if two concurrent holds both pass
// it, the DB itself rejects the second pending row for the same interval.
const CREATE_PENDING_SLOT_UNIQUE_INDEX = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_pending_slot
  ON bookings(slot_start, slot_end) WHERE status = 'pending';
`;

/**
 * Create every table this module owns if it doesn't already exist. Safe to
 * call repeatedly (idempotent) — e.g. once per process start, before any
 * other module touches the database.
 */
export function initSchema(db: Database.Database): void {
  db.exec(CREATE_BOOKINGS_TABLE);
  db.exec(CREATE_PENDING_SLOT_UNIQUE_INDEX);
}
