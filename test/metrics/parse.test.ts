import { describe, expect, it } from 'vitest';
import { parseMetrics } from '../../src/metrics/parse.js';

// The parser is the whole "extraction" — deterministic, no LLM (invariant #5). It must map RU/UA/EN
// synonyms to the English columns (#6), accept `.`/`,` decimals, return only the present fields, skip
// unrecognized tokens, and drop out-of-range values. No number is ever emitted by a model (#2).

describe('parseMetrics', () => {
  it('maps a Russian weight + waist message to columns', () => {
    expect(parseMetrics('вес 89.2, талия 90')).toEqual({ weightKg: 89.2, waistCm: 90 });
  });

  it('maps Ukrainian synonyms to the same columns', () => {
    expect(parseMetrics('вага 88, талія 89, біцепс 35')).toEqual({
      weightKg: 88,
      waistCm: 89,
      bicepCm: 35,
    });
  });

  it('maps English synonyms to columns', () => {
    expect(parseMetrics('weight 89.2 waist 90 chest 102')).toEqual({
      weightKg: 89.2,
      waistCm: 90,
      chestCm: 102,
    });
  });

  it('accepts a comma decimal', () => {
    expect(parseMetrics('вес 89,2')).toEqual({ weightKg: 89.2 });
  });

  it('returns only the present fields (partial message)', () => {
    expect(parseMetrics('талия 90')).toEqual({ waistCm: 90 });
  });

  it('parses a keyword:number colon form', () => {
    expect(parseMetrics('вес: 90')).toEqual({ weightKg: 90 });
  });

  it('skips unrecognized tokens and bare numbers (no guessing)', () => {
    expect(parseMetrics('настроение 89.2')).toEqual({});
    expect(parseMetrics('89.2')).toEqual({});
  });

  it('drops an out-of-range weight (typo guard, mirrors onboarding 30–400)', () => {
    expect(parseMetrics('вес 8920')).toEqual({});
    expect(parseMetrics('вес 2')).toEqual({});
  });

  it('drops an out-of-range circumference but keeps a sane one in the same message', () => {
    expect(parseMetrics('талия 900, вес 89')).toEqual({ weightKg: 89 });
  });

  it('handles all six columns in one message', () => {
    expect(parseMetrics('вес 89, талия 90, грудь 100, бедра 95, бицепс 35, бедро 55')).toEqual({
      weightKg: 89,
      waistCm: 90,
      chestCm: 100,
      hipsCm: 95,
      bicepCm: 35,
      thighCm: 55,
    });
  });

  it('returns an empty object for prose with no measurements', () => {
    expect(parseMetrics('спасибо большое')).toEqual({});
  });

  it('does not substring-match a synonym mid-word (word-boundary anchored)', () => {
    expect(parseMetrics('warm 35')).toEqual({}); // not bicepCm via "arm"
    expect(parseMetrics('farm 35')).toEqual({});
    expect(parseMetrics('alarm 35')).toEqual({});
    expect(parseMetrics('многа 55')).toEqual({}); // not thighCm via "нога"
  });

  it('still matches a synonym at a word start (boundary, not adjacency)', () => {
    expect(parseMetrics('arm 35')).toEqual({ bicepCm: 35 });
    expect(parseMetrics('вес80')).toEqual({ weightKg: 80 }); // no space is fine
  });

  it('parses the Russian accusative "талию"', () => {
    expect(parseMetrics('померил талию 70')).toEqual({ waistCm: 70 });
  });
});
