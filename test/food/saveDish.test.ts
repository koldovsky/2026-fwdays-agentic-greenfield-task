import { describe, expect, it, vi } from 'vitest';
import { FoodPer } from '@prisma/client';
import { saveDishToCatalog } from '../../src/food/saveDish.js';
import type { FoodClient } from '../../src/food/types.js';

// composite-dish save (invariants #1/#2/#8): re-read the tenant-scoped `food_log` rows by id, SUM their
// macros IN CODE into one `portion` product, find-or-update by (user_id, name). No LLM anywhere. The
// fake client HONORS the tenant filter (userId + id.in) so a filterless mock can't hide a bug (memory:
// "mocks can mask review bugs") — the sum genuinely reflects only the acting user's existing rows.

interface StoredLog {
  id: number;
  userId: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

interface CatalogRow {
  id: number;
  userId: number | null;
  name: string;
  per: FoodPer;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

const makeClient = (
  logs: StoredLog[],
  catalog: CatalogRow[] = [],
): {
  client: FoodClient;
  created: Record<string, unknown>[];
  updated: { id: number; data: Record<string, unknown> }[];
  findManyWhere: Record<string, unknown>[];
  findFirstWhere: Record<string, unknown>[];
  catalog: CatalogRow[];
} => {
  const created: Record<string, unknown>[] = [];
  const updated: { id: number; data: Record<string, unknown> }[] = [];
  const findManyWhere: Record<string, unknown>[] = [];
  const findFirstWhere: Record<string, unknown>[] = [];
  let nextId = 100;

  const client = {
    foodLog: {
      findMany: vi.fn((args: { where: { userId: number; id: { in: number[] } } }) => {
        findManyWhere.push(args.where);
        const { userId, id } = args.where;
        return Promise.resolve(
          logs.filter((row) => row.userId === userId && id.in.includes(row.id)),
        );
      }),
    },
    foodDatabase: {
      findFirst: vi.fn(
        (args: { where: { userId: number; name: { equals: string; mode: string } } }) => {
          findFirstWhere.push(args.where);
          const { userId, name } = args.where;
          const wanted = name.equals.toLowerCase();
          const match = catalog.find(
            (row) => row.userId === userId && row.name.toLowerCase() === wanted,
          );
          return Promise.resolve(match ?? null);
        },
      ),
      create: vi.fn((args: { data: Record<string, unknown> }) => {
        created.push(args.data);
        const row = { id: nextId++, ...args.data } as unknown as CatalogRow;
        catalog.push(row);
        return Promise.resolve(row);
      }),
      update: vi.fn((args: { where: { id: number }; data: Record<string, unknown> }) => {
        updated.push({ id: args.where.id, data: args.data });
        const row = catalog.find((r) => r.id === args.where.id);
        if (row) {
          Object.assign(row, args.data);
        }
        return Promise.resolve(row);
      }),
    },
  } as unknown as FoodClient;

  return { client, created, updated, findManyWhere, findFirstWhere, catalog };
};

const log = (over: Partial<StoredLog>): StoredLog => ({
  id: 1,
  userId: 7,
  kcal: 100,
  proteinG: 10,
  fatG: 2,
  carbsG: 5,
  ...over,
});

describe('saveDishToCatalog', () => {
  it('sums the re-read rows into ONE user-owned portion product (invariants #2/#8)', async () => {
    const { client, created } = makeClient([
      log({ id: 11, userId: 7, kcal: 120, proteinG: 24, fatG: 1.5, carbsG: 3 }),
      log({ id: 12, userId: 7, kcal: 90, proteinG: 6, fatG: 3, carbsG: 9 }),
    ]);

    const { result, foodDbId } = await saveDishToCatalog(client, 7, [11, 12], 'protein cocktail');

    expect(result).toEqual({ saved: true, entryName: 'protein cocktail' });
    expect(foodDbId).toBe(100);
    expect(created).toHaveLength(1);
    const row = created[0];
    expect(row?.userId).toBe(7); // tenant-owned (invariant #8)
    expect(row?.name).toBe('protein cocktail');
    expect(row?.per).toBe(FoodPer.portion); // one portion = the whole dish (design D1)
    expect(row?.kcal).toBe(210); // 120 + 90, summed in code (invariant #2)
    expect(row?.proteinG).toBe(30); // 24 + 6
    expect(row?.fatG).toBe(4.5); // 1.5 + 3
    expect(row?.carbsG).toBe(12); // 3 + 9
  });

  it('re-reads numbers from the DB rows, never a passed-in figure (invariant #1)', async () => {
    // The only inputs are row ids + a name — no macros cross the boundary. The stored total must equal
    // the SUM of the current DB rows, so a stale UI/callback number could never leak in.
    const { client, created, findManyWhere } = makeClient([
      log({ id: 20, userId: 7, kcal: 55, proteinG: 1, fatG: 0.5, carbsG: 12 }),
    ]);

    await saveDishToCatalog(client, 7, [20], 'snack');

    expect(findManyWhere[0]).toEqual({ userId: 7, id: { in: [20] } }); // tenant-scoped re-read
    expect(created[0]?.kcal).toBe(55); // straight from the row, not any caller-supplied value
  });

  it('find-or-update by (user_id, name) REFRESHES rather than duplicating on a re-save (design D4)', async () => {
    const catalog: CatalogRow[] = [
      {
        id: 42,
        userId: 7,
        name: 'protein cocktail',
        per: FoodPer.portion,
        kcal: 999,
        proteinG: 1,
        fatG: 1,
        carbsG: 1,
      },
    ];
    const { client, created, updated } = makeClient(
      [log({ id: 30, userId: 7, kcal: 200, proteinG: 20, fatG: 4, carbsG: 6 })],
      catalog,
    );

    const { foodDbId } = await saveDishToCatalog(client, 7, [30], 'Protein Cocktail'); // case-insensitive

    expect(created).toHaveLength(0); // no duplicate created
    expect(updated).toHaveLength(1);
    expect(foodDbId).toBe(42); // the SAME row
    expect(updated[0]?.data.kcal).toBe(200); // refreshed to the new sum
    expect(catalog).toHaveLength(1); // still exactly one row for the name
  });

  it('never touches another user’s or a global row — creates the acting user’s own (invariant #8)', async () => {
    const catalog: CatalogRow[] = [
      // a GLOBAL row and ANOTHER user's row share the name — neither may be matched or mutated
      {
        id: 1,
        userId: null,
        name: 'protein cocktail',
        per: FoodPer.portion,
        kcal: 500,
        proteinG: 5,
        fatG: 5,
        carbsG: 5,
      },
      {
        id: 2,
        userId: 8,
        name: 'protein cocktail',
        per: FoodPer.portion,
        kcal: 600,
        proteinG: 6,
        fatG: 6,
        carbsG: 6,
      },
    ];
    // rows belong to user 8 as well — only user 7's own row (there is none) matters
    const { client, created, updated, findFirstWhere } = makeClient(
      [
        log({ id: 40, userId: 7, kcal: 100, proteinG: 10, fatG: 2, carbsG: 5 }),
        log({ id: 41, userId: 8, kcal: 900, proteinG: 90, fatG: 90, carbsG: 90 }), // foreign — must be skipped
      ],
      catalog,
    );

    await saveDishToCatalog(client, 7, [40, 41], 'protein cocktail');

    expect(findFirstWhere[0]?.userId).toBe(7); // own-only lookup (excludes global/other user)
    expect(updated).toHaveLength(0); // the global/other-user rows were NOT updated
    expect(created).toHaveLength(1);
    expect(created[0]?.userId).toBe(7);
    expect(created[0]?.kcal).toBe(100); // only user 7's row summed; the foreign row (id 41) skipped
    expect(catalog).toHaveLength(3); // the two seed rows plus the new user-7 row
  });

  it('skips a missing/stale row id and sums only what still exists', async () => {
    const { client, created } = makeClient([
      log({ id: 50, userId: 7, kcal: 80, proteinG: 8, fatG: 1, carbsG: 4 }),
    ]);

    await saveDishToCatalog(client, 7, [50, 999], 'dish'); // 999 was deleted between log and save

    expect(created[0]?.kcal).toBe(80); // only the surviving row
  });

  it('saves NOTHING when no rows remain (honest, no empty product)', async () => {
    const { client, created, updated } = makeClient([]);

    const { result, foodDbId } = await saveDishToCatalog(client, 7, [1, 2], 'ghost');

    expect(result).toEqual({ saved: false, entryName: null });
    expect(foodDbId).toBeNull();
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });
});
