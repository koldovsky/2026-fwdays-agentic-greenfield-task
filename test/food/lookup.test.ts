import { describe, expect, it, vi } from 'vitest';
import { FoodPer } from '@prisma/client';
import { lookupFoodsByNames } from '../../src/food/lookup.js';
import type { FoodClient } from '../../src/food/types.js';

// Batched name lookup for a plate photo (invariant #8, no N+1): ONE tenant-scoped findMany over all
// names, reduced to a best-match-per-lowercased-name map, own preferred (rows arrive own-first).

const makeClient = (
  rows: unknown[],
): { client: FoodClient; findMany: ReturnType<typeof vi.fn> } => {
  const findMany = vi.fn().mockResolvedValue(rows);
  const client = { foodDatabase: { findMany } } as unknown as FoodClient;
  return { client, findMany };
};

describe('lookupFoodsByNames', () => {
  it('issues one tenant + global scoped query for all names and maps best-per-name', async () => {
    const { client, findMany } = makeClient([
      {
        id: 1,
        name: 'Курица',
        per: FoodPer.per100g,
        kcal: 165,
        proteinG: 31,
        fatG: 3.6,
        carbsG: 0,
      },
      { id: 2, name: 'борщ', per: FoodPer.dish, kcal: 250, proteinG: 8, fatG: 10, carbsG: 30 },
    ]);

    const map = await lookupFoodsByNames(client, 7, ['курица', 'борщ', 'unknown']);

    expect(findMany).toHaveBeenCalledTimes(1); // one query, not one per name (no N+1)
    const args = findMany.mock.calls[0]?.[0] as { where: { AND: unknown[] } };
    const where = args.where;
    // catalogWhere nests the tenant/global OR — a second user's rows are never in scope (invariant #8).
    expect(where.AND).toEqual([
      { name: { in: ['курица', 'борщ', 'unknown'], mode: 'insensitive' } },
      { OR: [{ userId: 7 }, { userId: null }] },
    ]);
    expect(map.get('курица')?.id).toBe(1); // case-insensitive key
    expect(map.get('борщ')?.id).toBe(2);
    expect(map.has('unknown')).toBe(false);
  });

  it('keeps the first (own-preferred) row when two rows share a name', async () => {
    const { client } = makeClient([
      { id: 10, name: 'борщ', per: FoodPer.dish, kcal: 300, proteinG: 12, fatG: 14, carbsG: 34 },
      { id: 11, name: 'борщ', per: FoodPer.dish, kcal: 250, proteinG: 8, fatG: 10, carbsG: 30 },
    ]);

    const map = await lookupFoodsByNames(client, 7, ['борщ']);

    expect(map.get('борщ')?.id).toBe(10); // own sorts first → head wins, later dupes ignored
  });

  it('short-circuits to an empty map with no query when there are no names', async () => {
    const { client, findMany } = makeClient([]);

    const map = await lookupFoodsByNames(client, 7, []);

    expect(findMany).not.toHaveBeenCalled();
    expect(map.size).toBe(0);
  });
});
