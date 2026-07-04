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

// requests.state — the *conversation* state machine (S2 `intake`,
// design.md Decision 1/4), deliberately not named `status` so it is never
// confused with `bookings.status` above.
export const REQUEST_STATES = [
  "greeting",
  "qualifying",
  "profiling",
  "collecting",
  "proposing",
  "awaiting_admin",
  "done",
  "soft_decline",
] as const;

export type RequestState = (typeof REQUEST_STATES)[number];

export const REQUEST_FORMATS = ["individual", "group"] as const;

export type RequestFormat = (typeof REQUEST_FORMATS)[number];

export const REQUEST_GOAL_TAGS = [
  "karaoke",
  "performance",
  "confidence",
  "hobby",
  "other",
] as const;

export type RequestGoalTag = (typeof REQUEST_GOAL_TAGS)[number];

// bookings — this slice (S1 `slots`) originally owned only the columns it
// needed to prove FR-SLOT-02's tentative-hold lifecycle; `request_id` was
// deliberately deferred because the `requests` table (the intake profile,
// FR-INTAKE-08) did not exist yet. S2 `intake` (openspec/changes/intake/
// design.md Decision 4) now adds `request_id` below via `initSchema()`'s
// `ensureBookingsRequestIdColumn()` follow-up step, once `requests` exists.
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

// leads — identity only (S2 `intake`, design.md Decision 4). The literal
// brief's first pass proposed name/age/format live here, but FR-INTAKE-08's
// own sibling scenario ("a parent books for child A, later for child B, both
// requests intact with their own name/age") only holds if the profile lives
// on `requests` instead — putting it here would let child B's answers
// overwrite child A's. Deviation recorded deliberately in design.md.
const CREATE_LEADS_TABLE = `
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL UNIQUE,
  telegram_chat_id TEXT NOT NULL,
  telegram_display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

// requests — the full intake profile per lead-conversation (FR-INTAKE-08:
// each request carries its own student_name/student_age/etc., independent
// of any sibling request from the same lead). `telegram_chat_id` is
// denormalized from `leads` at creation time so S4/S5 can message a lead by
// joining only on `requests`. `ON DELETE CASCADE` on `lead_id` makes the
// NFR-PRIV-02 delete-lead admin action's cascade a schema fact.
const CREATE_REQUESTS_TABLE = `
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'greeting'
    CHECK (state IN ('greeting','qualifying','profiling','collecting',
                      'proposing','awaiting_admin','done','soft_decline')),
  student_name TEXT,
  student_age INTEGER,
  format TEXT CHECK (format IN ('individual','group')),
  goal_tag TEXT CHECK (goal_tag IN ('karaoke','performance','confidence','hobby','other')),
  goal_text TEXT,
  tastes TEXT,
  dream_song TEXT,
  experience TEXT,
  comfort TEXT,
  preferred_weekdays TEXT,
  preferred_time_range TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

const CREATE_REQUESTS_LEAD_ID_INDEX = `
CREATE INDEX IF NOT EXISTS idx_requests_lead_id ON requests(lead_id);
`;

/**
 * Adds `bookings.request_id` once `requests` exists (S1's deferred column,
 * owned by S2 per schema.ts's own historical comment above).
 *
 * Deviation from the literal tasks.md wording ("ALTER TABLE ... ADD COLUMN
 * IF NOT EXISTS"): verified empirically against the bundled
 * better-sqlite3@12.11.1 / SQLite 3.53.2 that SQLite's ALTER TABLE grammar
 * has no `IF NOT EXISTS` clause for `ADD COLUMN` (only `CREATE TABLE`/
 * `CREATE INDEX` support it) — running it throws a syntax error, not a
 * no-op. Idempotency is instead achieved the same way better-sqlite3 users
 * commonly do it: check `PRAGMA table_info` first and only run the `ALTER
 * TABLE` when the column is actually missing, preserving `initSchema()`'s
 * "safe to call on every process start" guarantee.
 *
 * `ON DELETE SET NULL` (not CASCADE, design.md Decision 4): a booking is
 * calendar-linked audit evidence for FR-GUARD-01 that outlives the request
 * that spawned it — deleting a `requests` row only severs the link, it does
 * not remove the booking. Full lead erasure (removing the booking row too)
 * is the dashboard's delete-lead admin action (S3), a multi-statement
 * application operation, not a DB-level cascade.
 */
function ensureBookingsRequestIdColumn(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(bookings)").all() as Array<{ name: string }>;
  const hasRequestId = columns.some((column) => column.name === "request_id");
  if (!hasRequestId) {
    db.exec(
      `ALTER TABLE bookings ADD COLUMN request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;`,
    );
  }
}

/**
 * Create every table this module owns if it doesn't already exist. Safe to
 * call repeatedly (idempotent) — e.g. once per process start, before any
 * other module touches the database.
 */
export function initSchema(db: Database.Database): void {
  db.exec(CREATE_BOOKINGS_TABLE);
  db.exec(CREATE_PENDING_SLOT_UNIQUE_INDEX);
  db.exec(CREATE_LEADS_TABLE);
  db.exec(CREATE_REQUESTS_TABLE);
  db.exec(CREATE_REQUESTS_LEAD_ID_INDEX);
  ensureBookingsRequestIdColumn(db);
}
