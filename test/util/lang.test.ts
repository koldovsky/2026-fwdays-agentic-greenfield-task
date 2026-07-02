import { describe, expect, it } from 'vitest';
import { detectLang, detectLangOrRu } from '../../src/util/lang.js';

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

  // TEMPORAL DEMO HACK (drop after demo): generic Cyrillic now maps to 'uk', not 'ru'.
  it('maps generic Cyrillic to Ukrainian (demo: never reply in Russian)', () => {
    expect(detectLang('вес 89.2')).toBe('uk');
    expect(detectLang('сколько белка сегодня')).toBe('uk');
    expect(detectLang('ЁЖ')).toBe('uk');
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

describe('detectLangOrRu', () => {
  // TEMPORAL DEMO HACK (drop after demo): no-signal default is 'uk', not 'ru'.
  it('defaults to Ukrainian when there is no text to detect from', () => {
    expect(detectLangOrRu(undefined)).toBe('uk');
    expect(detectLangOrRu(null)).toBe('uk');
    expect(detectLangOrRu('')).toBe('uk');
    expect(detectLangOrRu('   ')).toBe('uk');
  });

  it('delegates to detectLang when text carries a signal', () => {
    expect(detectLangOrRu('їжа')).toBe('uk');
    expect(detectLangOrRu('съел борщ')).toBe('uk'); // demo: generic Cyrillic -> uk
    expect(detectLangOrRu('chicken breast')).toBe('en');
  });
});
