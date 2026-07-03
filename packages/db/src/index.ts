// @kamerton/db — the only SQLite touchpoint (TC-DATA-01, NFR-PRIV-01).
// Tables arrive with their slices: leads, requests (intake profile lives
// here, FR-INTAKE-08), bookings (status: pending/confirmed/declined/cancelled),
// questions (FR-KB-01). The *.db file is gitignored.

import Database from "better-sqlite3";
import { initSchema } from "./schema.js";

export { initSchema, BOOKING_STATUSES, type BookingStatus } from "./schema.js";

/**
 * Open (or create) the SQLite database file at `path` and ensure every table
 * this module owns exists. Pass `:memory:` for tests. Synchronous, no ORM —
 * plain better-sqlite3 (TC-DATA-01).
 */
export function openDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  return db;
}
