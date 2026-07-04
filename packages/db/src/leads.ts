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
