import { describe, expect, it } from 'vitest';
import { TTL_MS } from '../../src/clarify/store.js';
import { arm, isExpired, take } from '../../src/progress/store.js';

// Ephemeral arming flag (ADR-0019): arm → take returns the armed-at timestamp once (a second take is
// null); freshness is a pure `isExpired` reused from clarify/store (no re-implemented TTL); a
// never-armed chat reads null. Nothing is persisted (invariant #1).

describe('progress arming store', () => {
  it('arm then take returns the timestamp once (second take → null)', () => {
    const chatId = 201n;
    const before = Date.now();
    arm(chatId);

    const at = take(chatId);
    expect(at).toBeInstanceOf(Date);
    expect(at!.getTime()).toBeGreaterThanOrEqual(before);
    expect(take(chatId)).toBeNull(); // one-shot: consumed
  });

  it('a never-armed chat takes null', () => {
    expect(take(202n)).toBeNull();
  });

  it('an armed flag past TTL_MS reads as expired via the reused isExpired', () => {
    const armedAt = new Date('2026-06-30T10:00:00.000Z');
    expect(isExpired(armedAt, new Date(armedAt.getTime() + TTL_MS - 1))).toBe(false);
    expect(isExpired(armedAt, new Date(armedAt.getTime() + TTL_MS + 1))).toBe(true);
  });
});
