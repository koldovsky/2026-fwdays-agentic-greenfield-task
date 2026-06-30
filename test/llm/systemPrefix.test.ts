import { describe, expect, it } from 'vitest';
import { SYSTEM_PREFIX, systemPrefixBlocks } from '../../src/llm/systemPrefix.js';

describe('SYSTEM_PREFIX', () => {
  it('carries the non-moralizing, numbers-not-verdict coaching voice (ADR-0015)', () => {
    expect(SYSTEM_PREFIX).toMatch(/no .*good.*or.*bad.*foods|no "good" or "bad" foods/i);
    expect(SYSTEM_PREFIX).toMatch(/guilt|shame/i);
    expect(SYSTEM_PREFIX).toMatch(/trade-?offs? in NUMBERS|numbers and their consequence/i);
  });

  it('names the high-leverage clarification checklist and the estimate fallback', () => {
    expect(SYSTEM_PREFIX).toMatch(/cooking fat/i);
    expect(SYSTEM_PREFIX).toMatch(/sauce\/dressing\/mayo/i);
    expect(SYSTEM_PREFIX).toMatch(/fried vs baked/i);
    expect(SYSTEM_PREFIX).toMatch(/творог 0\/5\/9/);
    expect(SYSTEM_PREFIX).toMatch(/ONE batched question/i);
    expect(SYSTEM_PREFIX).toMatch(/estimate is\s+the fallback, not the first move/i);
  });

  it('states the language-mirror rule with English structural fields (invariant #6)', () => {
    expect(SYSTEM_PREFIX).toMatch(/Mirror the user.s language/i);
    expect(SYSTEM_PREFIX).toMatch(/stay English/i);
  });

  it('is emitted as exactly one cached block (invariant #5 — one cached prefix)', () => {
    const blocks = systemPrefixBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe(SYSTEM_PREFIX);
    expect(blocks[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });
});
