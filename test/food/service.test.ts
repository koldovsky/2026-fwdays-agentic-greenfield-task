import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { FoodPer, FoodSource, Meal } from '@prisma/client';
import type { Confirmation, ResolvedFood } from '../../src/food/types.js';
import type { LogOutcome, PhotoOpenQuestion } from '../../src/clarify/types.js';
import { createFoodService } from '../../src/food/service.js';
import type { FoodClient, FoodService } from '../../src/food/types.js';
import type { NotionOutbox } from '../../src/notion/types.js';

// fs write-path spies for the CRITICAL image-never-persisted test (invariant #4). ESM namespaces
// aren't spy-able after import, so the write functions are mocked at module scope with tracked fns
// (real reads are preserved via ...actual). A full logPhoto run must call none of them.
const { fsWriteFile, fsWriteFileSync, fsCreateWriteStream, fspWriteFile } = vi.hoisted(() => ({
  fsWriteFile: vi.fn(),
  fsWriteFileSync: vi.fn(),
  fsCreateWriteStream: vi.fn(),
  fspWriteFile: vi.fn(),
}));
vi.mock('node:fs', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  return {
    ...actual,
    writeFile: fsWriteFile,
    writeFileSync: fsWriteFileSync,
    createWriteStream: fsCreateWriteStream,
  };
});
vi.mock('node:fs/promises', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  return { ...actual, writeFile: fspWriteFile };
});

// A logFood call that logs directly (no clarification) — unwrap to its confirmation. The clarify
// change turned logFood into a LogOutcome discriminated union; these direct-log cases assert the
// unchanged write/confirm path (invariants #2/#3/#8), so a returned `ask` here is a test failure.
const loggedOf = (outcome: LogOutcome | null): Confirmation | undefined =>
  outcome?.kind === 'logged' ? outcome.confirmation : undefined;

// End-to-end service wiring over a fake Prisma: every row carries user_id (invariant #8), the entry
// lands on the router-resolved date incl. "вчера" back-dating (invariant #1), and the confirmation
// shows ONLY this entry's own numbers — never a hand-summed daily total (invariant #2).

interface CreatedRow {
  data: Record<string, unknown>;
}

const makeFake = (
  match: unknown,
  loggedRow: unknown = null,
): { client: FoodClient; created: CreatedRow[]; catalogCreates: CreatedRow[] } => {
  const created: CreatedRow[] = [];
  const catalogCreates: CreatedRow[] = [];

  const client = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 7 }) },
    foodDatabase: {
      findFirst: vi.fn().mockResolvedValue(match),
      // The log path resolves through lookupCandidates (findMany): a hit is a one-element list, a
      // miss is empty (falls through to the estimate call).
      findMany: vi.fn().mockResolvedValue(match ? [match] : []),
      create: vi.fn((args: CreatedRow) => {
        catalogCreates.push(args);
        return Promise.resolve({ id: 99, ...args.data });
      }),
    },
    foodLog: {
      findFirst: vi.fn().mockResolvedValue(loggedRow),
      create: vi.fn((args: CreatedRow) => {
        created.push(args);
        return Promise.resolve({ id: 1, ...args.data });
      }),
    },
  } as unknown as FoodClient;

  return { client, created, catalogCreates };
};

const makeAnthropic = (
  estimate = { per: 'per100g', kcal: 60, proteinG: 1.5, fatG: 0.2, carbsG: 14 },
): Anthropic => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(estimate) }],
    usage: { cache_read_input_tokens: 0 },
  });
  return { messages: { create } } as unknown as Anthropic;
};

const NOON = (): Date => new Date('2026-06-30T09:00:00Z'); // 12:00 Kyiv → lunch

const service = (client: FoodClient): FoodService =>
  createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON);

describe('createFoodService.logFood', () => {
  it('writes a tenant-scoped fact row with code-scaled numbers and confirms them', async () => {
    const { client, created } = makeFake({
      id: 42,
      name: 'куриное филе',
      per: FoodPer.per100g,
      kcal: 165,
      proteinG: 31,
      fatG: 3.6,
      carbsG: 0,
    });
    const service = createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON);

    const confirmation = loggedOf(
      await service.logFood(99n, '200г куриного филе', {
        date: '2026-06-30',
        product: 'куриного филе',
        quantity: 200,
        unit: 'г',
      }),
    );

    const row = created[0]?.data;
    expect(row?.userId).toBe(7); // invariant #8
    expect(row?.source).toBe(FoodSource.fact);
    expect(row?.foodDbId).toBe(42);
    expect(row?.kcal).toBe(330); // 165 × 200/100, in code
    expect(row?.meal).toBe('lunch');
    expect(confirmation?.text).toContain('330');
    expect(confirmation?.addToCatalog).toBeUndefined();
    // No daily-total leakage — the confirmation is a single entry.
    expect(confirmation?.text.toLowerCase()).not.toContain('итого');
  });

  it('back-dates the row to the router-resolved date on "вчера"', async () => {
    const { client, created } = makeFake({
      id: 1,
      name: 'банан',
      per: FoodPer.piece,
      kcal: 105,
      proteinG: 1.3,
      fatG: 0.4,
      carbsG: 27,
    });
    const service = createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON);

    await service.logFood(99n, 'вчера 2 банана', {
      date: '2026-06-29',
      product: 'банан',
      quantity: 2,
      unit: '',
    });

    expect(created[0]?.data.date).toEqual(new Date('2026-06-29T00:00:00.000Z'));
  });

  it('logs a miss as an estimate and offers to add it to the Food DB', async () => {
    const { client, created } = makeFake(null);
    const service = createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON);

    const confirmation = loggedOf(
      await service.logFood(99n, 'тарелка борща', {
        date: '2026-06-30',
        product: 'борщ',
        quantity: 1,
        unit: '',
      }),
    );

    expect(created[0]?.data.source).toBe(FoodSource.estimate);
    expect(created[0]?.data.foodDbId).toBeNull();
    expect(confirmation?.addToCatalog?.id).toBe(1);
    expect(typeof confirmation?.addToCatalog?.label).toBe('string');
    expect(confirmation?.text).toContain('±20');
  });

  it('logs one serving (100 g, not 1 g) of a weight-basis fact when no quantity was given', async () => {
    const { client, created } = makeFake({
      id: 42,
      name: 'куриное филе',
      per: FoodPer.per100g,
      kcal: 165,
      proteinG: 31,
      fatG: 3.6,
      carbsG: 0,
    });

    await service(client).logFood(99n, 'съел куриное филе', {
      date: '2026-06-30',
      product: 'куриное филе',
      // no quantity, no unit
    });

    const row = created[0]?.data;
    expect(row?.qty).toBe(100); // one serving of the per100g basis
    expect(row?.kcal).toBe(165); // full per-100g base (factor 1.0), never 1 g (~1.6 kcal)
  });

  it('clamps a weight quantity against a count estimate basis (no 200-dishes blowup)', async () => {
    // Miss → estimate; the model returns a per-DISH basis while the router parsed grams.
    const { client, created } = makeFake(null);
    const anthropic = makeAnthropic({ per: 'dish', kcal: 250, proteinG: 8, fatG: 10, carbsG: 30 });
    const svc = createFoodService(client, anthropic, 'Europe/Kyiv', NOON);

    await svc.logFood(99n, '200г борща', {
      date: '2026-06-30',
      product: 'борщ',
      quantity: 200,
      unit: 'г',
    });

    const row = created[0]?.data;
    expect(row?.qty).toBe(1); // one dish, not 200
    expect(row?.kcal).toBe(250); // 250 × 1, not × 200 (~50 000 kcal)
    expect(row?.unit).toBe('dish');
  });

  it('nudges for a product when the parse has none (log-by-default still needs one)', async () => {
    const { client, created } = makeFake(null);
    const service = createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON);

    const confirmation = loggedOf(await service.logFood(99n, 'спасибо', { date: '2026-06-30' }));

    expect(created).toHaveLength(0);
    expect(confirmation?.text).toBeTruthy();
    expect(confirmation?.addToCatalog).toBeUndefined();
  });
});

describe('createFoodService.correctLast', () => {
  it('returns null for an unknown chat_id (no user, no correction attempted)', async () => {
    const { client } = makeFake(null);
    (client.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await service(client).correctLast(99n, 'нет, 150г', {
      date: '2026-06-30',
      quantity: 150,
      unit: 'г',
    });

    expect(result).toBeNull();
  });
});

// --- Plate photo (food-photo) ---------------------------------------------------------------------

const PLATE = {
  items: [
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
    {
      name: 'рис',
      per: 'per100g',
      kcal: 130,
      proteinG: 2.7,
      fatG: 0.3,
      carbsG: 28,
      qty: 150,
      fromLabel: false,
    },
  ],
};

const makePlateAnthropic = (plate: unknown = PLATE): Anthropic =>
  ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(plate) }],
        usage: { cache_read_input_tokens: 0 },
      }),
    },
  }) as unknown as Anthropic;

// A photo fake: the batched findMany returns the given catalog rows for the whole plate at once.
const makePhotoFake = (
  catalogRows: unknown[] = [],
): { client: FoodClient; created: CreatedRow[]; findMany: ReturnType<typeof vi.fn> } => {
  const created: CreatedRow[] = [];
  const findMany = vi.fn().mockResolvedValue(catalogRows);

  const client = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 7 }) },
    foodDatabase: { findMany },
    foodLog: {
      create: vi.fn((args: CreatedRow) => {
        created.push(args);
        return Promise.resolve({ id: created.length, ...args.data });
      }),
    },
  } as unknown as FoodClient;

  return { client, created, findMany };
};

describe('createFoodService.logPhoto', () => {
  it('writes one tenant-scoped, code-scaled row per item — no hand-summed total', async () => {
    const { client, created, findMany } = makePhotoFake([
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
    const svc = createFoodService(client, makePlateAnthropic(), 'Europe/Kyiv', NOON);

    const confirmation = loggedOf(await svc.logPhoto(99n, 'куриное филе, борщ и рис', ['BASE64']));

    expect(findMany).toHaveBeenCalledTimes(1); // ONE batched lookup for the whole plate (no N+1)
    expect(created).toHaveLength(3); // one row per item (invariant #8)

    const chicken = created[0]?.data;
    expect(chicken?.userId).toBe(7); // tenant-scoped
    expect(chicken?.source).toBe(FoodSource.fact); // caption/name match → Food-DB fact
    expect(chicken?.foodDbId).toBe(42);
    expect(chicken?.kcal).toBe(330); // 165 × 200/100, scaled in code (invariant #2)
    expect(chicken?.meal).toBe('lunch');
    expect(chicken?.date).toEqual(new Date('2026-06-30T00:00:00.000Z')); // today (user TZ)

    const borsch = created[1]?.data;
    expect(borsch?.source).toBe(FoodSource.estimate); // visual-only → estimate
    expect(borsch?.foodDbId).toBeNull();
    expect(borsch?.kcal).toBe(250); // 250 × 1 (dish), the vision item's own macros

    const rice = created[2]?.data;
    expect(rice?.kcal).toBe(195); // 130 × 150/100 in code

    // No per-plate total is ever stored as a DB ROW — each row carries only its OWN numbers (#2/#8).
    const totalIfSummed = 330 + 250 + 195;
    expect(created.some((r) => r.data.kcal === totalIfSummed)).toBe(false);

    // Confirmation lists per-row numbers + an estimate note (mixed plate), prose in the caption lang.
    expect(confirmation?.text).toContain('330');
    expect(confirmation?.text).toContain('250');
    expect(confirmation?.text).toContain('195');
    expect(confirmation?.text).toContain('±20');
    // The plate total is a reply-only additional row, summed in code (not stored) — shown to the user.
    expect(confirmation?.text).toContain(String(totalIfSummed)); // 775, in the message only
  });

  it('CRITICAL: never writes the image bytes anywhere during a full logPhoto run (invariant #4)', async () => {
    // ESM namespaces aren't spy-able, so the fs write paths are mocked at module scope (see top of
    // file) with tracked fns. A full logPhoto run must touch none of them — the image lives only in
    // the base64 string and is discarded (invariant #4).
    const { client } = makePhotoFake([]);
    const svc = createFoodService(client, makePlateAnthropic(), 'Europe/Kyiv', NOON);

    await svc.logPhoto(99n, 'plate', ['BASE64BYTES']);

    expect(fsWriteFile).not.toHaveBeenCalled();
    expect(fsWriteFileSync).not.toHaveBeenCalled();
    expect(fsCreateWriteStream).not.toHaveBeenCalled();
    expect(fspWriteFile).not.toHaveBeenCalled();
  });

  it('returns null for an unknown chat_id (no user → no write)', async () => {
    const { client, created } = makePhotoFake([]);
    (client.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await createFoodService(
      client,
      makePlateAnthropic(),
      'Europe/Kyiv',
      NOON,
    ).logPhoto(99n, 'plate', ['BASE64']);

    expect(result).toBeNull();
    expect(created).toHaveLength(0);
  });

  it('returns null and writes nothing when vision finds no items', async () => {
    const { client, created } = makePhotoFake([]);
    const svc = createFoodService(client, makePlateAnthropic({ items: [] }), 'Europe/Kyiv', NOON);

    const result = await svc.logPhoto(99n, '', ['BASE64']);

    expect(result).toBeNull();
    expect(created).toHaveLength(0);
  });
});

// --- Photo-label (label-as-fact + caption-drives + multi-image) -----------------------------------

// A captioned label+text-only plate: a nutrition-label item (protein powder, fromLabel=true, per100g)
// plus a text-only item with no photo (1 tsp sugar, fromLabel=false).
const LABEL_PLATE = {
  items: [
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
      name: 'сахар',
      per: 'portion',
      kcal: 16,
      proteinG: 0,
      fatG: 0,
      carbsG: 4,
      qty: 1,
      fromLabel: false,
    },
  ],
};

describe('createFoodService.logPhoto — photo-label', () => {
  it('writes a fromLabel item as FACT with label macros scaled by qty, not overridden by a Food-DB match', async () => {
    // The catalog has a stale 'protein' row — a label the user showed must win (precedence label >
    // Food-DB): the row keeps its printed macros, source fact, no foodDbId (invariant #3 extension).
    const { client, created } = makePhotoFake([
      { id: 77, name: 'protein', per: FoodPer.per100g, kcal: 999, proteinG: 1, fatG: 1, carbsG: 1 },
    ]);
    const svc = createFoodService(client, makePlateAnthropic(LABEL_PLATE), 'Europe/Kyiv', NOON);

    await svc.logPhoto(99n, 'protein 25g, 1 tsp sugar', ['LABEL_BASE64']);

    const protein = created[0]?.data;
    expect(protein?.userId).toBe(7); // tenant-scoped (invariant #8)
    expect(protein?.source).toBe(FoodSource.fact); // label = fact
    expect(protein?.foodDbId).toBeNull(); // NOT a catalog row — the label's own macros
    expect(protein?.kcal).toBe(95); // 380 × 25/100 in code (invariant #2), never the 999 catalog row
    expect(protein?.proteinG).toBe(20); // 80 × 0.25
  });

  it('caption-drives: a text-only item (no photo, no catalog) is still logged as an estimate — not dropped', async () => {
    const { client, created } = makePhotoFake([]); // catalog empty → sugar misses
    const svc = createFoodService(client, makePlateAnthropic(LABEL_PLATE), 'Europe/Kyiv', NOON);

    await svc.logPhoto(99n, 'protein 25g, 1 tsp sugar', ['LABEL_BASE64']);

    expect(created).toHaveLength(2); // both the label item AND the text-only sugar (none omitted)
    const sugar = created.find((r) => r.data.entryName === 'сахар')?.data;
    expect(sugar).toBeDefined();
    expect(sugar?.source).toBe(FoodSource.estimate); // typical macros, honest estimate
    expect(sugar?.kcal).toBe(16); // portion ×1, its own macros scaled in code
  });

  it('multi-image group: ONE vision call over all images, one row per caption item, tenant-scoped', async () => {
    const { client, created } = makePhotoFake([]);
    const { anthropic, create } = makePlateAnthropicSpy(LABEL_PLATE);
    const svc = createFoodService(client, anthropic, 'Europe/Kyiv', NOON);

    await svc.logPhoto(99n, 'protein 25g, 1 tsp sugar', ['IMG_A', 'IMG_B', 'IMG_C']);

    expect(create).toHaveBeenCalledTimes(1); // exactly one vision call for the whole group (invariant #5)
    const sent = create.mock.calls[0]?.[0] as { messages: { content: { type: string }[] }[] };
    const imageBlocks = sent.messages[0]?.content.filter((b) => b.type === 'image');
    expect(imageBlocks).toHaveLength(3); // all three images ride the single call
    expect(created).toHaveLength(2); // one row per caption item
    expect(created.every((r) => r.data.userId === 7)).toBe(true); // tenant-scoped (invariant #8)
  });

  it('CRITICAL: writes no image bytes anywhere across a MULTI-image logPhoto run (invariant #4)', async () => {
    const { client } = makePhotoFake([]);
    const svc = createFoodService(client, makePlateAnthropic(LABEL_PLATE), 'Europe/Kyiv', NOON);

    await svc.logPhoto(99n, 'protein 25g, 1 tsp sugar', ['IMG_A', 'IMG_B', 'IMG_C']);

    expect(fsWriteFile).not.toHaveBeenCalled();
    expect(fsWriteFileSync).not.toHaveBeenCalled();
    expect(fsCreateWriteStream).not.toHaveBeenCalled();
    expect(fspWriteFile).not.toHaveBeenCalled();
  });
});

// --- Plate ask (food-photo-ask): flag → hold → text-only refine → log; expiry logs all as estimate --

const makePlateAnthropicSpy = (
  plate: unknown,
): { anthropic: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(plate) }],
    usage: { cache_read_input_tokens: 0 },
  });
  return { anthropic: { messages: { create } } as unknown as Anthropic, create };
};

// A pending photo Open Question: two held items (a miss-estimate salad + a rice that hits the
// catalog), the model-written clarify question in Russian (its language localizes the confirmation).
const photoPending = (over: Partial<PhotoOpenQuestion> = {}): PhotoOpenQuestion => ({
  variant: 'photo',
  items: [
    {
      name: 'салат',
      per: FoodPer.dish,
      base: { kcal: 120, proteinG: 4, fatG: 6, carbsG: 12 },
      qty: 1,
      unit: 'dish',
      source: FoodSource.estimate,
      foodDbId: null,
    },
    {
      name: 'рис',
      per: FoodPer.per100g,
      base: { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28 },
      qty: 150,
      unit: 'g',
      source: FoodSource.estimate,
      foodDbId: null,
    },
  ] as ResolvedFood[],
  caption: 'салат и рис',
  clarification: {
    kind: 'descriptor',
    unknown: 'dressing',
    question: 'Салат с заправкой?',
    options: [
      { label: 'yes', value: 'yes' },
      { label: 'no', value: 'no' },
    ],
  },
  meal: Meal.lunch,
  date: '2026-06-29',
  askedAt: new Date('2026-06-29T10:00:00Z'),
  ...over,
});

describe('createFoodService.logPhoto — plate ask', () => {
  it('a flagged plate asks and writes NO row until answered (holds a photo Open Question)', async () => {
    const { client, created } = makePhotoFake([]);
    const anthropic = makePlateAnthropic({
      items: PLATE.items,
      clarify: { unknown: 'dressing', question: 'Салат с заправкой?', options: ['yes', 'no'] },
    });

    const outcome = await createFoodService(client, anthropic, 'Europe/Kyiv', NOON).logPhoto(
      99n,
      'салат',
      ['BASE64'],
    );

    expect(outcome?.kind).toBe('ask'); // deferred, not logged
    expect(created).toHaveLength(0); // nothing written yet (invariant: ask ≠ log)
    if (outcome?.kind === 'ask') {
      expect(outcome.pending.variant).toBe('photo');
      expect(outcome.question.text).toContain('заправк'); // the model's question, user's language
      expect(outcome.question.options).toHaveLength(2); // inline-keyboard fixed choices
    }
  });

  it('an UNFLAGGED plate still logs immediately (regression — no clarify, no ask)', async () => {
    const { client, created } = makePhotoFake([]);
    const outcome = await createFoodService(
      client,
      makePlateAnthropic(),
      'Europe/Kyiv',
      NOON,
    ).logPhoto(99n, 'plate', ['BASE64']);

    expect(outcome?.kind).toBe('logged');
    expect(created).toHaveLength(3); // one row per item, straight through
  });

  it('a clarify with a BLANK question logs the items, never asks (would be an empty Telegram send)', async () => {
    // The model occasionally emits a clarify whose required `question` is "" — asking it would send an
    // empty message (Telegram 400). isAskable drops it → the plate logs (estimate is the fallback, #3).
    const { client, created } = makePhotoFake([]);
    const anthropic = makePlateAnthropic({
      items: PLATE.items,
      clarify: { unknown: 'portion', question: '   ' },
    });

    const outcome = await createFoodService(client, anthropic, 'Europe/Kyiv', NOON).logPhoto(
      99n,
      'plate',
      ['BASE64'],
    );

    expect(outcome?.kind).toBe('logged'); // logged, NOT ask
    expect(created).toHaveLength(3); // one row per item
  });
});

describe('createFoodService.resolveAnswer — photo variant', () => {
  // An added-fat answer comes back as a SEPARATE 'масло' item (FIX 1) so the mover survives the
  // caller's resolvePlate rebuild — the two original items are unchanged, the oil is appended.
  const refined = {
    items: [
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
        name: 'рис',
        per: 'per100g',
        kcal: 130,
        proteinG: 2.7,
        fatG: 0.3,
        carbsG: 28,
        qty: 150,
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
    ],
  };

  it('refines the held items by ONE text-only call and logs the added mover as its own row', async () => {
    // 'рис' hits the catalog → a fact after refine; 'салат' misses → estimate (invariant #3).
    const { client, created, findMany } = makePhotoFake([
      {
        id: 50,
        name: 'рис',
        per: FoodPer.per100g,
        kcal: 130,
        proteinG: 2.7,
        fatG: 0.3,
        carbsG: 28,
      },
    ]);
    const { anthropic, create } = makePlateAnthropicSpy(refined);

    const confirmation = await createFoodService(
      client,
      anthropic,
      'Europe/Kyiv',
      NOON,
    ).resolveAnswer(99n, photoPending(), 'с оливковым маслом');

    expect(create).toHaveBeenCalledTimes(1); // exactly one refine call (invariant #5)
    // The refine is TEXT-ONLY — no image block, only the held items + the answer (invariants #1/#4).
    const sent = create.mock.calls[0]?.[0] as { messages: { content: unknown }[] };
    expect(typeof sent.messages[0]?.content).toBe('string');
    expect(sent.messages).toHaveLength(1); // no chat history (invariant #1)

    expect(findMany).toHaveBeenCalledTimes(1); // ONE batched re-resolve lookup (no N+1)
    expect(created).toHaveLength(3); // salad + rice + the appended oil mover (FIX 1)
    expect(created.every((r) => r.data.userId === 7)).toBe(true); // tenant-scoped (invariant #8)
    expect(created[0]?.data.source).toBe(FoodSource.estimate); // salad miss
    expect(created[0]?.data.kcal).toBe(120); // dish ×1, scaled in code (#2)
    expect(created[1]?.data.source).toBe(FoodSource.fact); // rice catalog hit
    expect(created[1]?.data.foodDbId).toBe(50);
    expect(created[1]?.data.kcal).toBe(195); // 130 ×150/100 in code (invariant #2)
    // The added fat is logged as its OWN estimate row — the mover is NOT dropped into a fact item.
    const oil = created.find((r) => r.data.entryName === 'масло')?.data;
    expect(oil?.source).toBe(FoodSource.estimate);
    expect(oil?.kcal).toBe(120);
    expect(created[0]?.data.meal).toBe(Meal.lunch); // from the ask event, not re-inferred
    expect(created[0]?.data.date).toEqual(new Date('2026-06-29T00:00:00.000Z')); // captured date
    expect(confirmation?.text).toContain('195'); // per-row numbers, prose in Russian
    expect(confirmation?.text.startsWith('Записал')).toBe(true); // language from the stored caption
  });

  it('CRITICAL: the photo refine writes no image bytes anywhere (invariant #4)', async () => {
    const { client } = makePhotoFake([]);
    const { anthropic } = makePlateAnthropicSpy(refined);

    await createFoodService(client, anthropic, 'Europe/Kyiv', NOON).resolveAnswer(
      99n,
      photoPending(),
      'no',
    );

    expect(fsWriteFile).not.toHaveBeenCalled();
    expect(fsWriteFileSync).not.toHaveBeenCalled();
    expect(fsCreateWriteStream).not.toHaveBeenCalled();
    expect(fspWriteFile).not.toHaveBeenCalled();
  });

  it('scopes plate writes to the acting user (two-user isolation, invariant #8)', async () => {
    const { client, created } = makePhotoFake([]);
    (client.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 8 });
    const { anthropic } = makePlateAnthropicSpy(refined);

    await createFoodService(client, anthropic, 'Europe/Kyiv', NOON).resolveAnswer(
      42n,
      photoPending(),
      'no',
    );

    expect(created.length).toBeGreaterThan(0);
    expect(created.every((r) => r.data.userId === 8)).toBe(true); // only the acting tenant
    expect(created.some((r) => r.data.userId === 7)).toBe(false);
  });
});

describe('createFoodService.logExpiredEstimate — photo variant', () => {
  // Held items already tagged at ask time: a catalog `fact` (rice) + a visual `estimate` (salad).
  const mixedItems: ResolvedFood[] = [
    {
      name: 'рис',
      per: FoodPer.per100g,
      base: { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28 },
      qty: 150,
      unit: 'g',
      source: FoodSource.fact,
      foodDbId: 50,
    },
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

  it('logs EVERY held item AS-IS, preserving each resolved source, no LLM call, never dropped (#3)', async () => {
    const { client, created, findMany } = makePhotoFake([]);
    const { anthropic, create } = makePlateAnthropicSpy({ items: [] });

    const confirmation = await createFoodService(
      client,
      anthropic,
      'Europe/Kyiv',
      NOON,
    ).logExpiredEstimate(99n, photoPending({ items: mixedItems }));

    expect(create).not.toHaveBeenCalled(); // no model call on expiry (invariant #5)
    expect(findMany).not.toHaveBeenCalled(); // no catalog re-resolve — items written as-is
    expect(created).toHaveLength(2); // both held items written, none dropped (invariant #3)
    expect(created.every((r) => r.data.userId === 7)).toBe(true); // tenant-scoped (invariant #8)
    // The catalog fact STAYS a fact; the visual estimate STAYS an estimate (invariant #3, FIX 2).
    expect(created[0]?.data.source).toBe(FoodSource.fact);
    expect(created[0]?.data.foodDbId).toBe(50);
    expect(created[0]?.data.kcal).toBe(195); // 130 ×150/100 from the held macros, in code
    expect(created[1]?.data.source).toBe(FoodSource.estimate);
    expect(created[1]?.data.foodDbId).toBeNull();
    expect(created[0]?.data.date).toEqual(new Date('2026-06-29T00:00:00.000Z')); // captured date
    expect(confirmation?.text).toContain('±20'); // honest estimate note (a mixed plate has one)
  });
});

describe('createFoodService — Notion mirror enqueue (US-10)', () => {
  const spyOutbox = (): NotionOutbox => ({ enqueue: vi.fn().mockResolvedValue(undefined) });

  it('enqueues a food_log job for the tenant after a direct log (invariant #8)', async () => {
    const { client } = makeFake({
      id: 42,
      name: 'куриное филе',
      per: FoodPer.per100g,
      kcal: 165,
      proteinG: 31,
      fatG: 3.6,
      carbsG: 0,
    });
    const outbox = spyOutbox();

    await createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON, outbox).logFood(
      99n,
      '200г куриного филе',
      { date: '2026-06-30', product: 'куриного филе', quantity: 200, unit: 'г' },
    );

    expect(outbox.enqueue).toHaveBeenCalledWith({
      sourceTable: 'food_log',
      sourceId: 1,
      userId: 7,
    });
  });

  it('enqueues a food_log job per plate row (photo path)', async () => {
    const { client } = makePhotoFake([]);
    const outbox = spyOutbox();

    await createFoodService(client, makePlateAnthropic(), 'Europe/Kyiv', NOON, outbox).logPhoto(
      99n,
      'plate',
      ['BASE64'],
    );

    expect(outbox.enqueue).toHaveBeenCalledTimes(3); // one per item
    expect(outbox.enqueue).toHaveBeenCalledWith({
      sourceTable: 'food_log',
      sourceId: 1,
      userId: 7,
    });
  });

  it('enqueues a food_database job after add-to-catalog', async () => {
    const { client } = makeFake(null, {
      id: 1,
      userId: 7,
      entryName: 'борщ',
      qty: 200,
      unit: 'g',
      kcal: 120,
      proteinG: 3,
      fatG: 0.4,
      carbsG: 28,
      foodDbId: null,
    });
    const outbox = spyOutbox();

    await createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON, outbox).saveToCatalog(
      99n,
      1,
    );

    expect(outbox.enqueue).toHaveBeenCalledWith({
      sourceTable: 'food_database',
      sourceId: 99, // the new food_database row id
      userId: 7,
    });
  });

  it('enqueues a food_log job for the corrected (same) row', async () => {
    const lastRow = {
      id: 42,
      userId: 7,
      entryName: 'куриное филе',
      qty: 200,
      unit: 'g',
      kcal: 330,
      proteinG: 62,
      fatG: 7.2,
      carbsG: 0,
      source: FoodSource.fact,
      foodDbId: 5,
      date: new Date('2026-06-30T00:00:00.000Z'),
      meal: 'lunch',
    };
    const client = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 7 }) },
      foodDatabase: { findFirst: vi.fn().mockResolvedValue(null) },
      foodLog: {
        findFirst: vi.fn().mockResolvedValue(lastRow),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
      },
    } as unknown as FoodClient;
    const outbox = spyOutbox();

    await createFoodService(client, makeAnthropic(), 'Europe/Kyiv', NOON, outbox).correctLast(
      99n,
      '150г',
      { date: '2026-06-30', quantity: 150, unit: 'г' },
    );

    expect(outbox.enqueue).toHaveBeenCalledWith({
      sourceTable: 'food_log',
      sourceId: 42, // the SAME row id → the worker patches the existing page
      userId: 7,
    });
  });
});

describe('createFoodService.saveToCatalog', () => {
  it('reconstructs the per-basis macros from the logged row and stores a user-owned entry', async () => {
    // The logged estimate row the button refers to (200 g, per100g basis, scaled).
    const { client, catalogCreates } = makeFake(null, {
      id: 1,
      userId: 7,
      entryName: 'борщ',
      qty: 200,
      unit: 'g',
      kcal: 120,
      proteinG: 3,
      fatG: 0.4,
      carbsG: 28,
      foodDbId: null,
    });

    const result = await service(client).saveToCatalog(99n, 1);

    expect(result.saved).toBe(true);
    expect(result.entryName).toBe('борщ'); // localizes the reply (invariant #6)
    const entry = catalogCreates[0]?.data;
    expect(entry?.userId).toBe(7); // tenant-owned
    expect(entry?.per).toBe(FoodPer.per100g);
    expect(entry?.kcal).toBe(60); // 120 / (200/100)
  });
});
