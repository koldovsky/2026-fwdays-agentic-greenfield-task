// @kamerton/db — notification outbox (S4 `booking-hitl`, design.md
// Decision 1 / Decision 4 item 1: "a SQLite outbox drained by the bot").
// TYPED THROWING STUB — red state for booking-hitl tasks.md B.3. The types
// and function signatures below are the contract pinned by
// notifications.test.ts; the bodies are implemented in B.4. No logic lives
// here yet — same "single Not-implemented throw" convention as S1's
// grid.ts/hold.ts red rounds (see lib/src/booking/validate-preferences.ts
// for the same-slice precedent).
//
// FIELD/DISCRIMINANT CHOICES made here for the GREEN implementer to honor
// (flagged per booking-hitl tasks.md's own RED-phase instructions):
//   - `kind`/`delivery_status` string literal unions mirror the DDL's CHECK
//     constraints verbatim (design.md Decision 4 item 1).
//   - `payload` is a STRING on both `InsertNotificationInput` and
//     `NotificationRow`: the caller (the dashboard decision route,
//     composing via `lib/src/booking/copy.ts`) already builds the
//     `{ text, buttons? }` shape and is responsible for `JSON.stringify`-ing
//     it before calling `insertNotification` — this mirrors
//     `calendar_event_id`'s "just a column" convention, NOT
//     `requests.offered_slots`'s db-boundary stringify (that field has one
//     fixed array shape coming from a single pure domain concept; a
//     notification's payload shape varies by `kind`, so `packages/db` has
//     no single type to serialize on its behalf).
//   - `delivery_status` is NEVER an insert-time parameter: every row starts
//     `'pending'` via the column's own DB `DEFAULT` (design.md Decision 1's
//     "delivery_status starting pending" wording) — there is no caller in
//     this design that wants to insert a row in any other starting state.
//   - `findDeliverableNotifications` orders by `id ASC` (oldest first): an
//     outbox drain should deliver in creation order (FIFO fairness), unlike
//     `findBookingsByRequestId`'s "newest first" (an admin-UI convention
//     that does not apply to a delivery queue).
//   - `markNotificationDelivered`/`markNotificationFailed` return the
//     changed-row count (0/1), the same convention `updateBookingStatus`/
//     `updateRequestFields` already use — callers re-`SELECT` if they need
//     the row's new state.

import type Database from "better-sqlite3";

export const NOTIFICATION_KINDS = ["confirmed", "declined", "proposed_again"] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = ["pending", "delivered", "failed"] as const;

export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export interface InsertNotificationInput {
  bookingId: number;
  telegramChatId: string;
  kind: NotificationKind;
  /** Already-`JSON.stringify`'d `{ text: string; buttons?: ... }` payload —
   *  see this file's header comment for why packages/db does not serialize
   *  this itself. */
  payload: string;
}

export interface NotificationRow {
  id: number;
  booking_id: number;
  telegram_chat_id: string;
  kind: NotificationKind;
  payload: string;
  delivery_status: NotificationDeliveryStatus;
  created_at: string;
  delivered_at: string | null;
}

/**
 * Inserts one `notifications` row (Decision 1's outbox) and returns it as
 * persisted (`RETURNING *`), `delivery_status` starting `'pending'` via the
 * column's own DB default.
 *
 * TYPED THROWING STUB — see notifications.test.ts (booking-hitl tasks.md
 * B.3) for the pinned contract; implement once that suite is confirmed red.
 */
export function insertNotification(
  db: Database.Database,
  input: InsertNotificationInput,
): NotificationRow {
  return db
    .prepare(
      `INSERT INTO notifications (booking_id, telegram_chat_id, kind, payload)
       VALUES (@booking_id, @telegram_chat_id, @kind, @payload)
       RETURNING *`,
    )
    .get({
      booking_id: input.bookingId,
      telegram_chat_id: input.telegramChatId,
      kind: input.kind,
      payload: input.payload,
    }) as NotificationRow;
}

/**
 * Returns every `pending`/`failed` row (the bot's drain loop's own
 * candidates), ordered oldest-first (`id ASC`), capped at `limit`.
 *
 * TYPED THROWING STUB.
 */
export function findDeliverableNotifications(
  db: Database.Database,
  limit: number,
): NotificationRow[] {
  return db
    .prepare(
      `SELECT * FROM notifications
       WHERE delivery_status IN ('pending', 'failed')
       ORDER BY id ASC
       LIMIT ?`,
    )
    .all(limit) as NotificationRow[];
}

/**
 * Marks one row `'delivered'`, stamping `delivered_at`. Returns the number
 * of rows changed (0 if `id` does not exist), same convention as
 * `updateBookingStatus`.
 *
 * TYPED THROWING STUB.
 */
export function markNotificationDelivered(db: Database.Database, id: number): number {
  const result = db
    .prepare(
      `UPDATE notifications
       SET delivery_status = 'delivered', delivered_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`,
    )
    .run(id);
  return result.changes;
}

/**
 * Marks one row `'failed'` (retried on the drain loop's next tick, no
 * backoff — design.md Risks). Returns the number of rows changed.
 *
 * TYPED THROWING STUB.
 */
export function markNotificationFailed(db: Database.Database, id: number): number {
  const result = db
    .prepare(`UPDATE notifications SET delivery_status = 'failed' WHERE id = ?`)
    .run(id);
  return result.changes;
}
