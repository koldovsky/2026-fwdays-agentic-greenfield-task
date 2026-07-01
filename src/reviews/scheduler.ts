import { schedule as cronSchedule, type ScheduledTask } from 'node-cron';
import { addDays, localDateString } from '../router/date.js';
import { systemNow, toDbDate } from '../util/date.js';
import { errorMessage } from '../util/error.js';
import { localHour } from './compute.js';
import { deliverReview } from './service.js';
import type { ReviewClient, ReviewService } from './types.js';

// Midnight cron fallback (design D1, ADR-0020): ONE hourly job sweeps every user; a user whose LOCAL
// hour just crossed 00 has a finished day (their local yesterday) — if no daily `reviews` row exists
// for it, generate it (reviewed_flag = false) and push it proactively. Idempotency (the unique key +
// upsert), not the clock, prevents doubles, so a missed/double tick self-heals. Each user is wrapped
// in try/catch so one failure never aborts the sweep; warn-log without raw body values (invariant #9).
// The clock and the cron scheduler are injected so the sweep is unit-testable without real timers.
// Edge: a zone that shifts its clock ACROSS local midnight (rare DST rules) can skip local hour 0 for
// one day — that day's fallback is missed (manual /done still covers it); acceptable per ADR-0020.

export type SendFn = (chatId: bigint, text: string) => Promise<unknown>;

export interface SchedulerOptions {
  now?: () => Date;
  schedule?: typeof cronSchedule;
}

const CRON_HOURLY = '0 * * * *';

/** One sweep pass: generate + send the finished day's review for every user at their local midnight. */
export const sweepReviews = async (
  service: ReviewService,
  client: ReviewClient,
  send: SendFn,
  now: () => Date,
): Promise<void> => {
  const users = await client.user.findMany({
    select: { id: true, chatId: true, tz: true },
  });

  for (const user of users) {
    try {
      if (localHour(now(), user.tz) !== 0) {
        continue;
      }
      const finishedDay = addDays(localDateString(now(), user.tz), -1);
      const existing = await client.review.findUnique({
        where: {
          userId_period_periodStart: {
            userId: user.id,
            period: 'daily',
            periodStart: toDbDate(finishedDay),
          },
        },
      });
      if (existing) {
        continue;
      }

      const result = await service.generateDaily(user.chatId, {
        date: finishedDay,
        reviewed: false,
      });
      if (result) {
        await deliverReview((text) => send(user.chatId, text), result);
      }
    } catch (error) {
      console.warn(`review sweep failed for user ${user.id}: ${errorMessage(error)}`);
    }
  }
};

/** Start the hourly review sweep. Returns the scheduled task (for shutdown); clock/cron injectable. */
export const startReviewScheduler = (
  service: ReviewService,
  client: ReviewClient,
  send: SendFn,
  options: SchedulerOptions = {},
): ScheduledTask => {
  const now = options.now ?? systemNow;
  const schedule = options.schedule ?? cronSchedule;

  return schedule(CRON_HOURLY, () => {
    void sweepReviews(service, client, send, now);
  });
};
