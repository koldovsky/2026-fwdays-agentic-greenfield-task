import type { PrismaService } from '../prisma/prisma.service';
import type { AnthropicService } from './anthropic.service';
import { InsightService } from './insight.service';

interface InsightRowStore {
  text: string;
  source: string;
  model: string | null;
  localDate: string;
  createdAt: Date;
}

/** In-memory stand-in for the slices of PrismaClient the insight service uses. */
function makePrisma(
  opts: { cached?: InsightRowStore | null; entries?: unknown[] } = {},
) {
  const calls = { findUnique: 0, findMany: 0, upsert: 0 };
  const client = {
    dailyInsight: {
      findUnique: () => {
        calls.findUnique++;
        return Promise.resolve(opts.cached ?? null);
      },
      upsert: ({
        create,
      }: {
        create: {
          text: string;
          source: string;
          model: string | null;
          localDate: string;
        };
      }) => {
        calls.upsert++;
        return Promise.resolve({
          ...create,
          id: 'i1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      },
    },
    timeEntry: {
      findMany: () => {
        calls.findMany++;
        return Promise.resolve(opts.entries ?? []);
      },
    },
  };
  return { client, calls };
}

function fakeAnthropic(over: Partial<AnthropicService>): AnthropicService {
  return {
    isEnabled: () => false,
    getModel: () => 'test-model',
    generate: () => Promise.resolve(''),
    ...over,
  } as AnthropicService;
}

function service(
  prisma: ReturnType<typeof makePrisma>['client'],
  anthropic: AnthropicService,
) {
  return new InsightService(prisma as unknown as PrismaService, anthropic);
}

describe('InsightService', () => {
  it('serves the deterministic fallback when the LLM is disabled (FR-INSIGHT-06)', async () => {
    const { client, calls } = makePrisma({ entries: [] });
    const res = await service(
      client,
      fakeAnthropic({ isEnabled: () => false }),
    ).getForToday('u1', 'UTC');
    expect(res.source).toBe('fallback');
    expect(res.text.length).toBeGreaterThan(0);
    expect(calls.upsert).toBe(1);
  });

  it('returns the cached insight without regenerating (FR-INSIGHT-03, NFR-COST-01)', async () => {
    const cached: InsightRowStore = {
      text: 'cached sentence',
      source: 'llm',
      model: 'test-model',
      localDate: '2026-06-14',
      createdAt: new Date(),
    };
    const { client, calls } = makePrisma({ cached });
    const res = await service(
      client,
      fakeAnthropic({ isEnabled: () => true }),
    ).getForToday('u1', 'UTC');
    expect(res.text).toBe('cached sentence');
    expect(calls.findMany).toBe(0); // no history load
    expect(calls.upsert).toBe(0); // no generation
  });

  it('uses sanitized LLM output when enabled and valid (FR-INSIGHT-02/05)', async () => {
    const { client } = makePrisma({ entries: [] });
    const anthropic = fakeAnthropic({
      isEnabled: () => true,
      generate: () => Promise.resolve('You tracked 0h today, a calm start.'),
    });
    const res = await service(client, anthropic).getForToday('u1', 'UTC');
    expect(res.source).toBe('llm');
    expect(res.text).toBe('You tracked 0h today, a calm start.');
  });

  it('falls back when the LLM output violates the guardrails (FR-INSIGHT-05)', async () => {
    const { client } = makePrisma({ entries: [] });
    const anthropic = fakeAnthropic({
      isEnabled: () => true,
      generate: () => Promise.resolve('🎉 You tracked 999 hours today!!!'),
    });
    const res = await service(client, anthropic).getForToday('u1', 'UTC');
    expect(res.source).toBe('fallback');
  });

  it('falls back when the LLM call throws/times out (FR-INSIGHT-06)', async () => {
    const { client } = makePrisma({ entries: [] });
    const anthropic = fakeAnthropic({
      isEnabled: () => true,
      generate: () => Promise.reject(new Error('timeout')),
    });
    const res = await service(client, anthropic).getForToday('u1', 'UTC');
    expect(res.source).toBe('fallback');
  });
});
