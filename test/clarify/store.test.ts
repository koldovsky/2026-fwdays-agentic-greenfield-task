import { describe, expect, it } from 'vitest';
import { TTL_MS, isExpired, peek, set, take } from '../../src/clarify/store.js';
import type { OpenQuestion } from '../../src/clarify/types.js';
import type { ResolvedFood } from '../../src/food/types.js';

// In-memory Open Question store (ADR-0019): set/peek/take round-trip, at most one pending per chat,
// and a PURE isExpired against an injected clock — no timer, no DB (invariant #5). The store holds
// only the pending question's own data, never a chat transcript (invariant #1).

const resolved: ResolvedFood = {
  name: 'творог',
  per: 'per100g',
  base: { kcal: 100, proteinG: 16, fatG: 5, carbsG: 3 },
  qty: 100,
  unit: 'g',
  source: 'estimate',
  foodDbId: null,
};

const question = (askedAt: Date): OpenQuestion => ({
  resolved,
  parsed: { product: 'творог', qty: undefined, unit: '' },
  clarification: { kind: 'descriptor', unknown: 'fat%', question: 'Какой жирности?' },
  meal: 'lunch',
  date: '2026-06-30',
  askedAt,
});

describe('clarify store', () => {
  it('set → peek returns the question without removing it', () => {
    const chatId = 101n;
    set(chatId, question(new Date()));

    expect(peek(chatId)?.resolved.name).toBe('творог');
    expect(peek(chatId)).not.toBeNull(); // peek is non-destructive

    take(chatId);
  });

  it('take reads and removes — a second take is null (one-shot)', () => {
    const chatId = 102n;
    set(chatId, question(new Date()));

    expect(take(chatId)?.date).toBe('2026-06-30');
    expect(take(chatId)).toBeNull();
    expect(peek(chatId)).toBeNull();
  });

  it('holds at most one pending question per chat (a second set replaces the first)', () => {
    const chatId = 103n;
    set(chatId, question(new Date('2026-06-29T10:00:00Z')));
    set(chatId, question(new Date('2026-06-30T10:00:00Z')));

    expect(peek(chatId)?.askedAt).toEqual(new Date('2026-06-30T10:00:00Z'));

    take(chatId);
  });

  it('stores only the pending question data — no chat transcript (invariant #1)', () => {
    const chatId = 104n;
    const stored = question(new Date());
    set(chatId, stored);

    expect(Object.keys(peek(chatId) ?? {}).sort()).toEqual(
      ['askedAt', 'clarification', 'date', 'meal', 'parsed', 'resolved'].sort(),
    );

    take(chatId);
  });
});

describe('isExpired (pure, injected clock)', () => {
  const askedAt = new Date('2026-06-30T10:00:00.000Z');

  it('is false within the TTL', () => {
    expect(isExpired(askedAt, new Date(askedAt.getTime() + TTL_MS - 1))).toBe(false);
  });

  it('is false exactly at the TTL boundary', () => {
    expect(isExpired(askedAt, new Date(askedAt.getTime() + TTL_MS))).toBe(false);
  });

  it('is true past the TTL', () => {
    expect(isExpired(askedAt, new Date(askedAt.getTime() + TTL_MS + 1))).toBe(true);
  });
});
