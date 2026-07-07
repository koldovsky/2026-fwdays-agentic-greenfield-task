// @kamerton/db — the `questions` row helpers (S5 `kb-learning`, design.md
// Decision 4: "the `questions` table shape and the deterministic-logging
// seam"). Implemented per kb-learning tasks.md A.4 against the contract
// pinned by questions.test.ts (A.3, confirmed red beforehand).
//
// FIELD/DISCRIMINANT CHOICES made here (per kb-learning tasks.md's own
// RED-phase instructions, honored in the implementation below):
//   - `answer_source`/`status`/`delivery_status` string literal unions
//     mirror the DDL's CHECK constraints verbatim (design.md Decision 4).
//   - `status`/`delivery_status` are NEVER insert-time parameters: every row
//     starts `'open'`/`'pending'` via the columns' own DB `DEFAULT`s — the
//     SAME convention `notifications.ts` already established for
//     `delivery_status`, extended here to `status` too, since Decision 4
//     names no caller that ever wants to insert a question in any other
//     starting state.
//   - `findOpenInboxQuestions` orders `created_at DESC` (newest first, per
//     FR-KB-02) — the OPPOSITE convention from `findDeliverableNotifications`
//     /`findDeliverableQuestions`'s oldest-first FIFO, because this is an
//     admin-facing list, not a delivery queue (design.md Decision 4's own
//     note).
//   - `findOpenInboxQuestions`'s visibility rule (design.md Decision 2's
//     closing note): `answer_source = 'unanswered' AND NOT (status =
//     'answered' AND delivery_status = 'delivered')` — an `answer_source =
//     'kb'` row is excluded unconditionally (it never needed admin review);
//     an `answered`+`'failed'`/`'pending'` row stays visible (still
//     "sending…"/needs a retry); only `answered`+`'delivered'` finally
//     leaves the list.
//   - `markQuestionAnswered`/`retryQuestionDelivery`/
//     `markQuestionDeliveryStatus` return the changed-row count (0/1), the
//     same convention `updateBookingStatus`/`markNotificationDelivered`
//     already use — callers re-`SELECT` if they need the row's new state.
//   - `findDeliverableQuestions` is Decision 2's deliberate FORK from
//     `findDeliverableNotifications`: `'pending'`-only, NEVER `'failed'` — a
//     `failed` row re-enters the queue ONLY via `retryQuestionDelivery`
//     (an explicit admin action), never a silent auto-retry.

import type Database from "better-sqlite3";

export const QUESTION_ANSWER_SOURCES = ["kb", "unanswered"] as const;

export type QuestionAnswerSource = (typeof QUESTION_ANSWER_SOURCES)[number];

export const QUESTION_STATUSES = ["open", "answered"] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_DELIVERY_STATUSES = ["pending", "delivered", "failed"] as const;

export type QuestionDeliveryStatus = (typeof QUESTION_DELIVERY_STATUSES)[number];

export interface InsertQuestionInput {
  leadId: number;
  /** Nullable — a question can outlive the specific request it was asked
   *  during (`ON DELETE SET NULL`, design.md Decision 4). */
  requestId?: number | null;
  telegramChatId: string;
  text: string;
  answerSource: QuestionAnswerSource;
}

export interface QuestionRow {
  id: number;
  lead_id: number;
  request_id: number | null;
  telegram_chat_id: string;
  text: string;
  answer_source: QuestionAnswerSource;
  status: QuestionStatus;
  admin_answer: string | null;
  answered_at: string | null;
  delivery_status: QuestionDeliveryStatus;
  created_at: string;
}

/**
 * Inserts one `questions` row and returns it as persisted (`RETURNING *`),
 * `status`/`delivery_status` starting `'open'`/`'pending'` via the columns'
 * own DB defaults (never insert-time parameters).
 */
export function insertQuestion(db: Database.Database, input: InsertQuestionInput): QuestionRow {
  return db
    .prepare(
      `INSERT INTO questions (lead_id, request_id, telegram_chat_id, text, answer_source)
       VALUES (@lead_id, @request_id, @telegram_chat_id, @text, @answer_source)
       RETURNING *`,
    )
    .get({
      lead_id: input.leadId,
      request_id: input.requestId ?? null,
      telegram_chat_id: input.telegramChatId,
      text: input.text,
      answer_source: input.answerSource,
    }) as QuestionRow;
}

/**
 * Returns the open-inbox list (design.md Decision 2's closing note):
 * `answer_source = 'unanswered'` rows that are NOT `answered` +
 * `delivered`, ordered `created_at DESC` (newest first, FR-KB-02).
 */
export function findOpenInboxQuestions(db: Database.Database): QuestionRow[] {
  return db
    .prepare(
      `SELECT * FROM questions
       WHERE answer_source = 'unanswered'
         AND NOT (status = 'answered' AND delivery_status = 'delivered')
       ORDER BY created_at DESC`,
    )
    .all() as QuestionRow[];
}

/**
 * Looks up one `questions` row by id. Returns `undefined` when no such row
 * exists.
 */
export function findQuestionById(db: Database.Database, id: number): QuestionRow | undefined {
  return db.prepare(`SELECT * FROM questions WHERE id = ?`).get(id) as QuestionRow | undefined;
}

/**
 * Marks one `questions` row `'answered'`, guarded `WHERE status = 'open'`
 * (Decision 5's idempotency: a stale re-submit on an already-answered row is
 * a no-op). Sets `admin_answer`/`answered_at`, leaves `delivery_status`
 * unchanged (`'pending'`, so Decision 2's drain loop picks it up). Returns
 * the number of rows changed (0 if `id` does not exist or is not `'open'`).
 */
export function markQuestionAnswered(
  db: Database.Database,
  id: number,
  adminAnswer: string,
): number {
  const result = db
    .prepare(
      `UPDATE questions
       SET status = 'answered',
           admin_answer = @admin_answer,
           answered_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = @id AND status = 'open'`,
    )
    .run({ id, admin_answer: adminAnswer });
  return result.changes;
}

/**
 * Flips one `questions` row's `delivery_status` from `'failed'` back to
 * `'pending'`, guarded `WHERE status = 'answered' AND delivery_status =
 * 'failed'` (design.md Decision 2's named fork from the S4 auto-retry
 * precedent: this is the ONLY way a failed row re-enters the drain queue).
 * A no-op (returns 0) against a `'pending'`/`'delivered'` row or an `open`
 * question.
 */
export function retryQuestionDelivery(db: Database.Database, id: number): number {
  const result = db
    .prepare(
      `UPDATE questions
       SET delivery_status = 'pending'
       WHERE id = ? AND status = 'answered' AND delivery_status = 'failed'`,
    )
    .run(id);
  return result.changes;
}

/**
 * Flips one `questions` row's `delivery_status` to `'delivered'`/`'failed'`,
 * guarded `WHERE status = 'answered'`. Returns the number of rows changed.
 */
export function markQuestionDeliveryStatus(
  db: Database.Database,
  id: number,
  deliveryStatus: Extract<QuestionDeliveryStatus, "delivered" | "failed">,
): number {
  const result = db
    .prepare(
      `UPDATE questions
       SET delivery_status = @delivery_status
       WHERE id = @id AND status = 'answered'`,
    )
    .run({ id, delivery_status: deliveryStatus });
  return result.changes;
}

/**
 * Returns every `status = 'answered' AND delivery_status = 'pending'` row
 * (the bot's drain loop's own candidates), ordered oldest-first (`id ASC`,
 * FIFO). NEVER returns a `delivery_status = 'failed'` row — design.md
 * Decision 2's deliberate fork from `findDeliverableNotifications`'s
 * `IN ('pending','failed')` precedent.
 */
export function findDeliverableQuestions(db: Database.Database): QuestionRow[] {
  return db
    .prepare(
      `SELECT * FROM questions
       WHERE status = 'answered' AND delivery_status = 'pending'
       ORDER BY id ASC`,
    )
    .all() as QuestionRow[];
}
