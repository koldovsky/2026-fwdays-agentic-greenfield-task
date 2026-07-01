import { describe, expect, it } from 'vitest';
import { decideAskOrLog } from '../../src/clarify/decide.js';
import type { Clarification } from '../../src/clarify/types.js';
import type { CatalogMatch } from '../../src/food/lookup.js';
import type { ResolvedFood } from '../../src/food/types.js';

// Ask-vs-log discrimination (ADR-0015, invariant #3): asks on a hidden high-leverage unknown (the
// estimate call's `clarify`) and on >1 catalog match (code); logs directly on a clean single match,
// complete input, or sub-threshold uncertainty (the model omits `clarify`, so decide sees null).

const resolved: ResolvedFood = {
  name: 'творог',
  per: 'per100g',
  base: { kcal: 100, proteinG: 16, fatG: 5, carbsG: 3 },
  qty: 100,
  unit: 'g',
  source: 'estimate',
  foodDbId: null,
};

const match = (over: Partial<CatalogMatch> = {}): CatalogMatch => ({
  id: 1,
  name: 'творог',
  per: 'per100g',
  base: { kcal: 100, proteinG: 16, fatG: 5, carbsG: 3 },
  ...over,
});

const clarify: Clarification = {
  kind: 'descriptor',
  unknown: 'fat%',
  question: 'Какой жирности творог? 0 / 5 / 9%?',
  options: [
    { label: '0%', value: '0%' },
    { label: '5%', value: '5%' },
    { label: '9%', value: '9%' },
  ],
};

describe('decideAskOrLog', () => {
  it('asks on a hidden high-leverage unknown (estimate clarify field)', () => {
    const decision = decideAskOrLog(resolved, clarify, []);

    expect(decision).not.toBeNull();
    expect(decision?.kind).toBe('descriptor');
    expect(decision?.unknown).toBe('fat%');
    expect(decision?.options?.map((o) => o.value)).toEqual(['0%', '5%', '9%']);
  });

  it('asks a disambiguation on >1 catalog match, carrying each candidate id as the choice value', () => {
    // Exact-name lookup means a >1 match is the SAME name from two rows (own + global) — so the
    // choices must be distinguishable and carry the row id, not the (identical) name.
    const candidates = [
      match({ id: 12, base: { kcal: 121, proteinG: 16, fatG: 5, carbsG: 3 } }),
      match({ id: 34, base: { kcal: 159, proteinG: 18, fatG: 9, carbsG: 3 } }),
    ];

    const decision = decideAskOrLog(resolved, null, candidates);

    expect(decision?.kind).toBe('disambiguation');
    expect(decision?.options?.map((o) => o.value)).toEqual(['12', '34']); // ids, not the shared name
    // Labels distinguish the otherwise-identical name by its kcal (the figure the choice turns on).
    expect(decision?.options?.[0]?.label).toContain('121');
    expect(decision?.options?.[1]?.label).toContain('159');
    expect(decision?.options?.[0]?.label).not.toBe(decision?.options?.[1]?.label);
  });

  it('logs directly on a clean single match (fact path, no question)', () => {
    expect(decideAskOrLog(resolved, null, [match()])).toBeNull();
  });

  it('logs directly on complete input / sub-threshold uncertainty (no clarify, no candidates)', () => {
    expect(decideAskOrLog(resolved, null, [])).toBeNull();
  });

  it('prefers the disambiguation when both a clarify and multiple matches are present', () => {
    const candidates = [match({ id: 1 }), match({ id: 2 })];

    expect(decideAskOrLog(resolved, clarify, candidates)?.kind).toBe('disambiguation');
  });
});
