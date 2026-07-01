import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { FoodPer, FoodSource } from '@prisma/client';
import type { Confirmation } from '../../src/food/types.js';
import type { LogOutcome } from '../../src/clarify/types.js';
import { createFoodService } from '../../src/food/service.js';
import type { FoodClient, FoodService } from '../../src/food/types.js';

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
    },
    { name: 'борщ', per: 'dish', kcal: 250, proteinG: 8, fatG: 10, carbsG: 30, qty: 1 },
    { name: 'рис', per: 'per100g', kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28, qty: 150 },
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

    const confirmation = await svc.logPhoto(99n, 'куриное филе, борщ и рис', 'BASE64');

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

    // Every row carries its OWN numbers; no per-plate total is computed or stored (invariant #2).
    const totalIfSummed = 330 + 250 + 195;
    expect(created.some((r) => r.data.kcal === totalIfSummed)).toBe(false);

    // Confirmation lists per-row numbers + an estimate note (mixed plate), prose in the caption lang.
    expect(confirmation?.text).toContain('330');
    expect(confirmation?.text).toContain('250');
    expect(confirmation?.text).toContain('195');
    expect(confirmation?.text).toContain('±20');
    expect(confirmation?.text).not.toContain(String(totalIfSummed));
  });

  it('CRITICAL: never writes the image bytes anywhere during a full logPhoto run (invariant #4)', async () => {
    // ESM namespaces aren't spy-able, so the fs write paths are mocked at module scope (see top of
    // file) with tracked fns. A full logPhoto run must touch none of them — the image lives only in
    // the base64 string and is discarded (invariant #4).
    const { client } = makePhotoFake([]);
    const svc = createFoodService(client, makePlateAnthropic(), 'Europe/Kyiv', NOON);

    await svc.logPhoto(99n, 'plate', 'BASE64BYTES');

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
    ).logPhoto(99n, 'plate', 'BASE64');

    expect(result).toBeNull();
    expect(created).toHaveLength(0);
  });

  it('returns null and writes nothing when vision finds no items', async () => {
    const { client, created } = makePhotoFake([]);
    const svc = createFoodService(client, makePlateAnthropic({ items: [] }), 'Europe/Kyiv', NOON);

    const result = await svc.logPhoto(99n, '', 'BASE64');

    expect(result).toBeNull();
    expect(created).toHaveLength(0);
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
