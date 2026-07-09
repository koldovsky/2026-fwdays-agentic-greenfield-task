// @kamerton/db — the `messages` row helpers (conversation-history slice).
// Plain better-sqlite3 (synchronous), no ORM — same discipline as the other
// row modules: `RETURNING *` on insert; reads are plain `SELECT`s.
//
// This table is the agent's short-term conversation memory: the free-text
// pipeline (packages/bot/src/pipeline.ts) appends each turn's lead message and
// the reply the lead saw, and replays the recent tail into
// `runIntakeTurn` so the model can accumulate facts a lead gives across
// several terse turns (the experienceComfort two-fact loop) and never
// re-greets a field it already asked — the root fix for loop.ts's documented
// "no conversation history" deferred TODO.

import type Database from "better-sqlite3";

export const MESSAGE_ROLES = ["user", "assistant"] as const;

export type MessageRole = (typeof MESSAGE_ROLES)[number];

export interface InsertMessageInput {
  requestId: number;
  role: MessageRole;
  content: string;
}

export interface MessageRow {
  id: number;
  request_id: number;
  role: MessageRole;
  content: string;
  created_at: string;
}

/**
 * Appends one `messages` row and returns it as persisted (including the
 * autoincrement `id` and the DB-computed `created_at`) via `RETURNING *`.
 */
export function insertMessage(db: Database.Database, input: InsertMessageInput): MessageRow {
  return db
    .prepare(
      `INSERT INTO messages (request_id, role, content)
       VALUES (@request_id, @role, @content)
       RETURNING *`,
    )
    .get({
      request_id: input.requestId,
      role: input.role,
      content: input.content,
    }) as MessageRow;
}

/**
 * Returns the most recent `limit` messages for a request in CHRONOLOGICAL
 * (oldest-first) order — the exact order they must be replayed to the model.
 * The `id DESC ... LIMIT` selects the newest tail (so an old, long
 * conversation stays bounded in tokens); the outer wrapper re-sorts that tail
 * back to ascending so the caller can concatenate it straight onto the
 * current turn's user message.
 */
export function findRecentMessagesForRequest(
  db: Database.Database,
  requestId: number,
  limit: number,
): MessageRow[] {
  return db
    .prepare(
      `SELECT * FROM (
         SELECT * FROM messages WHERE request_id = ? ORDER BY id DESC LIMIT ?
       ) ORDER BY id ASC`,
    )
    .all(requestId, limit) as MessageRow[];
}

/**
 * Returns the FULL transcript for a request in chronological (oldest-first)
 * order — every message, unbounded (unlike `findRecentMessagesForRequest`'s
 * tail cap). The dashboard's per-request transcript view uses this so the
 * teacher sees the whole conversation a lead had, not just the recent tail.
 */
export function findMessagesForRequest(db: Database.Database, requestId: number): MessageRow[] {
  return db
    .prepare(`SELECT * FROM messages WHERE request_id = ? ORDER BY id ASC`)
    .all(requestId) as MessageRow[];
}
