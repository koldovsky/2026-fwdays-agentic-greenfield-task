import type { Nutrient } from './types.js';

// Deterministic synonym→nutrient parser (design §2, invariant #5: no LLM call on this path). The ask
// is keyword-shaped — a regex scan is free, testable, and exact where an LLM would add cost and
// non-determinism for no gain (the model never emits these numbers anyway, invariant #2).

/** Stable, reportable order — full breakdown always renders kcal → protein → fat → carbs. */
const ALL_NUTRIENTS: Nutrient[] = ['kcal', 'protein', 'fat', 'carbs'];

/** RU/UA/EN synonyms per nutrient, longest-first within each so a shorter form never shadows one. */
const SYNONYMS: Record<Nutrient, string[]> = {
  kcal: [
    'калорийность',
    'калорийности',
    'калории',
    'калорий',
    'калорія',
    'калорії',
    'калорій',
    'ккал',
    'kcal',
    'calories',
    'calorie',
  ],
  protein: ['белок', 'белка', 'белки', 'білок', 'білка', 'білки', 'протеин', 'протеїн', 'protein'],
  fat: ['жиры', 'жиров', 'жира', 'жир', 'жири', 'жирів', 'жиру', 'fat', 'fats'],
  carbs: [
    'углеводы',
    'углеводов',
    'углевода',
    'углевод',
    'вуглеводи',
    'вуглеводів',
    'вуглевод',
    'carbohydrates',
    'carbohydrate',
    'carbs',
    'carb',
  ],
};

/**
 * One scan pattern per nutrient: a synonym at a word boundary, anchored at BOTH ends so a synonym
 * that happens to be a prefix of an unrelated word never mis-fires (the metrics-parser lesson,
 * sharpened): `(?<!\p{L})…(?!\p{L})` means "fat" matches in "сколько fat?" but not inside "fate", and
 * "carbs" doesn't fire on "carbon".
 */
const buildPatterns = (): Record<Nutrient, RegExp> => {
  const entries = (Object.entries(SYNONYMS) as [Nutrient, string[]][]).map(
    ([nutrient, synonyms]): [Nutrient, RegExp] => {
      const alternation = synonyms.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      return [nutrient, new RegExp(`(?<!\\p{L})(?:${alternation})(?!\\p{L})`, 'iu')];
    },
  );
  return Object.fromEntries(entries) as Record<Nutrient, RegExp>;
};

const PATTERNS = buildPatterns();

/** Parse which nutrient(s) a question asks about; no keyword (or a generic ask) → the full breakdown. */
export const parseAsk = (text: string): Nutrient[] => {
  const asked = ALL_NUTRIENTS.filter((nutrient) => PATTERNS[nutrient].test(text));

  return asked.length > 0 ? asked : ALL_NUTRIENTS;
};
