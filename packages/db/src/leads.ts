// @kamerton/db — minimal `leads` row helpers (S2 `intake` tasks.md 1.6).
// Plain better-sqlite3 (synchronous), no ORM — same discipline as
// bookings.ts: `RETURNING *` on insert, callers re-`SELECT` after an
// update if they need the row's new state.

import type Database from "better-sqlite3";

export interface InsertLeadInput {
  telegramUserId: string;
  telegramChatId: string;
  /** Auto-captured from the Telegram update, never asked (FR-INTAKE-01). */
  telegramDisplayName?: string | null;
}

export interface LeadRow {
  id: number;
  telegram_user_id: string;
  telegram_chat_id: string;
  telegram_display_name: string | null;
  created_at: string;
}

/**
 * Inserts one `leads` row and returns it as persisted (including the
 * autoincrement `id` and the DB-computed `created_at`) via `RETURNING *`.
 * Throws (SQLite `UNIQUE constraint failed`) if `telegramUserId` already
 * has a lead — callers should look up with `findLeadByTelegramUserId`
 * first (FR-INTAKE-08's "known handle" path).
 */
export function insertLead(db: Database.Database, input: InsertLeadInput): LeadRow {
  return db
    .prepare(
      `INSERT INTO leads (telegram_user_id, telegram_chat_id, telegram_display_name)
       VALUES (@telegram_user_id, @telegram_chat_id, @telegram_display_name)
       RETURNING *`,
    )
    .get({
      telegram_user_id: input.telegramUserId,
      telegram_chat_id: input.telegramChatId,
      telegram_display_name: input.telegramDisplayName ?? null,
    }) as LeadRow;
}

/**
 * Looks up a `leads` row by its Telegram user id (FR-INTAKE-08: distinguish
 * a returning lead from a brand-new one). Returns `undefined` when no such
 * lead exists yet.
 */
export function findLeadByTelegramUserId(
  db: Database.Database,
  telegramUserId: string,
): LeadRow | undefined {
  return db.prepare(`SELECT * FROM leads WHERE telegram_user_id = ?`).get(telegramUserId) as
    | LeadRow
    | undefined;
}

export interface DeleteLeadCascadeResult {
  /** `calendar_event_id` of every `bookings` row that was `pending` (with a
   *  non-null `calendar_event_id`) for this lead BEFORE the delete — the
   *  caller deletes these tentative events from the DEMO Google Calendar as
   *  part of the same admin action (NFR-PRIV-02). */
  deletedPendingEventIds: string[];
}

// TYPED THROWING STUB — red state for `dashboard` tasks.md section 1.2. The
// signature below is the contract pinned by leads.test.ts's
// `deleteLeadCascade` suite; the body is implemented once that suite is
// confirmed red.
//
// SCHEMA CORRECTION (tasks.md 1.2's own text is wrong about this — verified
// against packages/db/src/schema.ts): `requests.lead_id` is `ON DELETE
// CASCADE` (a lead delete does remove its `requests` rows), BUT
// `bookings.request_id` is `ON DELETE SET NULL`, and `bookings` has NO
// direct foreign key to `leads` at all. A plain `DELETE FROM leads` would
// therefore cascade to `requests` but only NULL the lead's bookings'
// `request_id` — the bookings ROWS THEMSELVES would survive, which violates
// NFR-PRIV-02's "all of its bookings rows are deleted". The real
// implementation (tasks.md section 3) must therefore explicitly delete the
// lead's `bookings` rows (joined via `requests.lead_id`) BEFORE deleting the
// `leads` row, rather than relying on the schema's cascades alone.
export function deleteLeadCascade(db: Database.Database, leadId: number): DeleteLeadCascadeResult {
  const run = db.transaction((id: number): DeleteLeadCascadeResult => {
    const pendingEventRows = db
      .prepare(
        `SELECT b.calendar_event_id AS calendar_event_id
         FROM bookings b
         JOIN requests r ON r.id = b.request_id
         WHERE r.lead_id = ?
           AND b.status = 'pending'
           AND b.calendar_event_id IS NOT NULL`,
      )
      .all(id) as { calendar_event_id: string }[];

    db.prepare(
      `DELETE FROM bookings
       WHERE request_id IN (SELECT id FROM requests WHERE lead_id = ?)`,
    ).run(id);

    db.prepare(`DELETE FROM leads WHERE id = ?`).run(id);

    return { deletedPendingEventIds: pendingEventRows.map((row) => row.calendar_event_id) };
  });

  return run(leadId);
}
