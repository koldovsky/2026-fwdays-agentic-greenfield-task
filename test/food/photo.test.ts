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
  {
    name: 'куриное филе',
    per: 'per100g',
    kcal: 165,
    proteinG: 31,
    fatG: 3.6,
    carbsG: 0,
    qty: 200,
    fromLabel: false,
  },
  {
    name: 'борщ',
    per: 'dish',
    kcal: 250,
    proteinG: 8,
    fatG: 10,
    carbsG: 30,
    qty: 1,
    fromLabel: false,
  },
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

    const { items, clarify } = await estimatePlate(client, ['BASE64'], 'куриное филе и борщ');

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

    const { clarify } = await estimatePlate(client, ['BASE64'], 'салат');

    expect(create).toHaveBeenCalledTimes(1); // the flag rides the SAME response, no extra call (#5)
    expect(clarify?.unknown).toBe('dressing');
    expect(clarify?.options).toEqual(['yes', 'no']);
  });

  it('folds an empty caption cleanly (no caption line) and still makes one call', async () => {
    const { client, create } = makeAnthropic();
    await estimatePlate(client, ['BASE64'], '');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('streams N photos as N image blocks BEFORE the text in exactly ONE vision call (invariant #5)', async () => {
    const { client, create } = makeAnthropic();

    await estimatePlate(client, ['a', 'b', 'c'], 'куриное филе и борщ');

    expect(create).toHaveBeenCalledTimes(1); // ONE call over all three images, no loop/agent
    const params = create.mock.calls[0]?.[0] as {
      messages: { content: { type: string }[] }[];
    };
    const content = params.messages[0]?.content ?? [];
    expect(content.filter((b) => b.type === 'image')).toHaveLength(3); // every photo streamed
    // All three image blocks precede the single text block (the caption instruction).
    expect(content.slice(0, 3).every((b) => b.type === 'image')).toBe(true);
    expect(content[3]?.type).toBe('text');
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
      {
        name: 'салат',
        per: 'dish',
        kcal: 260,
        proteinG: 4,
        fatG: 20,
        carbsG: 12,
        qty: 1,
        fromLabel: false,
      },
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
      {
        name: 'салат',
        per: 'dish',
        kcal: 120,
        proteinG: 4,
        fatG: 6,
        carbsG: 12,
        qty: 1,
        fromLabel: false,
      },
      {
        name: 'масло',
        per: 'portion',
        kcal: 120,
        proteinG: 0,
        fatG: 14,
        carbsG: 0,
        qty: 1,
        fromLabel: false,
      },
    ];
    const { client } = makeAnthropic({ items: withOil });

    const items = await refinePlate(client, held, 'с оливковым маслом');

    expect(items).toHaveLength(2); // the salad plus a distinct oil item
    expect(items[1]?.name).toBe('масло'); // the mover survives as its own line, not folded away
  });

  it('marks a LABEL FACT held item as fromLabel=true in the refine prompt (a refined label stays fact)', async () => {
    // The held item is a label fact (source fact, foodDbId null) — the refine must round-trip its
    // fromLabel flag so the model preserves it and the caller re-resolves it back to a fact (D2).
    const labelHeld: ResolvedFood[] = [
      {
        name: 'protein',
        per: FoodPer.per100g,
        base: { kcal: 380, proteinG: 80, fatG: 5, carbsG: 8 },
        qty: 25,
        unit: 'g',
        source: FoodSource.fact,
        foodDbId: null,
      },
    ];
    // The model's returned shape is irrelevant here — the assertion is on the prompt we SEND.
    const { client, create } = makeAnthropic({ items: PLATE_ITEMS });

    await refinePlate(client, labelHeld, 'ещё ложка сахара');

    const params = create.mock.calls[0]?.[0] as { messages: { content: unknown }[] };
    const sent = params.messages[0]?.content as string;
    expect(sent).toContain('fromLabel=true'); // the label fact is flagged so it survives as a fact
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

  it('logs a fromLabel item as fact from its OWN macros, never overridden by a Food-DB match (D2)', async () => {
    // The catalog HAS a row for the label item's name, but a label the user showed wins (precedence
    // label > Food-DB): the item keeps its printed macros and is a fact with no foodDbId.
    const labelItems: PlateItem[] = [
      {
        name: 'protein',
        per: 'per100g',
        kcal: 380,
        proteinG: 80,
        fatG: 5,
        carbsG: 8,
        qty: 25,
        fromLabel: true,
      },
      {
        name: 'молоко',
        per: 'per100ml',
        kcal: 42,
        proteinG: 3.4,
        fatG: 1,
        carbsG: 5,
        qty: 250,
        fromLabel: false,
      },
    ];
    const { client, findMany } = makeClient([
      // A stale catalog row for the SAME name — must NOT override the label macros.
      { id: 77, name: 'protein', per: FoodPer.per100g, kcal: 999, proteinG: 1, fatG: 1, carbsG: 1 },
    ]);

    const resolved = await resolvePlate(client, 7, labelItems);

    // Label item: fact, own macros, no catalog id — the 999-kcal catalog row is ignored.
    expect(resolved[0]?.source).toBe(FoodSource.fact);
    expect(resolved[0]?.foodDbId).toBeNull();
    expect(resolved[0]?.base.kcal).toBe(380);
    expect(resolved[0]?.qty).toBe(25);
    // The lookup only ran over the NON-label names (молоко), so 'protein' can't be matched/overridden.
    expect(findMany).toHaveBeenCalledTimes(1);
    const where = (findMany.mock.calls[0]?.[0] as { where: { AND?: unknown } }).where;
    expect(JSON.stringify(where)).toContain('молоко');
    expect(JSON.stringify(where)).not.toContain('protein');
  });

  it('issues no lookup query at all when every item is fromLabel (no needless N+1 query)', async () => {
    const { client, findMany } = makeClient([]);
    const allLabels: PlateItem[] = [
      {
        name: 'сливки',
        per: 'per100ml',
        kcal: 200,
        proteinG: 2,
        fatG: 20,
        carbsG: 3,
        qty: 20,
        fromLabel: true,
      },
    ];

    const resolved = await resolvePlate(client, 7, allLabels);

    expect(findMany).not.toHaveBeenCalled(); // nothing non-label to look up
    expect(resolved[0]?.source).toBe(FoodSource.fact);
    expect(resolved[0]?.foodDbId).toBeNull();
  });

  it('keeps a text-only item (no photo match, no catalog) as an honest estimate — not dropped (D2)', async () => {
    const { client } = makeClient([]); // catalog empty → the text-only item misses
    const items: PlateItem[] = [
      {
        name: 'сахар',
        per: 'portion',
        kcal: 16,
        proteinG: 0,
        fatG: 0,
        carbsG: 4,
        qty: 1,
        fromLabel: false,
      },
    ];

    const resolved = await resolvePlate(client, 7, items);

    expect(resolved).toHaveLength(1); // the text-only item survives resolution
    expect(resolved[0]?.name).toBe('сахар');
    expect(resolved[0]?.source).toBe(FoodSource.estimate);
    expect(resolved[0]?.base.kcal).toBe(16); // its own typical macros ARE the estimate
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
