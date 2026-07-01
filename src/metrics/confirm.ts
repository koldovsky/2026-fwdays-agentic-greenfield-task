import type { MetricColumn, MetricConfirmation, MetricDelta } from './types.js';
import { detectLang, type Lang } from '../util/lang.js';
import { fmt } from '../util/num.js';

// Build the confirmation (design §4). The prose CONTAINS the numbers + deltas, so it's assembled in
// code, never by the model (invariants #1/#2/#5 — no LLM call on this path at all). Prose mirrors the
// user's language (invariant #6); the stored columns stay English. A first-ever metric shows no delta.

const UNIT: Record<MetricColumn, string> = {
  weightKg: 'кг',
  waistCm: 'см',
  chestCm: 'см',
  hipsCm: 'см',
  bicepCm: 'см',
  thighCm: 'см',
};
const UNIT_EN: Record<MetricColumn, string> = {
  weightKg: 'kg',
  waistCm: 'cm',
  chestCm: 'cm',
  hipsCm: 'cm',
  bicepCm: 'cm',
  thighCm: 'cm',
};

const LABEL: Record<Lang, Record<MetricColumn, string>> = {
  uk: {
    weightKg: 'Вага',
    waistCm: 'Талія',
    chestCm: 'Груди',
    hipsCm: 'Стегна',
    bicepCm: 'Біцепс',
    thighCm: 'Нога',
  },
  ru: {
    weightKg: 'Вес',
    waistCm: 'Талия',
    chestCm: 'Грудь',
    hipsCm: 'Бёдра',
    bicepCm: 'Бицепс',
    thighCm: 'Бедро',
  },
  en: {
    weightKg: 'Weight',
    waistCm: 'Waist',
    chestCm: 'Chest',
    hipsCm: 'Hips',
    bicepCm: 'Biceps',
    thighCm: 'Thigh',
  },
};

const SINCE: Record<Lang, string> = { uk: 'з', ru: 'с', en: 'since' };
const LOGGED_VERB: Record<Lang, string> = { uk: 'Записав', ru: 'Записал', en: 'Logged' };

const NO_METRICS: Record<Lang, string> = {
  uk: 'Не розпізнав жодного показника. Напиши, напр. «вага 89.2, талія 90».',
  ru: 'Не распознал ни одного показателя. Напиши, напр. «вес 89.2, талия 90».',
  en: 'I didn\'t catch any measurement. Try e.g. "weight 89.2, waist 90".',
};

/** Log-by-default still needs at least one parsed field — nudge when nothing matched. */
export const noMetricsReply = (text: string): MetricConfirmation => ({
  text: NO_METRICS[detectLang(text)],
});

const deltaSuffix = (lang: Lang, unit: string, delta: MetricDelta): string => {
  if (delta.delta === null || delta.priorDate === null) {
    return '';
  }
  const arrow = delta.delta > 0 ? '↑' : delta.delta < 0 ? '↓' : '→';
  const magnitude = fmt(Math.abs(delta.delta));
  return ` (${arrow}${magnitude} ${unit} ${SINCE[lang]} ${delta.priorDate})`;
};

const metricLine = (lang: Lang, delta: MetricDelta): string => {
  const unit = lang === 'en' ? UNIT_EN[delta.column] : UNIT[delta.column];
  const label = LABEL[lang][delta.column];
  return `${label}: ${fmt(delta.value)} ${unit}${deltaSuffix(lang, unit, delta)}`;
};

/** Build the confirmation from code-computed deltas (design §4). Columns stay English; prose mirrors
 * the user's language. A first-ever metric (delta/priorDate both null) renders with no delta suffix. */
export const buildConfirmation = (text: string, deltas: MetricDelta[]): MetricConfirmation => {
  const lang = detectLang(text);
  const lines = deltas.map((delta) => metricLine(lang, delta));

  return { text: `${LOGGED_VERB[lang]}:\n${lines.join('\n')}` };
};
