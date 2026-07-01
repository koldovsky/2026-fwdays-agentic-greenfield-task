import { describe, expect, it } from 'vitest';
import { detectLang } from '../../src/util/lang.js';

// One home for prose-language detection (invariant #6): Ukrainian-specific letters (іїєґ) win over
// generic Cyrillic (а-яё), everything else defaults to English. This pins the table that was
// previously copy-pasted across the food/metrics/query surfaces.

describe('detectLang', () => {
  it('detects Ukrainian via Ukrainian-specific letters', () => {
    expect(detectLang('їжа')).toBe('uk');
    expect(detectLang('сир 5% жирності')).toBe('uk');
    expect(detectLang('ґудзик')).toBe('uk');
    expect(detectLang('ЇЖА')).toBe('uk'); // case-insensitive
  });

  it('detects Russian via Cyrillic without Ukrainian letters', () => {
    expect(detectLang('вес 89.2')).toBe('ru');
    expect(detectLang('сколько белка сегодня')).toBe('ru');
    expect(detectLang('ЁЖ')).toBe('ru'); // ё is Russian Cyrillic
  });

  it('defaults to English for Latin, digits, and empty input', () => {
    expect(detectLang('chicken breast 200g')).toBe('en');
    expect(detectLang('123')).toBe('en');
    expect(detectLang('')).toBe('en');
  });

  it('prefers Ukrainian when both Ukrainian and generic Cyrillic letters appear', () => {
    // 'їжа' mixes ї (uk-specific) with а (generic Cyrillic) — uk check runs first.
    expect(detectLang('смачна їжа')).toBe('uk');
  });
});
