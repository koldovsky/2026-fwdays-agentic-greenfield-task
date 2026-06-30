import { describe, expect, it } from 'vitest';
import { parseAsk } from '../../src/query/parseAsk.js';

// The parser is the whole "extraction" — deterministic, no LLM (invariant #5). It must map RU/UA/EN
// synonyms to the English nutrient field (#6), default to the full breakdown when no keyword is
// present, never mid-word-substring match, and handle a mixed-language ask.

describe('parseAsk', () => {
  it('maps Russian nutrient synonyms to fields', () => {
    expect(parseAsk('сколько белка сегодня?')).toEqual(['protein']);
    expect(parseAsk('сколько калорий было вчера?')).toEqual(['kcal']);
    expect(parseAsk('сколько жира сегодня?')).toEqual(['fat']);
    expect(parseAsk('сколько углеводов?')).toEqual(['carbs']);
  });

  it('maps Ukrainian nutrient synonyms to fields', () => {
    expect(parseAsk('скільки білка сьогодні?')).toEqual(['protein']);
    expect(parseAsk('скільки калорій було?')).toEqual(['kcal']);
    expect(parseAsk('скільки вуглеводів?')).toEqual(['carbs']);
  });

  it('maps English nutrient synonyms to fields', () => {
    expect(parseAsk('how much protein today?')).toEqual(['protein']);
    expect(parseAsk('how many calories today?')).toEqual(['kcal']);
    expect(parseAsk('how much fat?')).toEqual(['fat']);
    expect(parseAsk('how many carbs?')).toEqual(['carbs']);
  });

  it('accepts кcal/ккал short forms', () => {
    expect(parseAsk('сколько ккал сегодня?')).toEqual(['kcal']);
    expect(parseAsk('kcal today?')).toEqual(['kcal']);
  });

  it('returns the full breakdown, in stable order, when no nutrient keyword is present', () => {
    expect(parseAsk('что по сегодня?')).toEqual(['kcal', 'protein', 'fat', 'carbs']);
    expect(parseAsk('как успехи?')).toEqual(['kcal', 'protein', 'fat', 'carbs']);
    expect(parseAsk('')).toEqual(['kcal', 'protein', 'fat', 'carbs']);
  });

  it('returns multiple asked nutrients in stable kcal/protein/fat/carbs order', () => {
    expect(parseAsk('белок и углеводы сегодня?')).toEqual(['protein', 'carbs']);
    expect(parseAsk('carbs and protein today')).toEqual(['protein', 'carbs']);
  });

  it('does not substring-match a nutrient mid-word (word-boundary anchored)', () => {
    expect(parseAsk('fate is sealed')).toEqual(['kcal', 'protein', 'fat', 'carbs']); // not "fat" via "fate"
    expect(parseAsk('carbon footprint')).toEqual(['kcal', 'protein', 'fat', 'carbs']); // not "carbs" via "carbon"
    expect(parseAsk('I ate a date')).toEqual(['kcal', 'protein', 'fat', 'carbs']);
  });

  it('handles a mixed-language ask', () => {
    expect(parseAsk('сколько protein сегодня?')).toEqual(['protein']);
  });
});
