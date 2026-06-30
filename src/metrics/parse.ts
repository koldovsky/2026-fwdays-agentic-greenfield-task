import type { MetricColumn, ParsedMetrics } from './types.js';

// Deterministic synonym→column parser (design §1, invariant #5: no LLM call on this path). Body
// metrics are keyword:number pairs — a regex scan is cheaper, testable, and exact where an LLM
// would be unreliable at arithmetic and forbidden from emitting the numbers anyway (invariant #2).

/** RU/UA/EN synonyms per column, longest-first within each so e.g. "талии" doesn't shadow "талия". */
const SYNONYMS: Record<MetricColumn, string[]> = {
  weightKg: ['вес', 'вага', 'weight', 'вс'],
  waistCm: ['талия', 'талию', 'талії', 'талію', 'талія', 'талии', 'waist'],
  chestCm: ['грудь', 'груди', 'грудна', 'chest'],
  hipsCm: ['бедра', 'бёдра', 'стегна', 'стегон', 'hips'],
  bicepCm: ['бицепс', 'біцепс', 'biceps', 'bicep', 'arm'],
  thighCm: ['бедро', 'нога', 'thigh'],
};

/** Inclusive sane ranges per column — out-of-range tokens are dropped (design §1). Weight mirrors
 * onboarding's WEIGHT_RANGE (30–400 kg); the cm columns are this module's own call (no onboarding
 * question covers them) — generous adult human bounds so we drop typos, not real measurements. */
const RANGES: Record<MetricColumn, { min: number; max: number }> = {
  weightKg: { min: 30, max: 400 },
  waistCm: { min: 40, max: 200 },
  chestCm: { min: 40, max: 200 },
  hipsCm: { min: 40, max: 200 },
  bicepCm: { min: 10, max: 80 },
  thighCm: { min: 20, max: 120 },
};

const NUMBER = '(\\d+(?:[.,]\\d+)?)';

/**
 * One scan pattern per column: a synonym at a word boundary, optional colon/space, then a number.
 * The leading `(?<!\p{L})` lookbehind anchors the synonym to a word start so a substring never
 * mis-fires — "warm 35"/"farm 35" don't match `arm`, "многа 55" doesn't match `нога`, and the short
 * `вс` weight synonym only matches a standalone token, never mid-word.
 */
const buildPatterns = (): { column: MetricColumn; regex: RegExp }[] =>
  (Object.entries(SYNONYMS) as [MetricColumn, string[]][]).map(([column, synonyms]) => {
    const alternation = synonyms.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return { column, regex: new RegExp(`(?<!\\p{L})(?:${alternation})\\s*:?\\s*${NUMBER}`, 'iu') };
  });

const PATTERNS = buildPatterns();

const isInRange = (column: MetricColumn, value: number): boolean => {
  const range = RANGES[column];
  return value >= range.min && value <= range.max;
};

/** Parse `<keyword> <number>` pairs (RU/UA/EN, `.`/`,` decimals) into the present columns only. */
export const parseMetrics = (text: string): ParsedMetrics => {
  const parsed: ParsedMetrics = {};

  for (const { column, regex } of PATTERNS) {
    const match = regex.exec(text);
    if (!match?.[1]) {
      continue;
    }

    const value = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(value) || !isInRange(column, value)) {
      continue;
    }

    parsed[column] = value;
  }

  return parsed;
};
