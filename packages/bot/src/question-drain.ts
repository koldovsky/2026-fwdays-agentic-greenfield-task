// @kamerton/bot — the answer-delivery drain (S5 `kb-learning` tasks.md §D,
// design.md Decision 2: "a new `packages/bot/src/question-drain.ts`,
// structurally a near-twin of `notification-drain.ts`... queries
// `findDeliverableQuestions` — `status='answered' AND delivery_status
// ='pending'` ONLY"). TYPED THROWING STUB — red state for kb-learning
// tasks.md D.1. The signature and return shape below are the contract
// pinned by `question-drain.test.ts`; the body is implemented in D.2. No
// logic lives here yet — same "single Not-implemented throw" convention as
// this slice's own A.4/B.2/B.4/C.9-preceding red-round files and S4's own
// `notification-drain.ts` pre-E.2 header.
//
// FIELD/SHAPE CHOICES made here for the GREEN implementer to honor:
//   - Unlike `notification-drain.ts`, there is no JSON payload column to
//     parse: the message text IS `QuestionRow.admin_answer` and the
//     destination IS `QuestionRow.telegram_chat_id`, both already plain
//     columns (design.md Decision 4) — no `JSON.parse` boundary needed here.
//   - `drainQuestionDeliveries` NEVER throws out of its own promise: an
//     individual `transport.sendMessage` rejection is caught per-row and
//     turned into `markQuestionDeliveryStatus(db, row.id, "failed")`, so one
//     bad send cannot stop the rest of the batch from draining
//     (`@trace NFR-REL-01`).
//   - Return shape mirrors `DrainNotificationsResult` — a small
//     delivered/failed tally rather than `void` — for the same "return
//     something a caller/test can assert on" convention; the D.3 timer
//     wiring can log it, and `question-drain.test.ts` asserts on it
//     directly instead of only re-querying the DB.
//   - `limit` defaults to a value comfortably above single-teacher daily
//     volume, matching `notification-drain.ts`'s own convention and
//     `drainNotifications`'s exact param order/limit shape, so D.3's timer
//     wiring does not need to think about pagination. NOTE for the GREEN
//     implementer: `findDeliverableQuestions` (unlike
//     `findDeliverableNotifications`) takes NO `limit` argument at the SQL
//     layer (`packages/db/src/questions.ts`, already GREEN) — honor this
//     parameter by slicing the returned rows in JS (`rows.slice(0, limit)`),
//     never by editing `questions.ts`.
//   - `findDeliverableQuestions` NEVER returns a `delivery_status='failed'`
//     row (design.md Decision 2's named fork from `notification-drain.ts`'s
//     own `IN ('pending','failed')` — the ONLY path a `failed` row re-enters
//     this drain's queue is `POST /api/questions/[id]/retry`, calling
//     `retryQuestionDelivery`, stage E). This module must never attempt to
//     widen that query, and must never itself flip `'failed'` back to
//     `'pending'`.

import type Database from "better-sqlite3";
import { findDeliverableQuestions, markQuestionDeliveryStatus } from "@kamerton/db";
import type { TelegramTransport } from "./telegram-transport.ts";

export interface DrainQuestionDeliveriesResult {
  delivered: number;
  failed: number;
}

const DEFAULT_DRAIN_LIMIT = 50;

// Same re-entrancy defense as `notification-drain.ts`'s own
// `inFlightNotificationIds` (see that module's header comment for the full
// rationale): two overlapping `drainQuestionDeliveries` calls sharing the
// same `db` (a slow tick's `sendMessage` still in flight when the next timer
// tick fires) must never send the same deliverable row's `sendMessage` more
// than once. Claiming happens synchronously, before the `await
// transport.sendMessage(...)` that could suspend and let a second call's own
// `findDeliverableQuestions` SELECT see the same still-`pending` row; every
// claim is released in a `finally` so it never survives past the call that
// made it.
const inFlightQuestionIds = new Set<number>();

/**
 * Drains every `status='answered' AND delivery_status='pending'`
 * `questions` row (design.md Decision 2): sends `admin_answer` to
 * `telegram_chat_id` via `transport.sendMessage`, then marks the row
 * `'delivered'` on success or `'failed'` on any thrown error — never
 * propagating that error out of this function itself. A `'delivered'` row
 * is never revisited by a later call, and a `'failed'` row is NEVER
 * auto-retried by this drain (`findDeliverableQuestions` never returns it;
 * only the manual `POST /api/questions/[id]/retry` route, stage E, flips it
 * back to `'pending'`).
 *
 * `limit` is honored JS-side (`findDeliverableQuestions` takes no SQL
 * `LIMIT`) by slicing the returned rows, never by editing `questions.ts`.
 */
export async function drainQuestionDeliveries(
  db: Database.Database,
  transport: TelegramTransport,
  limit: number = DEFAULT_DRAIN_LIMIT,
): Promise<DrainQuestionDeliveriesResult> {
  const rows = findDeliverableQuestions(db).slice(0, limit);
  let delivered = 0;
  let failed = 0;

  for (const row of rows) {
    // Claim synchronously, before any `await` in this iteration — a
    // concurrently-running `drainQuestionDeliveries` call whose own SELECT
    // already returned this same row will see it here and skip it.
    if (inFlightQuestionIds.has(row.id)) continue;
    inFlightQuestionIds.add(row.id);

    try {
      await transport.sendMessage(row.telegram_chat_id, row.admin_answer ?? "");
      markQuestionDeliveryStatus(db, row.id, "delivered");
      delivered += 1;
    } catch {
      markQuestionDeliveryStatus(db, row.id, "failed");
      failed += 1;
    } finally {
      inFlightQuestionIds.delete(row.id);
    }
  }

  return { delivered, failed };
}
