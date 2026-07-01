import type { BodyMetric, Meal } from '@prisma/client';
import { tenantWhere } from '../db/tenancy.js';
import type { MetricColumn } from '../metrics/types.js';
import { toDbDate } from '../util/date.js';
import type { ReviewClient } from './types.js';

// Review DB reads (design D3/D7). Food NUMBERS come from the query SUM seam (sumForDate /
// dailyTotalsForRange) — this module reads only the NON-numeric food meta (meals, estimate count) and
// the body_metrics needed for weight/waist trends. Every read is tenant-scoped (invariant #8); body
// values are never logged (invariant #9). Prior-period baselines reuse metrics/trend `priorHistory`.

const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'] as Meal[];

export interface DailyFoodMeta {
  meals: Meal[]; // distinct meals present, in canonical order
  estimateCount: number;
}

/** The day's meal set + estimate count (display meta only; the totals are the SUM elsewhere). */
export const dailyFoodMeta = async (
  client: ReviewClient,
  userId: number,
  dateIso: string,
): Promise<DailyFoodMeta> => {
  const rows = await client.foodLog.findMany({
    where: tenantWhere(userId, { date: toDbDate(dateIso) }),
    select: { meal: true, source: true },
  });

  const present = new Set(rows.map((row) => row.meal));
  const meals = MEAL_ORDER.filter((meal) => present.has(meal));
  const estimateCount = rows.filter((row) => row.source === 'estimate').length;

  return { meals, estimateCount };
};

const numeric = (value: BodyMetric[MetricColumn]): number | null =>
  value === null ? null : Number(value);

/** All body_metrics rows within `[start, end]`, ascending, tenant-scoped (one query). */
export const metricsInRange = (
  client: ReviewClient,
  userId: number,
  startIso: string,
  endIso: string,
): Promise<BodyMetric[]> =>
  client.bodyMetric.findMany({
    where: tenantWhere(userId, { date: { gte: toDbDate(startIso), lte: toDbDate(endIso) } }),
    orderBy: { date: 'asc' },
  });

export interface MetricRangeSummary {
  startValue: number | null; // earliest non-null in the range
  endValue: number | null; // latest non-null in the range
  priorValue: number | null; // latest non-null strictly before the range start
}

/**
 * Summarize one metric column over a period from its ascending in-range rows plus the newest-first
 * prior history (from `priorHistory`). Pure: the caller does the reads once and passes both in.
 */
export const summarizeMetric = (
  rangeRowsAsc: BodyMetric[],
  priorRowsNewestFirst: BodyMetric[],
  column: MetricColumn,
): MetricRangeSummary => {
  const inRange = rangeRowsAsc.filter((row) => row[column] !== null);
  const startRow = inRange[0] ?? null;
  const endRow = inRange[inRange.length - 1] ?? null;
  const priorRow = priorRowsNewestFirst.find((row) => row[column] !== null) ?? null;

  return {
    startValue: startRow ? numeric(startRow[column]) : null,
    endValue: endRow ? numeric(endRow[column]) : null,
    priorValue: priorRow ? numeric(priorRow[column]) : null,
  };
};
