import { describe, expect, it, vi } from 'vitest';
import { createQueryService } from '../../src/query/service.js';
import type { QueryClient } from '../../src/query/types.js';

// End-to-end service wiring over a fake Prisma: the user is resolved from chat_id and the aggregate
// is scoped to that user's id (invariant #8); "вчера" aggregates the router-RESOLVED date, never
// today (invariant #1); an unknown chat_id returns null (no leak). No LLM call on this path (#5).

interface AggregateArgs {
  where: Record<string, unknown>;
}

const makeFake = (
  user: {
    id: number;
    targetKcal: number | null;
    targetProteinG: unknown;
    targetFatG: unknown;
    targetCarbsG: unknown;
  } | null,
  sum: Record<string, unknown>,
  count: number,
): { client: QueryClient; aggregateArgs: { value: AggregateArgs | undefined } } => {
  const aggregateArgs: { value: AggregateArgs | undefined } = { value: undefined };

  const client = {
    user: { findUnique: vi.fn().mockResolvedValue(user) },
    foodLog: {
      aggregate: vi.fn((args: AggregateArgs) => {
        aggregateArgs.value = args;
        return Promise.resolve({ _sum: sum, _count: count });
      }),
    },
  } as unknown as QueryClient;

  return { client, aggregateArgs };
};

describe('createQueryService.answerQuery', () => {
  it('resolves the user from chat_id and scopes the aggregate to that user (invariant #8)', async () => {
    const { client, aggregateArgs } = makeFake(
      { id: 7, targetKcal: null, targetProteinG: null, targetFatG: null, targetCarbsG: null },
      { kcal: 1200, proteinG: 71, fatG: 40, carbsG: 120 },
      2,
    );

    const answer = await createQueryService(client).answerQuery(99n, 'сколько белка сегодня?', {
      date: '2026-06-30',
    });

    expect(aggregateArgs.value?.where.userId).toBe(7);
    expect(answer?.text).toContain('71');
  });

  it('aggregates the router-resolved date on "вчера", not today', async () => {
    const { client, aggregateArgs } = makeFake(
      { id: 7, targetKcal: null, targetProteinG: null, targetFatG: null, targetCarbsG: null },
      { kcal: 1200, proteinG: 71, fatG: 40, carbsG: 120 },
      2,
    );

    await createQueryService(client).answerQuery(99n, 'сколько калорий было вчера?', {
      date: '2026-06-29',
    });

    expect(aggregateArgs.value?.where.date).toEqual(new Date('2026-06-29T00:00:00.000Z'));
  });

  it('shows logged-of-goal when the user has onboarding targets', async () => {
    const { client } = makeFake(
      {
        id: 7,
        targetKcal: null,
        targetProteinG: { toString: () => '160.00' },
        targetFatG: null,
        targetCarbsG: null,
      },
      { kcal: 1200, proteinG: 120, fatG: 40, carbsG: 120 },
      2,
    );

    const answer = await createQueryService(client).answerQuery(99n, 'сколько белка?', {
      date: '2026-06-30',
    });

    expect(answer?.text).toContain('120');
    expect(answer?.text).toContain('160');
  });

  it('answers honestly for an empty day', async () => {
    const { client } = makeFake(
      { id: 7, targetKcal: null, targetProteinG: null, targetFatG: null, targetCarbsG: null },
      { kcal: null, proteinG: null, fatG: null, carbsG: null },
      0,
    );

    const answer = await createQueryService(client).answerQuery(99n, 'что по сегодня?', {
      date: '2026-06-30',
    });

    expect(answer?.text.toLowerCase()).toMatch(/ничего|nothing|нічого/);
  });

  it('returns null for an unknown chat_id (no aggregate run, no leak)', async () => {
    const { client, aggregateArgs } = makeFake(null, {}, 0);

    const answer = await createQueryService(client).answerQuery(99n, 'сколько калорий?', {
      date: '2026-06-30',
    });

    expect(answer).toBeNull();
    expect(aggregateArgs.value).toBeUndefined();
  });
});
