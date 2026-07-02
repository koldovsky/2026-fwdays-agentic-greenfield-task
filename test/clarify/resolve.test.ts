import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { FoodPer, FoodSource, Meal } from '@prisma/client';
import { resolveAnswer } from '../../src/clarify/resolve.js';
import type { Clarification, TextOpenQuestion } from '../../src/clarify/types.js';
import type { FoodClient, ParsedFood, ResolvedFood } from '../../src/food/types.js';

// Answer resolution (design D3, revised): the pending question's `clarification.kind` — not the
// answer's shape — routes how the answer is applied. A quantity answer rescales in CODE with ZERO LLM
// calls (invariants #2/#5); a descriptor answer re-resolves with ≤1 call; a disambiguation answer
// selects the chosen catalog row BY ID (a fact, zero estimate calls). The written row is tenant-scoped
// (invariant #8) for the ORIGINAL date, never a hand-summed total (#2). Only the pending question +
// the reply reach the model — no chat history (invariant #1).

interface CreatedRow {
  data: Record<string, unknown>;
}

const makeClient = (
  match: unknown = null,
): { client: FoodClient; created: CreatedRow[]; findFirst: ReturnType<typeof vi.fn> } => {
  const created: CreatedRow[] = [];
  const findFirst = vi.fn().mockResolvedValue(match);
  const client = {
    foodDatabase: { findFirst },
    foodLog: {
      create: vi.fn((args: CreatedRow) => {
        created.push(args);
        return Promise.resolve({ id: 1, ...args.data });
      }),
    },
  } as unknown as FoodClient;

  return { client, created, findFirst };
};

const makeAnthropic = (
  estimate = { per: 'per100g', kcal: 90, proteinG: 18, fatG: 1.8, carbsG: 3.3 },
): { anthropic: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(estimate) }],
    usage: { cache_read_input_tokens: 0 },
  });
  return { anthropic: { messages: { create } } as unknown as Anthropic, create };
};

const resolved = (over: Partial<ResolvedFood> = {}): ResolvedFood => ({
  name: 'творог',
  per: FoodPer.per100g,
  base: { kcal: 100, proteinG: 16, fatG: 5, carbsG: 3 },
  qty: 100,
  unit: 'g',
  source: FoodSource.estimate,
  foodDbId: null,
  ...over,
});

const parsed: ParsedFood = { product: 'творог', qty: undefined, unit: '' };

const pending = (
  clarification: Clarification,
  over: Partial<ResolvedFood> = {},
): TextOpenQuestion => ({
  variant: 'text',
  resolved: resolved(over),
  parsed,
  clarification,
  meal: Meal.lunch,
  date: '2026-06-29',
  askedAt: new Date('2026-06-29T10:00:00Z'),
});

const quantity: Clarification = {
  kind: 'quantity',
  unknown: 'portion',
  question: 'Сколько грамм?',
};
const descriptor: Clarification = { kind: 'descriptor', unknown: 'fat%', question: 'Жирность?' };
const disambiguation: Clarification = {
  kind: 'disambiguation',
  unknown: 'catalog-match',
  question: 'творог',
  options: [
    { label: 'творог — 121 kcal/per100g', value: '12' },
    { label: 'творог — 159 kcal/per100g', value: '34' },
  ],
};

describe('resolveAnswer — quantity kind (zero LLM calls)', () => {
  it('rescales the pending basis in code and writes for the original date, tenant-scoped', async () => {
    const { client, created } = makeClient();
    const { anthropic, create } = makeAnthropic();

    const { confirmation } = await resolveAnswer(
      client,
      anthropic,
      7,
      pending(quantity),
      '150 грамм',
    );

    expect(create).not.toHaveBeenCalled(); // invariant #5 — quantity refine never touches the model
    const row = created[0]?.data;
    expect(row?.userId).toBe(7); // invariant #8
    expect(row?.qty).toBe(150);
    expect(row?.kcal).toBe(150); // base 100 × (150/100), computed in code (invariant #2)
    expect(row?.meal).toBe(Meal.lunch); // carried from the ask event, not re-inferred
    expect(row?.date).toEqual(new Date('2026-06-29T00:00:00.000Z')); // original back-dated day
    expect(confirmation.text).toContain('150');
    expect(confirmation.text.toLowerCase()).not.toContain('итого'); // no daily total
  });

  it('treats a bare number as a quantity (one serving basis), no model call', async () => {
    const { client, created } = makeClient();
    const { anthropic, create } = makeAnthropic();

    await resolveAnswer(client, anthropic, 7, pending(quantity), '200');

    expect(create).not.toHaveBeenCalled();
    expect(created[0]?.data.qty).toBe(200);
  });
});

describe('resolveAnswer — descriptor kind (≤1 LLM call)', () => {
  it('folds the descriptor into the product and re-resolves via exactly one estimate call', async () => {
    const { client, created } = makeClient(null);
    const { anthropic, create } = makeAnthropic();

    const { confirmation } = await resolveAnswer(client, anthropic, 7, pending(descriptor), '5%');

    expect(create).toHaveBeenCalledTimes(1); // descriptor re-resolve = at most one call (invariant #5)
    // Only the folded product string reaches the model — no prior turns (invariant #1).
    const sent = create.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(sent.messages).toHaveLength(1);
    expect(sent.messages[0]?.content).toContain('творог 5%');
    expect(created[0]?.data.userId).toBe(7); // invariant #8
    expect(created[0]?.data.source).toBe(FoodSource.estimate);
    expect(confirmation.text).toContain('±20'); // estimate surfaced honestly
    // Language mirrors the ORIGINAL product ('творог'), not the answer '5%' (which detects as en) —
    // invariant #6. Before the fix this said 'Logged:' for a Russian user.
    // TEMPORAL DEMO HACK (drop with the hack in src/util/lang.ts): Cyrillic is forced to Ukrainian; expect uk prose.
    expect(confirmation.text.startsWith('Записав')).toBe(true);
  });

  it('does NOT rescale a bare number answering a fat% question (no 5 → 5 g misroute)', async () => {
    const { client, created } = makeClient(null);
    const { anthropic, create } = makeAnthropic();

    await resolveAnswer(client, anthropic, 7, pending(descriptor), '5');

    // Routed by kind=descriptor → re-resolve "творог 5", never a 5-gram rescale of the basis.
    expect(create).toHaveBeenCalledTimes(1);
    const sent = create.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(sent.messages[0]?.content).toContain('творог 5');
    expect(created[0]?.data.qty).not.toBe(5);
  });
});

describe('resolveAnswer — disambiguation kind (select by id, zero estimate calls)', () => {
  it('selects the chosen catalog row by id and writes a fact', async () => {
    const { client, created, findFirst } = makeClient({
      id: 12,
      name: 'творог 5%',
      per: FoodPer.per100g,
      kcal: 121,
      proteinG: 16,
      fatG: 5,
      carbsG: 3,
    });
    const { anthropic, create } = makeAnthropic();

    // The `q:` tap resolves to the option value — the chosen row id "12".
    const { confirmation } = await resolveAnswer(
      client,
      anthropic,
      7,
      pending(disambiguation),
      '12',
    );

    expect(create).not.toHaveBeenCalled(); // Food-DB select = fact, no estimate call (invariant #5)
    // Confirmation mirrors the original product's language, not the numeric id answer (invariant #6).
    // TEMPORAL DEMO HACK (drop with the hack in src/util/lang.ts): Cyrillic is forced to Ukrainian; expect uk prose.
    expect(confirmation.text.startsWith('Записав')).toBe(true);
    // Real select-by-id: the query is scoped by the chosen id AND the tenant (catalogWhere nests the
    // caller's `{id}` filter alongside the own+global OR under AND) — not a wildcard that masks the bug.
    const where = findFirst.mock.calls[0]?.[0] as { where: { AND?: { id?: number }[] } };
    expect(where.where.AND?.[0]?.id).toBe(12);
    expect(created[0]?.data.source).toBe(FoodSource.fact);
    expect(created[0]?.data.foodDbId).toBe(12);
    expect(created[0]?.data.entryName).toBe('творог 5%');
  });

  it('falls back to a re-resolve when the chosen id no longer exists (never drops the entry)', async () => {
    const { client, created } = makeClient(null); // lookupById miss → resolveFood → estimate
    const { anthropic, create } = makeAnthropic();

    await resolveAnswer(client, anthropic, 7, pending(disambiguation), '99');

    expect(create).toHaveBeenCalledTimes(1); // one estimate call, still logs
    expect(created[0]?.data.source).toBe(FoodSource.estimate);
  });
});
