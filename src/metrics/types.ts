import type { BodyMetric, PrismaClient } from '@prisma/client';

// Body-metrics domain shapes (US-7, §body-metrics). The router resolves `metric` + a date but no
// values — metrics parses the six numeric columns from raw text in code (invariant #5, no LLM on
// this path). Column names stay English structural literals (invariant #6); prose localizes them.

/** The six numeric `body_metrics` columns the parser can populate. */
export type MetricColumn = 'weightKg' | 'waistCm' | 'chestCm' | 'hipsCm' | 'bicepCm' | 'thighCm';

/** Only the fields actually present in the message — never a full row, never a guess. */
export type ParsedMetrics = Partial<Record<MetricColumn, number>>;

/** Per-field like-with-like delta vs the most recent PRIOR entry that carried that field. */
export interface MetricDelta {
  column: MetricColumn;
  value: number;
  prior: number | null; // null on a first-ever entry for this column
  delta: number | null; // null on a first-ever entry for this column
  priorDate: string | null; // YYYY-MM-DD of the prior entry; null alongside prior/delta
}

/** Days since each column was last logged (relative to `asOf`); `null` when never logged. */
export type MetricStaleness = Partial<Record<MetricColumn, number>>;

/** A confirmation the bot renders: prose only — the numbers are baked in already (invariant #2). */
export interface MetricConfirmation {
  text: string;
}

/** The router output fields metrics reads (intent already known to be `metric`). */
export interface RoutedMetric {
  date: string; // resolved YYYY-MM-DD (user TZ) — never recomputed here
}

export interface MetricsService {
  logMetric: (
    chatId: bigint,
    text: string,
    routed: RoutedMetric,
  ) => Promise<MetricConfirmation | null>;
}

// Narrow structural surface over Prisma — a real PrismaClient satisfies it; tests pass a cast mock.
export type MetricsClient = Pick<PrismaClient, 'user' | 'bodyMetric'>;

export type { BodyMetric };
