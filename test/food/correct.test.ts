import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { FoodPer, FoodSource } from '@prisma/client';
import { correctLast } from '../../src/food/correct.js';
import type { FoodClient, RoutedCorrection } from '../../src/food/types.js';

// Correction updates the user's most recent row IN PLACE (never inserts): the quantity-only path
// rescales the row's own basis in pure code with ZERO LLM calls (invariants #2/#5), the named-product
// path re-resolves through the shared pipeline, and every update carries the tenant filter (#8). Prose
// mirrors the user's language while stored enums stay English literals (#6).

interface FakeRow {
  id: number;
  userId: number;
  entryName: string;
  qty: number;
  unit: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  source: FoodSource;
  foodDbId: number | null;
  date: Date;
  meal: string;
}

interface UpdateCall {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}

const makeFake = (
  last: FakeRow | null,
  match: unknown = null,
): {
  client: FoodClient;
  updates: UpdateCall[];
  inserts: number;
} => {
  const updates: UpdateCall[] = [];
  let inserts = 0;
  // The mutable last row: findLastFoodLog reads it, updateMany merges into it, the re-read returns it.
  const row = last ? { ...last } : null;

  const client = {
    user: { findUnique: vi.fn() },
    foodDatabase: { findFirst: vi.fn().mockResolvedValue(match) },
    foodLog: {
      findFirst: vi.fn(() => Promise.resolve(row ? { ...row } : null)),
      updateMany: vi.fn((args: UpdateCall) => {
        updates.push(args);
        if (row) {
          Object.assign(row, args.data);
        }
        return Promise.resolve({ count: row ? 1 : 0 });
      }),
      create: vi.fn(() => {
        inserts += 1;
        return Promise.resolve({});
      }),
    },
  } as unknown as FoodClient;

  return { client, updates, inserts };
};

const makeAnthropic = (
  estimate = { per: 'per100g', kcal: 60, proteinG: 1.5, fatG: 0.2, carbsG: 14 },
): { anthropic: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(estimate) }],
    usage: { cache_read_input_tokens: 0 },
  });
  return { anthropic: { messages: { create } } as unknown as Anthropic, create };
};

const chickenRow = (over: Partial<FakeRow> = {}): FakeRow => ({
  id: 42,
  userId: 7,
  entryName: 'куриное филе',
  qty: 200,
  unit: 'g',
  kcal: 330, // 165 per-100g × 2
  proteinG: 62,
  fatG: 7.2,
  carbsG: 0,
  source: FoodSource.fact,
  foodDbId: 5,
  date: new Date('2026-06-30T00:00:00.000Z'),
  meal: 'lunch',
  ...over,
});

describe('correctLast — quantity-only rescale', () => {
  it('rescales the existing basis in code (base × factor), updates in place, makes no LLM call', async () => {
    const { client, updates, inserts } = makeFake(chickenRow());
    const { anthropic, create } = makeAnthropic();
    const routed: RoutedCorrection = { date: '2026-06-30', quantity: 150, unit: 'г' };

    const confirmation = await correctLast(client, anthropic, 7, 'нет, 150г', routed);

    expect(create).not.toHaveBeenCalled(); // invariant #5 — quantity-only never touches the model
    expect(inserts).toBe(0); // in place, never an insert
    expect(updates).toHaveLength(1);
    const data = updates[0]?.data;
    expect(data?.kcal).toBe(248); // base 165 × (150/100), computed in code (invariant #2)
    expect(data?.qty).toBe(150);
    expect(data?.proteinG).toBe(46.5); // 31 × 1.5
    expect(confirmation.text).toContain('248');
  });

  it('updates the SAME row id (design D1 — never inserts a second row)', async () => {
    const { client, updates } = makeFake(chickenRow({ id: 99 }));
    const { anthropic } = makeAnthropic();

    await correctLast(client, anthropic, 7, '150г', {
      date: '2026-06-30',
      quantity: 150,
      unit: 'г',
    });

    expect(updates[0]?.where).toMatchObject({ id: 99 });
  });
});

describe('correctLast — named-product re-resolution', () => {
  it('re-resolves via the Food DB (fact path): swaps name/source/foodDbId and rescales', async () => {
    const { client, updates } = makeFake(
      chickenRow({ entryName: 'борщ', source: FoodSource.estimate, foodDbId: null, kcal: 250 }),
      {
        id: 12,
        name: 'рис',
        per: FoodPer.per100g,
        kcal: 130,
        proteinG: 2.7,
        fatG: 0.3,
        carbsG: 28,
      },
    );
    const { anthropic, create } = makeAnthropic();
    const routed: RoutedCorrection = {
      date: '2026-06-30',
      product: 'рис',
      quantity: 200,
      unit: 'г',
    };

    const confirmation = await correctLast(client, anthropic, 7, 'не борщ, 200г риса', routed);

    expect(create).not.toHaveBeenCalled(); // Food DB hit = fact, zero LLM calls
    const data = updates[0]?.data;
    expect(data?.entryName).toBe('рис');
    expect(data?.source).toBe(FoodSource.fact);
    expect(data?.foodDbId).toBe(12);
    expect(data?.kcal).toBe(260); // 130 × 200/100
    expect(confirmation.text).toContain('260');
    expect(confirmation.addToCatalog).toBeUndefined(); // fact → no add offer
  });

  it('re-resolves a miss via the estimate path: one LLM call, honest estimate note + add offer', async () => {
    const { client, updates } = makeFake(chickenRow({ entryName: 'борщ' }), null);
    const { anthropic, create } = makeAnthropic({
      per: 'per100g',
      kcal: 50,
      proteinG: 1.2,
      fatG: 2,
      carbsG: 6,
    });
    const routed: RoutedCorrection = {
      date: '2026-06-30',
      product: 'солянка',
      quantity: 300,
      unit: 'г',
    };

    const confirmation = await correctLast(client, anthropic, 7, 'это солянка, 300г', routed);

    expect(create).toHaveBeenCalledTimes(1); // miss → exactly one estimate call
    const data = updates[0]?.data;
    expect(data?.entryName).toBe('солянка');
    expect(data?.source).toBe(FoodSource.estimate);
    expect(data?.foodDbId).toBeNull();
    expect(confirmation.text).toContain('±20'); // surfaced honestly (invariant #3)
    expect(confirmation.addToCatalog?.id).toBe(42); // add-to-Food-DB offered for the corrected row
  });
});

describe('correctLast — no entry to correct', () => {
  it('returns the localized "nothing to correct" reply and writes nothing', async () => {
    const { client, updates, inserts } = makeFake(null);
    const { anthropic, create } = makeAnthropic();

    const confirmation = await correctLast(client, anthropic, 7, 'нет, исправь', {
      date: '2026-06-30',
      quantity: 150,
      unit: 'г',
    });

    expect(create).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
    expect(inserts).toBe(0);
    expect(confirmation.text).toBeTruthy();
    expect(confirmation.addToCatalog).toBeUndefined();
  });
});

describe('correctLast — tenancy (invariant #8)', () => {
  it('scopes the update to the acting user via the where-clause user_id', async () => {
    const { client, updates } = makeFake(chickenRow());
    const { anthropic } = makeAnthropic();

    await correctLast(client, anthropic, 7, '150г', {
      date: '2026-06-30',
      quantity: 150,
      unit: 'г',
    });

    expect(updates[0]?.where).toMatchObject({ userId: 7 });
  });

  it('corrects U’s own most recent row, never a newer row owned by another user V', async () => {
    // Two rows in the table: V's is the globally-newest (higher id); U's is older. A tenant-scoped
    // "most recent" must pick U's row 42, not V's row 99 — proving findLastFoodLog filters by user_id.
    const rows: FakeRow[] = [
      chickenRow({
        id: 99,
        userId: 8,
        entryName: 'V сырок',
        source: FoodSource.estimate,
        foodDbId: null,
      }),
      chickenRow({ id: 42, userId: 7 }),
    ];
    const updates: UpdateCall[] = [];
    const client = {
      user: { findUnique: vi.fn() },
      foodDatabase: { findFirst: vi.fn().mockResolvedValue(null) },
      foodLog: {
        // Honor the tenant filter + id and "highest id first" so isolation is actually exercised.
        findFirst: vi.fn((args: { where: { userId: number; id?: number } }) => {
          const scoped = rows
            .filter((r) => r.userId === args.where.userId)
            .filter((r) => args.where.id === undefined || r.id === args.where.id)
            .sort((a, b) => b.id - a.id);
          return Promise.resolve(scoped[0] ? { ...scoped[0] } : null);
        }),
        updateMany: vi.fn((args: UpdateCall) => {
          updates.push(args);
          return Promise.resolve({ count: 1 });
        }),
        create: vi.fn(),
      },
    } as unknown as FoodClient;
    const { anthropic } = makeAnthropic();

    await correctLast(client, anthropic, 7, '150г', {
      date: '2026-06-30',
      quantity: 150,
      unit: 'г',
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]?.where).toMatchObject({ userId: 7, id: 42 }); // U's own row, never V's id 99
  });
});

describe('correctLast — language mirroring (invariant #6)', () => {
  const cases: { lang: string; text: string; verb: string }[] = [
    { lang: 'ru', text: 'нет, 150г', verb: 'Исправил' },
    { lang: 'uk', text: 'ні, 150г курячого філе', verb: 'Виправив' },
    { lang: 'en', text: 'no, 150g', verb: 'Corrected' },
  ];

  for (const { lang, text, verb } of cases) {
    it(`mirrors ${lang} prose while stored enums stay English literals`, async () => {
      const { client, updates } = makeFake(chickenRow());
      const { anthropic } = makeAnthropic();

      const confirmation = await correctLast(client, anthropic, 7, text, {
        date: '2026-06-30',
        quantity: 150,
        unit: 'г',
      });

      expect(confirmation.text.startsWith(verb)).toBe(true);
      expect(updates[0]?.data.source).toBe(FoodSource.fact); // English literal, not translated
    });
  }
});
