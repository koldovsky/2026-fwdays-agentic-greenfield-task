import type { BodyMetric } from '@prisma/client';
import { tenantWhere } from '../db/tenancy.js';
import { isoFromDbDate } from '../util/date.js';
import type {
  MetricColumn,
  MetricDelta,
  MetricStaleness,
  MetricsClient,
  ParsedMetrics,
} from './types.js';

// Like-with-like trend (design §3): each just-logged field is diffed against the most recent PRIOR
// row that carried THAT field non-null — never the start, never cross-metric. One bounded history
// fetch, then an in-code scan per field (no N+1, no per-field round-trip). Staleness (design §5) is
// a pure read derived from the same history.

const METRIC_COLUMNS: MetricColumn[] = [
  'weightKg',
  'waistCm',
  'chestCm',
  'hipsCm',
  'bicepCm',
  'thighCm',
];

/** History bound — far more than enough prior rows to find the last non-null per column. */
const HISTORY_LIMIT = 365;

/** All `body_metrics` rows strictly before `beforeDate`, newest first, tenant-scoped, one query. */
export const priorHistory = async (
  client: MetricsClient,
  userId: number,
  beforeDate: Date,
): Promise<BodyMetric[]> =>
  client.bodyMetric.findMany({
    where: tenantWhere(userId, { date: { lt: beforeDate } }),
    orderBy: { date: 'desc' },
    take: HISTORY_LIMIT,
  });

/** The most recent row carrying a non-null `column` in `history` (already ordered newest first). */
const mostRecentRow = (history: BodyMetric[], column: MetricColumn): BodyMetric | null =>
  history.find((row) => row[column] !== null) ?? null;

/** Per just-logged field, the signed delta vs its own most-recent prior entry (or null if first-ever). */
export const computeDeltas = (parsed: ParsedMetrics, history: BodyMetric[]): MetricDelta[] => {
  const deltas: MetricDelta[] = [];

  for (const column of METRIC_COLUMNS) {
    const value = parsed[column];
    if (value === undefined) {
      continue;
    }

    const priorRow = mostRecentRow(history, column);
    const prior = priorRow === null ? null : Number(priorRow[column]);
    deltas.push({
      column,
      value,
      prior,
      delta: prior === null ? null : value - prior,
      priorDate: priorRow === null ? null : isoFromDbDate(priorRow.date),
    });
  }

  return deltas;
};

/** Days since each column was last logged on or before `asOf`; `null` per column when never logged. */
export const metricStaleness = (history: BodyMetric[], asOf: Date): MetricStaleness => {
  const staleness: MetricStaleness = {};
  const msPerDay = 24 * 60 * 60 * 1000;

  for (const column of METRIC_COLUMNS) {
    const lastRow = history.find((row) => row[column] !== null);
    if (!lastRow) {
      continue;
    }
    staleness[column] = Math.floor((asOf.getTime() - lastRow.date.getTime()) / msPerDay);
  }

  return staleness;
};
