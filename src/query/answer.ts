import type { DayTotals, Nutrient, QueryAnswer, Targets } from './types.js';
import { detectLang, type Lang } from '../util/lang.js';
import { fmt } from '../util/num.js';

// Build the answer (design §3). The prose CONTAINS the numbers, so it's assembled in code, never by
// the model (invariants #1/#2/#5 — no LLM call on this path at all). Prose mirrors the user's
// language (invariant #6); the stored field names stay English. An empty day answers honestly
// ("nothing logged"), never a bare 0 that would read as a measured intake.

interface NutrientField {
  logged: number;
  target: number | null;
  unit: string;
}

const fieldFor = (nutrient: Nutrient, totals: DayTotals, targets: Targets): NutrientField => {
  switch (nutrient) {
    case 'kcal':
      return { logged: totals.kcal, target: targets.kcal, unit: 'ккал' };
    case 'protein':
      return { logged: totals.proteinG, target: targets.proteinG, unit: 'г' };
    case 'fat':
      return { logged: totals.fatG, target: targets.fatG, unit: 'г' };
    case 'carbs':
      return { logged: totals.carbsG, target: targets.carbsG, unit: 'г' };
  }
};

const UNIT_EN: Record<string, string> = { ккал: 'kcal', г: 'g' };

const LABEL: Record<Lang, Record<Nutrient, string>> = {
  uk: { kcal: 'Калорії', protein: 'Білки', fat: 'Жири', carbs: 'Вуглеводи' },
  ru: { kcal: 'Калории', protein: 'Белки', fat: 'Жиры', carbs: 'Углеводы' },
  en: { kcal: 'Calories', protein: 'Protein', fat: 'Fat', carbs: 'Carbs' },
};

const OF: Record<Lang, string> = { uk: 'з', ru: 'из', en: 'of' };
const REMAINING: Record<Lang, string> = { uk: 'залишилось', ru: 'осталось', en: 'remaining' };

const NOTHING_LOGGED: Record<Lang, string> = {
  uk: 'За цю дату ще нічого не записано.',
  ru: 'За эту дату ещё ничего не записано.',
  en: 'Nothing logged for that date yet.',
};

const unitFor = (lang: Lang, unit: string): string =>
  lang === 'en' ? (UNIT_EN[unit] ?? unit) : unit;

const nutrientLine = (
  lang: Lang,
  nutrient: Nutrient,
  totals: DayTotals,
  targets: Targets,
): string => {
  const field = fieldFor(nutrient, totals, targets);
  const unit = unitFor(lang, field.unit);
  const label = LABEL[lang][nutrient];
  const logged = fmt(field.logged);

  if (field.target === null) {
    return `${label}: ${logged} ${unit}`;
  }

  const remaining = fmt(Math.max(field.target - field.logged, 0));
  return `${label}: ${logged} ${OF[lang]} ${fmt(field.target)} ${unit} (${REMAINING[lang]} ${remaining} ${unit})`;
};

/**
 * Render the answer from code-computed totals (design §3): an empty day (`entryCount 0`) answers
 * honestly rather than implying a measured zero; otherwise each asked nutrient renders as
 * `logged of goal (remaining)` when a target exists, else the bare total. Field order follows `asked`.
 */
export const buildAnswer = (
  text: string,
  totals: DayTotals,
  targets: Targets,
  asked: Nutrient[],
): QueryAnswer => {
  const lang = detectLang(text);

  if (totals.entryCount === 0) {
    return { text: NOTHING_LOGGED[lang] };
  }

  const lines = asked.map((nutrient) => nutrientLine(lang, nutrient, totals, targets));
  return { text: lines.join('\n') };
};
