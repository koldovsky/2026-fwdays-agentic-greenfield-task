import { tenantWhere } from '../db/tenancy.js';
import type { ReviewClient, ReviewPeriod } from './types.js';

// Idempotent persistence (§review-generation, PRD M4: no doubles). The unique
// `(user_id, period, period_start)` key + upsert make a manual `/done` and the midnight sweep
// converge on ONE row — a re-trigger updates in place, never duplicates. Tenant-scoped both legs
// (invariant #8): `create` injects `user_id` via tenantWhere; `where` keys on it.

/** Returns the persisted row's id so the caller can enqueue a Notion mirror job for it (US-10). */
export const upsertReview = async (
  client: ReviewClient,
  userId: number,
  period: ReviewPeriod,
  periodStart: Date,
  periodEnd: Date,
  body: string,
  reviewedFlag: boolean,
): Promise<number> => {
  const review = await client.review.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    create: tenantWhere(userId, { period, periodStart, periodEnd, body, reviewedFlag }),
    update: { periodEnd, body, reviewedFlag },
    select: { id: true },
  });

  return review.id;
};
