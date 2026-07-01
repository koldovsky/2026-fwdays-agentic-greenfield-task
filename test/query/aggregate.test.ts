import { describe, expect, it, vi } from 'vitest';
import { dailyTotalsForRange, sumForDate } from '../../src/query/aggregate.js';
import type { QueryClient } from '../../src/query/types.js';

// The returned totals must come straight from the (mocked) `_sum` — never reduced from fetched rows
// (invariant #2) — and the aggregate `where` must carry the tenant filter (invariant #8). An empty
// day (Prisma's null `_sum`) becomes zeros + `entryCount: 0`, not a thrown error or undefined fields.

interface AggregateArgs {
  where: Record<string, unknown>;
}

const makeFake = (
  sum: Record<string, unknown> | null,
  count: number,
): { client: QueryClient; aggregateArgs: { value: AggregateArgs | undefined } } => {
  const aggregateArgs: { value: AggregateArgs | undefined } = { value: undefined };

  const client = {
    foodLog: {
      aggregate: vi.fn((args: AggregateArgs) => {
        aggregateArgs.value = args;
        return Promise.resolve({
          _sum: sum ?? { kcal: null, proteinG: null, fatG: null, carbsG: null },
          _count: count,
        });
      }),
    },
  } as unknown as QueryClient;

  return { client, aggregateArgs };
};

describe('sumForDate', () => {
  it('returns totals taken directly from the _sum, not reduced from rows', async () => {
    const { client } = makeFake({ kcal: 1200, proteinG: 71, fatG: 40, carbsG: 120 }, 3);

    const totals = await sumForDate(client, 7, '2026-06-30');

    expect(totals).toEqual({ kcal: 1200, proteinG: 71, fatG: 40, carbsG: 120, entryCount: 3 });
  });

  it('coerces Decimal-shaped _sum values to numbers', async () => {
    const { client } = makeFake(
      // Prisma.Decimal stringifies via toString/Number coercion; a plain numeric-string stands in here.
      { kcal: 500, proteinG: { toString: () => '40.50' }, fatG: 10, carbsG: 60 },
      1,
    );

    const totals = await sumForDate(client, 7, '2026-06-30');

    expect(totals.proteinG).toBe(40.5);
    expect(typeof totals.proteinG).toBe('number');
  });

  it('returns zeros + entryCount 0 for an empty day (null _sum), not an error', async () => {
    const { client } = makeFake(null, 0);

    const totals = await sumForDate(client, 7, '2026-06-30');

    expect(totals).toEqual({ kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, entryCount: 0 });
  });

  it('scopes the aggregate to the tenant and the resolved date (invariant #8)', async () => {
    const { client, aggregateArgs } = makeFake({ kcal: 100, proteinG: 5, fatG: 5, carbsG: 5 }, 1);

    await sumForDate(client, 42, '2026-06-29');

    expect(aggregateArgs.value?.where.userId).toBe(42);
    expect(aggregateArgs.value?.where.date).toEqual(new Date('2026-06-29T00:00:00.000Z'));
  });
});

interface GroupByArgs {
  by: string[];
  where: Record<string, unknown>;
  _sum: Record<string, boolean>;
}

const makeRangeFake = (
  groups: { date: Date; _sum: Record<string, unknown> }[],
): {
  client: QueryClient;
  groupBy: ReturnType<typeof vi.fn>;
  groupByArgs: { value: GroupByArgs | undefined };
} => {
  const groupByArgs: { value: GroupByArgs | undefined } = { value: undefined };
  const groupBy = vi.fn((args: GroupByArgs) => {
    groupByArgs.value = args;
    return Promise.resolve(groups);
  });
  const client = { foodLog: { groupBy } } as unknown as QueryClient;

  return { client, groupBy, groupByArgs };
};

describe('dailyTotalsForRange', () => {
  it('groups per day via a SINGLE groupBy (no N+1) and coerces Decimals to numbers', async () => {
    const { client, groupBy, groupByArgs } = makeRangeFake([
      {
        date: new Date('2026-06-23T00:00:00.000Z'),
        _sum: { kcal: 1500, proteinG: 120, fatG: 40, carbsG: 130 },
      },
      {
        date: new Date('2026-06-22T00:00:00.000Z'),
        _sum: { kcal: 1600, proteinG: { toString: () => '110.5' }, fatG: 50, carbsG: 140 },
      },
    ]);

    const rows = await dailyTotalsForRange(client, 7, '2026-06-22', '2026-06-28');

    expect(groupBy).toHaveBeenCalledTimes(1);
    expect(groupByArgs.value?.by).toEqual(['date']);
    // Sorted ascending by date, regardless of the DB return order.
    expect(rows[0]?.date).toBe('2026-06-22');
    expect(rows[0]?.proteinG).toBe(110.5);
    expect(rows[1]?.date).toBe('2026-06-23');
    expect(rows).toHaveLength(2);
  });

  it('scopes the groupBy to the tenant and the [start, end] range (invariant #8)', async () => {
    const { client, groupByArgs } = makeRangeFake([]);

    await dailyTotalsForRange(client, 42, '2026-06-01', '2026-06-30');

    expect(groupByArgs.value?.where.userId).toBe(42);
    expect(groupByArgs.value?.where.date).toEqual({
      gte: new Date('2026-06-01T00:00:00.000Z'),
      lte: new Date('2026-06-30T00:00:00.000Z'),
    });
  });

  it('returns an empty array when no day in the range has rows', async () => {
    const { client } = makeRangeFake([]);

    expect(await dailyTotalsForRange(client, 7, '2026-06-01', '2026-06-07')).toEqual([]);
  });
});
