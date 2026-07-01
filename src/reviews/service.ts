import type Anthropic from '@anthropic-ai/sdk';
import type { BodyMetric } from '@prisma/client';
import { resolveUserId } from '../db/resolveUser.js';
import { round1 } from '../food/scale.js';
import { priorHistory } from '../metrics/trend.js';
import { dailyTotalsForRange, sumForDate } from '../query/aggregate.js';
import type { DayTotalsRow, Targets } from '../query/types.js';
import { resolveDate } from '../router/date.js';
import { toDbDate } from '../util/date.js';
import { detectLang } from '../util/lang.js';
import { dailyFoodMeta, metricsInRange, summarizeMetric } from './aggregate.js';
import {
  average,
  countFatOk,
  countProteinHits,
  countWeekProteinHits,
  daysInMonth,
  groupIntoWeeks,
  isLastDayOfMonth,
  isSunday,
  monthParts,
  monthRange,
  weekRange,
} from './compute.js';
import { generateReviewProse } from './generate.js';
import { buildPrompt } from './prompt.js';
import { renderReview } from './render.js';
import type {
  DailyStats,
  GenerateOptions,
  MonthlyStats,
  ProseGenerator,
  ReviewClient,
  ReviewResult,
  ReviewService,
  WeeklyStats,
} from './types.js';
import { upsertReview } from './write.js';

// Review orchestration (design D6/D7): resolve tenant → compute NUMBERS in code from the SQL SUM /
// groupBy + body-metrics reads (invariants #1/#2) → ONE prose call (invariant #5, skipped entirely
// for an empty period so cost is zero) → deterministic render → idempotent upsert. A generated daily
// on a Sunday also rolls up the week; on a month-end, the month — numbers always from raw rows, never
// from prior review prose. Every read/write is tenant-scoped (invariant #8). `generateProse` and the
// clock are injected so tests can spy the call count and drive boundaries without real timers.

export interface ReviewDeps {
  anthropic: Anthropic;
  generateProse?: ProseGenerator;
  now?: () => Date;
}

interface Profile {
  tz: string;
  targets: Targets;
}

const loadProfile = async (client: ReviewClient, userId: number): Promise<Profile | null> => {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      tz: true,
      targetKcal: true,
      targetProteinG: true,
      targetFatG: true,
      targetCarbsG: true,
    },
  });
  if (!user) {
    return null;
  }

  return {
    tz: user.tz,
    targets: {
      kcal: user.targetKcal,
      proteinG: user.targetProteinG === null ? null : Number(user.targetProteinG),
      fatG: user.targetFatG === null ? null : Number(user.targetFatG),
      carbsG: user.targetCarbsG === null ? null : Number(user.targetCarbsG),
    },
  };
};

const rangeDelta = (start: number | null, end: number | null): number | null =>
  start === null || end === null ? null : round1(end - start);

/**
 * Deliver a review result through a text sink (a chat reply or a proactive send): the daily body
 * first, then each rollup in order. One home so the `/done`, `review_trigger`, and cron paths all
 * surface the weekly/monthly the user earned — not just the daily (they are separate messages).
 */
export const deliverReview = async (
  send: (text: string) => Promise<unknown>,
  result: ReviewResult,
): Promise<void> => {
  await send(result.text);
  for (const rollup of result.rollups) {
    await send(rollup);
  }
};

export const createReviewsService = (client: ReviewClient, deps: ReviewDeps): ReviewService => {
  const now = deps.now ?? ((): Date => new Date());
  const generateProse: ProseGenerator =
    deps.generateProse ??
    ((period, promptText) => generateReviewProse(deps.anthropic, period, promptText));

  // The three period reads both rollups share — issued in parallel (independent queries).
  const loadPeriodReads = (
    userId: number,
    start: string,
    end: string,
  ): Promise<[DayTotalsRow[], BodyMetric[], BodyMetric[]]> =>
    Promise.all([
      dailyTotalsForRange(client, userId, start, end),
      metricsInRange(client, userId, start, end),
      priorHistory(client, userId, toDbDate(start)),
    ]);

  const buildDaily = async (
    userId: number,
    dateIso: string,
    targets: Targets,
    lang: ReturnType<typeof detectLang>,
    reviewed: boolean,
  ): Promise<string> => {
    const totals = await sumForDate(client, userId, dateIso);
    const meta = await dailyFoodMeta(client, userId, dateIso);
    const stats: DailyStats = {
      period: 'daily',
      date: dateIso,
      totals,
      targets,
      meals: meta.meals,
      entryCount: totals.entryCount,
      estimateCount: meta.estimateCount,
      empty: totals.entryCount === 0,
    };

    const prose = stats.empty ? {} : await generateProse('daily', buildPrompt(stats, lang));
    const body = renderReview(stats, prose, lang);
    await upsertReview(
      client,
      userId,
      'daily',
      toDbDate(dateIso),
      toDbDate(dateIso),
      body,
      reviewed,
    );

    return body;
  };

  const buildWeekly = async (
    userId: number,
    dateIso: string,
    targets: Targets,
    lang: ReturnType<typeof detectLang>,
    reviewed: boolean,
  ): Promise<string> => {
    const { start, end } = weekRange(dateIso);
    const [rows, rangeMetrics, prior] = await loadPeriodReads(userId, start, end);
    const weight = summarizeMetric(rangeMetrics, prior, 'weightKg');

    const stats: WeeklyStats = {
      period: 'weekly',
      start,
      end,
      targets,
      avg: average(rows),
      loggedDays: rows.length,
      periodDays: 7,
      daysHitProtein: countProteinHits(rows, targets.proteinG),
      daysFatOk: countFatOk(rows, targets.fatG),
      weekStartWeight: weight.startValue,
      weekEndWeight: weight.endValue,
      weightDelta: rangeDelta(weight.priorValue, weight.endValue),
    };

    const prose = rows.length === 0 ? {} : await generateProse('weekly', buildPrompt(stats, lang));
    const body = renderReview(stats, prose, lang);
    await upsertReview(client, userId, 'weekly', toDbDate(start), toDbDate(end), body, reviewed);

    return body;
  };

  const buildMonthly = async (
    userId: number,
    dateIso: string,
    targets: Targets,
    lang: ReturnType<typeof detectLang>,
    reviewed: boolean,
  ): Promise<string> => {
    const { start, end } = monthRange(dateIso);
    const [rows, rangeMetrics, prior] = await loadPeriodReads(userId, start, end);
    const weight = summarizeMetric(rangeMetrics, prior, 'weightKg');
    const waist = summarizeMetric(rangeMetrics, prior, 'waistCm');
    const weeks = groupIntoWeeks(rows);
    const { year, monthIndex } = monthParts(start);

    const stats: MonthlyStats = {
      period: 'monthly',
      start,
      end,
      year,
      monthIndex,
      targets,
      avg: average(rows),
      loggedDays: rows.length,
      periodDays: daysInMonth(dateIso),
      weeks,
      weeksHitProtein: countWeekProteinHits(weeks, targets.proteinG),
      weekCount: weeks.length,
      weightStart: weight.startValue,
      weightEnd: weight.endValue,
      weightDelta: rangeDelta(weight.startValue, weight.endValue),
      waistStart: waist.startValue,
      waistEnd: waist.endValue,
      waistDelta: rangeDelta(waist.startValue, waist.endValue),
    };

    const prose = rows.length === 0 ? {} : await generateProse('monthly', buildPrompt(stats, lang));
    const body = renderReview(stats, prose, lang);
    await upsertReview(client, userId, 'monthly', toDbDate(start), toDbDate(end), body, reviewed);

    return body;
  };

  return {
    async generateDaily(chatId: bigint, opts: GenerateOptions = {}): Promise<ReviewResult | null> {
      const userId = await resolveUserId(client, chatId);
      if (userId === null) {
        return null;
      }
      const profile = await loadProfile(client, userId);
      if (profile === null) {
        return null;
      }

      const dateIso = opts.date ?? resolveDate('today', profile.tz, now());
      const reviewed = opts.reviewed ?? true;
      const lang = opts.triggerText ? detectLang(opts.triggerText) : 'ru';

      const text = await buildDaily(userId, dateIso, profile.targets, lang, reviewed);
      const rollups: string[] = [];
      if (isSunday(dateIso)) {
        rollups.push(await buildWeekly(userId, dateIso, profile.targets, lang, reviewed));
      }
      if (isLastDayOfMonth(dateIso)) {
        rollups.push(await buildMonthly(userId, dateIso, profile.targets, lang, reviewed));
      }

      return { text, rollups };
    },
  };
};
