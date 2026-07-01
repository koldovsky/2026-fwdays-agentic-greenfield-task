import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { FoodPer, FoodSource } from '@prisma/client';
import { estimatePlate, refinePlate, resolvePlate, type PlateItem } from '../../src/food/photo.js';
import type { FoodClient, ResolvedFood } from '../../src/food/types.js';

// Vision extraction + per-item resolution + text-only refine (food-photo/-ask). Asserts the vision
// seam is called EXACTLY ONCE with the image (invariant #5), items parse, an optional plate-level
// `clarify` rides that same response, a Food-DB name hit is a `fact` and a miss is an `estimate` from
// the vision macros with ZERO extra calls, the batched lookup issues ONE query (no N+1), and the
// answer refine is exactly one TEXT-ONLY call carrying no image (invariant #4).

const PLATE_ITEMS: PlateItem[] = [
  { name: 'куриное филе', per: 'per100g', kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0, qty: 200 },
  { name: 'борщ', per: 'dish', kcal: 250, proteinG: 8, fatG: 10, carbsG: 30, qty: 1 },
];
const PLATE = { items: PLATE_ITEMS };

const makeAnthropic = (
  plate: unknown = PLATE,
): { client: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(plate) }],
    usage: { cache_read_input_tokens: 0 },
  });
  return { client: { messages: { create } } as unknown as Anthropic, create };
};

const makeClient = (
  rows: unknown[],
): { client: FoodClient; findMany: ReturnType<typeof vi.fn> } => {
  const findMany = vi.fn().mockResolvedValue(rows);
  const client = { foodDatabase: { findMany } } as unknown as FoodClient;
  return { client, findMany };
};

describe('estimatePlate', () => {
  it('issues exactly one vision call carrying the image and parses the items', async () => {
    const { client, create } = makeAnthropic();

    const { items, clarify } = await estimatePlate(client, 'BASE64', 'куриное филе и борщ');

    expect(create).toHaveBeenCalledTimes(1); // one vision call, no loop (invariant #5)
    const params = create.mock.calls[0]?.[0] as { messages: { content: { type: string }[] }[] };
    expect(params.messages[0]?.content[0]?.type).toBe('image');
    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe('куриное филе');
    expect(items[1]?.per).toBe('dish');
    expect(clarify).toBeNull(); // no flag on a plain plate
  });

  it('surfaces a plate-level clarify when the model raises one (still one vision call)', async () => {
    const { client, create } = makeAnthropic({
      items: PLATE_ITEMS,
      clarify: { unknown: 'dressing', question: 'Салат с заправкой?', options: ['yes', 'no'] },
    });

    const { clarify } = await estimatePlate(client, 'BASE64', 'салат');

    expect(create).toHaveBeenCalledTimes(1); // the flag rides the SAME response, no extra call (#5)
    expect(clarify?.unknown).toBe('dressing');
    expect(clarify?.options).toEqual(['yes', 'no']);
  });

  it('folds an empty caption cleanly (no caption line) and still makes one call', async () => {
    const { client, create } = makeAnthropic();
    await estimatePlate(client, 'BASE64', '');
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('refinePlate', () => {
  const held: ResolvedFood[] = [
    {
      name: 'салат',
      per: FoodPer.dish,
      base: { kcal: 120, proteinG: 4, fatG: 6, carbsG: 12 },
      qty: 1,
      unit: 'dish',
      source: FoodSource.estimate,
      foodDbId: null,
    },
  ];

  it('makes exactly one TEXT-ONLY call — no image, only held items + the answer (invariants #1/#4/#5)', async () => {
    const adjusted: PlateItem[] = [
      { name: 'салат', per: 'dish', kcal: 260, proteinG: 4, fatG: 20, carbsG: 12, qty: 1 },
    ];
    const { client, create } = makeAnthropic({ items: adjusted });

    const items = await refinePlate(client, held, 'with 1 tbsp oil');

    expect(create).toHaveBeenCalledTimes(1); // ≤1 refine call, no loop (invariant #5)
    const params = create.mock.calls[0]?.[0] as { messages: { content: unknown }[] };
    // No image block anywhere — the refine never re-runs vision (invariant #4).
    expect(typeof params.messages[0]?.content).toBe('string');
    const sent = params.messages[0]?.content as string;
    expect(sent).toContain('салат'); // the held item
    expect(sent).toContain('with 1 tbsp oil'); // the answer
    // FIX 1: added ingredients must be returned as a SEPARATE item so a fact item's mover survives
    // the caller's resolvePlate rebuild — the prompt instructs it explicitly.
    expect(sent).toContain('SEPARATE additional item');
    expect(items[0]?.fatG).toBe(20); // the adjusted macros come back
  });

  it('returns an appended item for an added-fat answer (the mover is its own line)', async () => {
    const withOil: PlateItem[] = [
      { name: 'салат', per: 'dish', kcal: 120, proteinG: 4, fatG: 6, carbsG: 12, qty: 1 },
      { name: 'масло', per: 'portion', kcal: 120, proteinG: 0, fatG: 14, carbsG: 0, qty: 1 },
    ];
    const { client } = makeAnthropic({ items: withOil });

    const items = await refinePlate(client, held, 'с оливковым маслом');

    expect(items).toHaveLength(2); // the salad plus a distinct oil item
    expect(items[1]?.name).toBe('масло'); // the mover survives as its own line, not folded away
  });
});

describe('resolvePlate', () => {
  it('tags a Food-DB name hit as fact and a miss as estimate from the vision macros', async () => {
    // Only the first item is in the catalog; the second is a visual-only estimate.
    const { client, findMany } = makeClient([
      {
        id: 42,
        name: 'куриное филе',
        per: FoodPer.per100g,
        kcal: 165,
        proteinG: 31,
        fatG: 3.6,
        carbsG: 0,
      },
    ]);

    const resolved = await resolvePlate(client, 7, PLATE_ITEMS);

    expect(findMany).toHaveBeenCalledTimes(1); // ONE batched query for the whole plate (no N+1)
    expect(resolved[0]?.source).toBe(FoodSource.fact);
    expect(resolved[0]?.foodDbId).toBe(42);
    expect(resolved[0]?.qty).toBe(200); // reconciled from the observed qty against per100g

    expect(resolved[1]?.source).toBe(FoodSource.estimate);
    expect(resolved[1]?.foodDbId).toBeNull();
    expect(resolved[1]?.base.kcal).toBe(250); // the vision item's OWN macros ARE the estimate
    expect(resolved[1]?.unit).toBe('dish');
  });

  it('resolves a miss with zero extra client calls (the visual macros are the estimate)', async () => {
    const { client, findMany } = makeClient([]); // nothing in the catalog → all estimates

    const resolved = await resolvePlate(client, 7, PLATE_ITEMS);

    expect(findMany).toHaveBeenCalledTimes(1); // still one query, no per-item lookup
    expect(resolved.every((r) => r.source === FoodSource.estimate)).toBe(true);
  });

  it('prefers the user own row over a global with the same name (own sorts first)', async () => {
    // findMany returns own-first (orderBy userId desc); resolvePlate takes the first per name.
    const { client } = makeClient([
      { id: 9, name: 'борщ', per: FoodPer.dish, kcal: 300, proteinG: 12, fatG: 14, carbsG: 34 },
    ]);

    const resolved = await resolvePlate(client, 7, [PLATE_ITEMS[1]!]);

    expect(resolved[0]?.source).toBe(FoodSource.fact);
    expect(resolved[0]?.foodDbId).toBe(9);
    expect(resolved[0]?.base.kcal).toBe(300); // Food-DB macros preferred over the visual estimate
  });
});
