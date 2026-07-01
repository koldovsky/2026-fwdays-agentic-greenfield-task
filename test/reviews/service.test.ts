import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { createReviewsService } from '../../src/reviews/service.js';
import type { ProseGenerator, ReviewClient } from '../../src/reviews/types.js';

// Service wiring over a fake Prisma. The load-bearing invariants: every rendered number is the SUM /
// average of the (mocked) food_log — never the prose (invariant #2); exactly ONE prose call per
// review (invariant #5); persistence is idempotent on the unique key (M4); and every read/write is
// tenant-scoped to the resolved user (invariant #8). Prose is injected so the call count is spyable.

interface AggregateArgs {
  where: { userId: number; date: unknown };
}
interface UpsertArgs {
  where: { userId_period_periodStart: { userId: number; period: string; periodStart: Date } };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}

interface FakeOptions {
  userId?: number | null;
  targets?: {
    targetKcal: number | null;
    targetProteinG: number | null;
    targetFatG: number | null;
    targetCarbsG: number | null;
  };
  tz?: string;
  aggregate?: { kcal: number; proteinG: number; fatG: number; carbsG: number; count: number };
  foodRows?: { meal: string; source: string }[];
  groupRows?: { date: Date; _sum: Record<string, number> }[];
  metrics?: unknown[];
}

interface Fake {
  client: ReviewClient;
  aggregateArgs: { value: AggregateArgs | undefined };
  upserts: UpsertArgs[];
}

const makeFake = (options: FakeOptions = {}): Fake => {
  const userId = options.userId === undefined ? 7 : options.userId;
  const targets = options.targets ?? {
    targetKcal: 1600,
    targetProteinG: 120,
    targetFatG: 50,
    targetCarbsG: 150,
  };
  const agg = options.aggregate ?? { kcal: 1234, proteinG: 100, fatG: 60, carbsG: 120, count: 3 };
  const foodRows = options.foodRows ?? [
    { meal: 'breakfast', source: 'fact' },
    { meal: 'lunch', source: 'estimate' },
  ];
  const aggregateArgs: { value: AggregateArgs | undefined } = { value: undefined };
  const upserts: UpsertArgs[] = [];

  const client = {
    user: {
      findUnique: vi.fn((args: { where: Record<string, unknown> }) => {
        if ('chatId' in args.where) {
          return Promise.resolve(userId === null ? null : { id: userId });
        }
        return Promise.resolve({ tz: options.tz ?? 'Europe/Kyiv', ...targets });
      }),
    },
    foodLog: {
      aggregate: vi.fn((args: AggregateArgs) => {
        aggregateArgs.value = args;
        return Promise.resolve({
          _sum: { kcal: agg.kcal, proteinG: agg.proteinG, fatG: agg.fatG, carbsG: agg.carbsG },
          _count: agg.count,
        });
      }),
      findMany: vi.fn(() => Promise.resolve(foodRows)),
      groupBy: vi.fn(() => Promise.resolve(options.groupRows ?? [])),
    },
    bodyMetric: {
      findMany: vi.fn(() => Promise.resolve(options.metrics ?? [])),
    },
    review: {
      upsert: vi.fn((args: UpsertArgs) => {
        upserts.push(args);
        return Promise.resolve(undefined);
      }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as unknown as ReviewClient;

  return { client, aggregateArgs, upserts };
};

const fixedProse: ProseGenerator = () =>
  Promise.resolve({ drivers: 'жир 999 из масла', verdict: 'дефицит 888 итог' });

const WED = '2026-06-24'; // Wednesday, not month-end → daily only

describe('createReviewsService.generateDaily — numbers from the SUM (invariant #2)', () => {
  it('renders the calorie/macro totals straight from the aggregate, never the prose', async () => {
    const spy = vi.fn(fixedProse);
    const { client } = makeFake();

    const result = await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: spy,
    }).generateDaily(11n, { date: WED, triggerText: 'готово на сегодня' });

    expect(result?.text).toContain('Калории: 1234 / 1600');
    expect(result?.text).toContain('Белок: 100 / 120');
    // Fat 60 > 50 × 1.1 → over flag from code, protein 100 < 120 × 0.9 → under flag from code.
    expect(result?.text).toContain('⚠️ перебор');
    expect(result?.text).toContain('⚠️ недобор');
    // The prose numbers never leak into a numeric slot — they only appear in their own prose lines.
    expect(result?.text).toContain('Калории: 1234');
    expect(result?.text).not.toMatch(/Калории: (?!1234)/u);
  });

  it('makes EXACTLY one prose call per daily review (invariant #5)', async () => {
    const spy = vi.fn(fixedProse);
    const { client } = makeFake();

    await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: spy,
    }).generateDaily(11n, { date: WED, triggerText: 'готово' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('daily', expect.stringContaining('1234'));
  });

  it('makes ZERO prose calls for an empty day and nudges instead of zeros', async () => {
    const spy = vi.fn(fixedProse);
    const { client, upserts } = makeFake({
      aggregate: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, count: 0 },
      foodRows: [],
    });

    const result = await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: spy,
    }).generateDaily(11n, { date: WED });

    expect(spy).not.toHaveBeenCalled();
    expect(result?.text).not.toContain('Калории:');
    expect(result?.text).toContain('ничего не записано');
    expect(upserts).toHaveLength(1); // still persisted (the empty-day nudge is a review)
  });

  it('mirrors the trigger language (Ukrainian) while the stored period stays English', async () => {
    const { client, upserts } = makeFake();

    const result = await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: fixedProse,
    }).generateDaily(11n, { date: WED, triggerText: 'готово на сьогодні, їв' });

    expect(result?.text).toContain('Огляд дня'); // uk header
    expect(upserts[0]?.where.userId_period_periodStart.period).toBe('daily'); // English enum
  });
});

describe('createReviewsService.generateDaily — idempotency (M4)', () => {
  it('upserts on the same (user, daily, day) key on a re-trigger — one row, not two', async () => {
    const { client, upserts } = makeFake();
    const service = createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: fixedProse,
    });

    await service.generateDaily(11n, { date: WED });
    await service.generateDaily(11n, { date: WED });

    expect(upserts).toHaveLength(2);
    expect(upserts[0]?.where).toEqual(upserts[1]?.where);
    expect(upserts[0]?.where.userId_period_periodStart).toEqual({
      userId: 7,
      period: 'daily',
      periodStart: new Date('2026-06-24T00:00:00.000Z'),
    });
  });

  it('stores reviewed_flag=false for a cron trigger, true for a manual one', async () => {
    const { client, upserts } = makeFake();
    const service = createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: fixedProse,
    });

    await service.generateDaily(11n, { date: WED, reviewed: false });
    await service.generateDaily(11n, { date: WED, triggerText: 'готово' });

    expect(upserts[0]?.create.reviewedFlag).toBe(false);
    expect(upserts[1]?.create.reviewedFlag).toBe(true);
  });
});

describe('createReviewsService.generateDaily — tenant isolation (invariant #8)', () => {
  it('scopes the food SUM and the review write to the resolved user', async () => {
    const { client, aggregateArgs, upserts } = makeFake({ userId: 42 });

    await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: fixedProse,
    }).generateDaily(11n, { date: WED });

    expect(aggregateArgs.value?.where.userId).toBe(42);
    expect(upserts[0]?.where.userId_period_periodStart.userId).toBe(42);
    expect(upserts[0]?.create.userId).toBe(42);
  });

  it('returns null for an unknown chat_id — no read, no write', async () => {
    const { client, upserts } = makeFake({ userId: null });

    const result = await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: fixedProse,
    }).generateDaily(11n, { date: WED });

    expect(result).toBeNull();
    expect(upserts).toHaveLength(0);
  });
});

describe('createReviewsService.generateDaily — rollups (D6)', () => {
  it('a Sunday daily also generates the Mon–Sun weekly from raw groupBy rows', async () => {
    const spy = vi.fn(fixedProse);
    const { client, upserts } = makeFake({
      groupRows: [
        {
          date: new Date('2026-06-22T00:00:00.000Z'),
          _sum: { kcal: 1500, proteinG: 120, fatG: 40, carbsG: 130 },
        },
        {
          date: new Date('2026-06-28T00:00:00.000Z'),
          _sum: { kcal: 1700, proteinG: 130, fatG: 50, carbsG: 150 },
        },
      ],
    });

    const result = await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: spy,
    }).generateDaily(11n, { date: '2026-06-28' }); // Sunday

    const periods = upserts.map((u) => u.where.userId_period_periodStart.period);
    expect(periods).toContain('daily');
    expect(periods).toContain('weekly');
    // The weekly is delivered alongside the daily, not just persisted (M1 fix): it rides in `rollups`.
    expect(result?.rollups).toHaveLength(1);
    expect(result?.rollups[0]).toContain('Ревью недели');
    const weekly = upserts.find((u) => u.where.userId_period_periodStart.period === 'weekly');
    expect(weekly?.where.userId_period_periodStart.periodStart).toEqual(
      new Date('2026-06-22T00:00:00.000Z'),
    );
    // weekly average kcal = (1500+1700)/2 = 1600, rendered in code (invariant #2).
    expect(weekly?.create.body).toContain('1600');
    expect(spy).toHaveBeenCalledTimes(2); // one daily + one weekly call
  });

  it('a month-end daily also generates the monthly', async () => {
    const { client, upserts } = makeFake({
      groupRows: [
        {
          date: new Date('2026-06-30T00:00:00.000Z'),
          _sum: { kcal: 1600, proteinG: 120, fatG: 45, carbsG: 140 },
        },
      ],
    });

    await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: fixedProse,
    }).generateDaily(11n, { date: '2026-06-30' }); // last day of June

    const periods = upserts.map((u) => u.where.userId_period_periodStart.period);
    expect(periods).toContain('monthly');
    const monthly = upserts.find((u) => u.where.userId_period_periodStart.period === 'monthly');
    expect(monthly?.where.userId_period_periodStart.periodStart).toEqual(
      new Date('2026-06-01T00:00:00.000Z'),
    );
  });

  it('a non-boundary Wednesday generates only the daily', async () => {
    const { client, upserts } = makeFake();

    await createReviewsService(client, {
      anthropic: {} as Anthropic,
      generateProse: fixedProse,
    }).generateDaily(11n, { date: WED });

    const periods = upserts.map((u) => u.where.userId_period_periodStart.period);
    expect(periods).toEqual(['daily']);
  });
});
