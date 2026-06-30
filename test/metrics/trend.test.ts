import { describe, expect, it } from 'vitest';
import type { BodyMetric } from '@prisma/client';
import { computeDeltas, metricStaleness } from '../../src/metrics/trend.js';
import type { MetricColumn, ParsedMetrics } from '../../src/metrics/types.js';

// Trend is like-with-like vs the most recent PRIOR entry PER field — never vs the start, never
// cross-metric (design §3). Deltas are computed in code (invariant #2). Staleness is days-since /
// never. `history` is the already-fetched, newest-first prior rows (the service fetches it once).

// Prisma returns Decimal columns; tests pass plain numbers, so we cast once in the builder (the
// trend code coerces via Number(), which decimal.js Decimals also satisfy).
type RowOverride = Partial<Record<MetricColumn, number>> & { date: Date };

const row = (over: RowOverride): BodyMetric =>
  ({
    id: 1,
    userId: 7,
    weightKg: null,
    waistCm: null,
    chestCm: null,
    hipsCm: null,
    bicepCm: null,
    thighCm: null,
    conditions: null,
    createdAt: new Date(),
    ...over,
  }) as unknown as BodyMetric;

describe('computeDeltas', () => {
  it('diffs each field against its OWN most-recent prior, not the start', () => {
    const history: BodyMetric[] = [
      row({ date: new Date('2026-06-22T00:00:00.000Z'), weightKg: 90 }),
      row({ date: new Date('2026-06-10T00:00:00.000Z'), weightKg: 92 }),
      row({ date: new Date('2026-06-01T00:00:00.000Z'), weightKg: 95 }),
    ];
    const parsed: ParsedMetrics = { weightKg: 89.2 };

    const [delta] = computeDeltas(parsed, history);

    expect(delta?.prior).toBe(90); // the latest prior, not 95 (the start)
    expect(delta?.delta).toBeCloseTo(-0.8);
    expect(delta?.priorDate).toBe('2026-06-22');
  });

  it('compares each metric like-with-like against its own prior (per-field priors differ)', () => {
    // Weight was logged recently; waist only long ago — each must diff against its own last entry.
    const history: BodyMetric[] = [
      row({ date: new Date('2026-06-25T00:00:00.000Z'), weightKg: 90 }),
      row({ date: new Date('2026-06-05T00:00:00.000Z'), waistCm: 92 }),
    ];
    const parsed: ParsedMetrics = { weightKg: 89, waistCm: 90 };

    const deltas = computeDeltas(parsed, history);
    const byCol = Object.fromEntries(deltas.map((d) => [d.column, d]));

    expect(byCol.weightKg?.prior).toBe(90);
    expect(byCol.weightKg?.priorDate).toBe('2026-06-25');
    expect(byCol.waistCm?.prior).toBe(92);
    expect(byCol.waistCm?.priorDate).toBe('2026-06-05');
    expect(byCol.waistCm?.delta).toBe(-2);
  });

  it('a first-ever metric has a null delta and null priorDate', () => {
    const [delta] = computeDeltas({ thighCm: 55 }, []);

    expect(delta?.prior).toBeNull();
    expect(delta?.delta).toBeNull();
    expect(delta?.priorDate).toBeNull();
  });

  it('skips a prior row whose field is null and uses the next one that has it', () => {
    const history: BodyMetric[] = [
      row({ date: new Date('2026-06-20T00:00:00.000Z'), waistCm: 91 }), // no weight here
      row({ date: new Date('2026-06-10T00:00:00.000Z'), weightKg: 93 }),
    ];

    const [delta] = computeDeltas({ weightKg: 90 }, history);

    expect(delta?.prior).toBe(93);
    expect(delta?.priorDate).toBe('2026-06-10');
  });
});

describe('metricStaleness', () => {
  it('reports days since each column was last logged', () => {
    const history: BodyMetric[] = [
      row({ date: new Date('2026-06-25T00:00:00.000Z'), weightKg: 90 }),
      row({ date: new Date('2026-06-10T00:00:00.000Z'), waistCm: 92 }),
    ];

    const staleness = metricStaleness(history, new Date('2026-06-30T00:00:00.000Z'));

    expect(staleness.weightKg).toBe(5);
    expect(staleness.waistCm).toBe(20);
  });

  it('omits a column that was never logged (never → absent)', () => {
    const history: BodyMetric[] = [
      row({ date: new Date('2026-06-25T00:00:00.000Z'), weightKg: 90 }),
    ];

    const staleness = metricStaleness(history, new Date('2026-06-30T00:00:00.000Z'));

    expect(staleness.weightKg).toBe(5);
    expect(staleness.thighCm).toBeUndefined();
  });
});
