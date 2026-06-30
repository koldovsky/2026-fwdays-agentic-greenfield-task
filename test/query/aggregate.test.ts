import { describe, expect, it, vi } from 'vitest';
import { sumForDate } from '../../src/query/aggregate.js';
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
