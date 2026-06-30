import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { FoodPer, FoodSource } from '@prisma/client';
import { resolveFood } from '../../src/food/resolve.js';
import type { FoodClient } from '../../src/food/types.js';

// Fact vs estimate tagging (invariant #3) + the no-agent-loop rule (invariant #5): a catalog hit is a
// fact with zero LLM calls; a miss is an estimate from EXACTLY one structured call.

const makeClient = (
  match: unknown,
): { client: FoodClient; findFirst: ReturnType<typeof vi.fn> } => {
  const findFirst = vi.fn().mockResolvedValue(match);
  const client = { foodDatabase: { findFirst } } as unknown as FoodClient;
  return { client, findFirst };
};

const makeAnthropic = (): { client: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify({ per: 'per100g', kcal: 200, proteinG: 10, fatG: 12, carbsG: 8 }),
      },
    ],
    usage: { cache_read_input_tokens: 0 },
  });
  return { client: { messages: { create } } as unknown as Anthropic, create };
};

describe('resolveFood', () => {
  it('tags a Food DB match as fact, links foodDbId, and makes NO LLM call', async () => {
    const { client } = makeClient({
      id: 42,
      name: 'куриное филе',
      per: FoodPer.per100g,
      kcal: 165,
      proteinG: 31,
      fatG: 3.6,
      carbsG: 0,
    });
    const { client: anthropic, create } = makeAnthropic();

    const resolved = await resolveFood(client, anthropic, 1, {
      product: 'куриное филе',
      qty: 200,
      unit: 'г',
    });

    expect(resolved.source).toBe(FoodSource.fact);
    expect(resolved.foodDbId).toBe(42);
    expect(resolved.base).toEqual({ kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0 });
    expect(resolved.unit).toBe('g');
    expect(create).not.toHaveBeenCalled();
  });

  it('falls back to an estimate (one call, foodDbId null) when there is no match', async () => {
    const { client } = makeClient(null);
    const { client: anthropic, create } = makeAnthropic();

    const resolved = await resolveFood(client, anthropic, 1, {
      product: 'борщ',
      qty: 1,
      unit: '',
    });

    expect(resolved.source).toBe(FoodSource.estimate);
    expect(resolved.foodDbId).toBeNull();
    expect(resolved.per).toBe(FoodPer.per100g);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
