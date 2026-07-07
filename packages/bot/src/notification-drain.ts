// @kamerton/bot — the outbox drain (S4 `booking-hitl` tasks.md §E, design.md
// Decision 1: "the bot's `packages/bot/src/index.ts` gains a short-interval
// timer... that drains deliverable rows, calls `transport.sendMessage`, and
// marks each row `delivered` or `failed`. A `failed` row is retried on the
// next tick"). TYPED THROWING STUB — red state for booking-hitl tasks.md
// E.1. The signature and return shape below are the contract pinned by
// `notification-drain.test.ts`; the body is implemented in E.2. No logic
// lives here yet — same "single Not-implemented throw" convention as this
// slice's other red-round files (`lib/src/booking/validate-preferences.ts`,
// `packages/db/src/notifications.ts`'s own pre-B.4 header).
//
// FIELD/SHAPE CHOICES made here for the GREEN implementer to honor:
//   - `NotificationRow.payload` is a pre-`JSON.stringify`'d string of
//     `{ text: string; buttons?: SendMessageOptions["buttons"] }` (design.md
//     Decision 1 / Decision 4 item 1's DDL comment: "JSON: { text, buttons?}
//     (buttons only for proposed_again)"). This module parses it with
//     `JSON.parse`, the same boundary convention `requests.ts`'s
//     `parseOfferedSlots` already uses for its own JSON-in-TEXT column.
//   - `drainNotifications` NEVER throws out of its own promise: an
//     individual `transport.sendMessage` rejection is caught per-row and
//     turned into `markNotificationFailed`, so one bad send (or one bad
//     JSON payload) cannot stop the rest of the batch from draining
//     (`@trace NFR-REL-01`).
//   - Return shape is a small delivered/failed tally (`DrainNotificationsResult`)
//     rather than `void`, mirroring `insertLead`/`markNotificationDelivered`'s
//     own "return something a caller/test can assert on" convention — the
//     E.3 timer wiring can log it, and `notification-drain.test.ts` asserts
//     on it directly instead of only re-querying the DB.
//   - `limit` defaults to a value comfortably above single-teacher daily
//     volume (design.md Risks: "a handful of decisions per day") so the
//     timer wiring (E.3) does not need to think about pagination.

import type Database from "better-sqlite3";
import {
  findDeliverableNotifications,
  markNotificationDelivered,
  markNotificationFailed,
} from "@kamerton/db";
import type { TelegramTransport, SendMessageOptions } from "./telegram-transport.ts";

/** The parsed shape of a `NotificationRow.payload` string (design.md
 *  Decision 4 item 1's DDL comment: `JSON: { text, buttons? }`). Declared
 *  locally rather than imported from `@kamerton/db` — `packages/db` never
 *  parses this column itself (see `notifications.ts`'s own header: "a
 *  notification's payload shape varies by `kind`, so `packages/db` has no
 *  single type to serialize on its behalf"). */
export interface NotificationPayload {
  text: string;
  buttons?: SendMessageOptions["buttons"];
}

export interface DrainNotificationsResult {
  delivered: number;
  failed: number;
}

const DEFAULT_DRAIN_LIMIT = 50;

// Review-gate finding #2 [MAJOR]: two overlapping `drainNotifications` calls
// sharing the SAME `db` (e.g. a slow tick's `sendMessage` still in flight
// when the next timer tick fires) must never send the same deliverable row's
// `sendMessage` more than once. Nothing in the `notifications` table itself
// marks a row "claimed" until its OWN send resolves (`markNotificationDelivered`/
// `markNotificationFailed` only run AFTER `await transport.sendMessage(...)`
// settles) — so a naive re-entrant call's own `findDeliverableNotifications`
// SELECT sees the exact same still-`pending` row and re-sends it.
//
// Fix: a module-scoped in-memory "in-flight" set, keyed by row id. Claiming a
// row (adding its id to this set) happens SYNCHRONOUSLY, in the same
// synchronous stretch of the loop as the `SELECT` that found it — i.e.
// BEFORE the `await transport.sendMessage(...)` that could suspend and let a
// second `drainNotifications` call's own SELECT run. A second call's loop
// then skips any row id already claimed by an in-flight first call, and
// every claim is released in a `finally` (delivered, failed, OR a thrown
// error) so a claim never survives past the call that made it — even a
// module-level lock like this is process-local and does not protect two
// separate OS processes hitting the same SQLite file (out of scope here:
// this bot runs a single long-polling process, design.md Decision 1).
const inFlightNotificationIds = new Set<number>();

/**
 * Drains every `pending`/`failed` `notifications` row: sends `payload.text`
 * (plus `payload.buttons` when present) via `transport.sendMessage`, then
 * marks the row `delivered` on success or `failed` on any thrown error —
 * never propagating that error out of this function itself. A `delivered`
 * row is never revisited by a later call (`findDeliverableNotifications`
 * only ever returns `pending`/`failed` rows).
 *
 * A malformed (non-JSON) payload is treated the same as a failed send —
 * marked `failed` and the loop continues (`@trace NFR-REL-01`): one bad row
 * must never stop the rest of the batch from draining.
 *
 * Two overlapping calls sharing the same `db` never double-send the same
 * row (review-gate finding #2, `@trace NFR-REL-01`) — see
 * `inFlightNotificationIds`'s own comment above for the claiming mechanism.
 */
export async function drainNotifications(
  db: Database.Database,
  transport: TelegramTransport,
  limit: number = DEFAULT_DRAIN_LIMIT,
): Promise<DrainNotificationsResult> {
  const rows = findDeliverableNotifications(db, limit);
  let delivered = 0;
  let failed = 0;

  for (const row of rows) {
    // Claim synchronously, before any `await` in this iteration — a
    // concurrently-running `drainNotifications` call whose own SELECT
    // already returned this same row will see it here and skip it.
    if (inFlightNotificationIds.has(row.id)) continue;
    inFlightNotificationIds.add(row.id);

    try {
      const { text, buttons }: NotificationPayload = JSON.parse(row.payload);
      await transport.sendMessage(row.telegram_chat_id, text, buttons ? { buttons } : undefined);
      markNotificationDelivered(db, row.id);
      delivered += 1;
    } catch {
      markNotificationFailed(db, row.id);
      failed += 1;
    } finally {
      inFlightNotificationIds.delete(row.id);
    }
  }

  return { delivered, failed };
}
