/**
 * Recommendation selectors — pure glue between `scoring-engine` and the UI
 * (recommendations, filtering, comparison, program-detail).
 *
 * No React, no storage: given a profile, produce scored + filtered + sorted
 * programs and the derived text (advice, score breakdown) the views render.
 */
import { adviceBase } from "@/app/lib/copy";
import { formatNumber, formatPercent } from "@/app/lib/format";
import { PROGRAMS } from "@/app/lib/programs";
import {
  CATEGORY_LABEL,
  benefitBonus,
  categoryOf,
  competitiveScore,
  evaluate,
  rawScore,
  type Evaluation,
} from "@/app/lib/scoring";
import { REQUIRED_SUBJECTS } from "@/app/lib/types";
import type {
  Benefits,
  Category,
  ElectiveSubject,
  Program,
  Scores,
} from "@/app/lib/types";

/** A program paired with its evaluation for the current profile. */
export interface ScoredProgram {
  program: Program;
  evaluation: Evaluation;
}

/** The inputs the selectors need (a subset of the persisted profile). */
export interface Profile {
  scores: Scores;
  benefits: Benefits;
  elective: ElectiveSubject;
  fields: string[];
  cities: string[];
}

/** Risk-category filter values used by the tabs (FR-FILTER-02). */
export type CategoryFilter = "all" | Category;

/**
 * Score every program for this profile, apply the field/city filters
 * (FR-FILTER-01), and sort. Fitting programs come first (highest chance
 * first); programs that don't accept the chosen elective sink to the bottom.
 */
export function selectPrograms(profile: Profile): ScoredProgram[] {
  const { fields, cities } = profile;
  return PROGRAMS.filter(
    (p) =>
      (fields.length === 0 || fields.includes(p.field)) &&
      (cities.length === 0 || cities.includes(p.city)),
  )
    .map((program) => ({
      program,
      evaluation: evaluate(program, profile.scores, profile.benefits, profile.elective),
    }))
    .sort((a, b) => {
      // Non-fitting programs always rank last, regardless of raw chance.
      const af = a.evaluation.fits ? a.evaluation.chance : -1;
      const bf = b.evaluation.fits ? b.evaluation.chance : -1;
      return bf - af;
    });
}

/** Predicate for the risk-category tabs; only fitting programs are categorized. */
export function matchesCategory(
  scored: ScoredProgram,
  filter: CategoryFilter,
): boolean {
  if (!scored.evaluation.fits) return filter === "all";
  if (filter === "all") return true;
  return scored.evaluation.category === filter;
}

/** How many programs accept the chosen elective (the "matches" count). */
export function fittingCount(list: ScoredProgram[]): number {
  return list.filter((s) => s.evaluation.fits).length;
}

/** Average of the four NMT scores (profile headline metric). */
export function averageScore(scores: Scores): number {
  return (scores.ukr + scores.math + scores.hist + scores.eng) / 4;
}

/** One line of the competitive-score breakdown (program-detail, FR-DETAIL-01). */
export interface BreakdownRow {
  label: string;
  value: number;
}

/**
 * Per-subject contributions + benefit line for the detail view.
 * Each row is `subject × weight → contribution`; the benefit row (if any) is
 * the additive bonus applied to the raw score.
 */
export function scoreBreakdown(
  program: Program,
  scores: Scores,
  benefits: Benefits,
  elective: ElectiveSubject,
): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  (["ukr", "eng", "hist", "math"] as const).forEach((key) => {
    const weight = program.coeff[key];
    if (!weight) return;
    const label = key === "eng" ? elective : REQUIRED_SUBJECTS[key];
    rows.push({ label: `${label} ×${formatNumber(weight)}`, value: scores[key] * weight });
  });
  const bonus = benefitBonus(benefits);
  if (bonus > 0) {
    const multiplier = formatNumber(1 + bonus, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    rows.push({
      label: `Пільга (+${formatPercent(bonus * 100)}) ×${multiplier}`,
      value: rawScore(program, scores) * bonus,
    });
  }
  const total = competitiveScore(program, scores, benefits);
  const sum = rows.reduce((acc, row) => acc + row.value, 0);
  if (sum > 0 && Math.abs(sum - total) > 1e-6) {
    const factor = total / sum;
    return rows.map((row) => ({ ...row, value: row.value * factor }));
  }
  return rows;
}

/**
 * Category-appropriate advice for the detail view (§6 recommendations),
 * folding in the band and the number of state-funded seats for honesty/context.
 */
export function adviceFor(program: Program, evaluation: Evaluation): string {
  if (!evaluation.fits) {
    return (
      "Ця програма приймає інший четвертий предмет НМТ — шанс для неї не є " +
      "орієнтиром для твого профілю. Обери відповідний предмет зліва або " +
      "програму зі свого списку рекомендацій."
    );
  }
  const { chance, band } = evaluation;
  const range =
    band[0] === band[1]
      ? `оцінка тримається близько ${formatPercent(band[0])}`
      : `реалістичний діапазон — ${band[0]}–${band[1]} %`;
  return (
    `${adviceBase(chance)} З поправкою на коливання прохідного бала ${range}. ` +
    `Бюджетних місць — ${program.budgetSeats} (більше місць — стабільніший конкурс).`
  );
}

/**
 * Text recommendation across compared programs (FR-COMPARE-01): the highest
 * chance among the selected options, framed as priority 1.
 */
export function compareAdvice(scored: ScoredProgram[]): string {
  if (scored.length < 2) return "";
  // Only eligible programs get a chance recommendation — a program that doesn't
  // accept the chosen elective shows "—", so it must not be ranked by its
  // (irrelevant) computed chance.
  const fitting = [...scored].filter((s) => s.evaluation.fits);
  if (fitting.length === 0)
    return "Жодна з обраних програм не приймає твій четвертий предмет — зміни його зліва, щоб порівняти шанси.";
  const sorted = fitting.sort((a, b) => b.evaluation.chance - a.evaluation.chance);
  const best = sorted[0];
  if (sorted.length === 1)
    return (
      `${best.program.uni} (${best.program.spec}) — єдина з обраних приймає твій ` +
      `четвертий предмет: шанс ${best.evaluation.chance} %. Постав її пріоритетом 1.`
    );
  const runnerUp = sorted[1];
  const gap = best.evaluation.chance - runnerUp.evaluation.chance;
  const contrast =
    gap > 0
      ? `Це на ${gap} в. п. більше за наступний варіант (${runnerUp.program.uni}, ${runnerUp.evaluation.chance} %)`
      : `Нарівні з ${runnerUp.program.uni}`;
  return (
    `${best.program.uni} (${best.program.spec}) — найвищий шанс серед обраних: ` +
    `${best.evaluation.chance} %. ${contrast}, тож постав його пріоритетом 1.`
  );
}

/** The Ukrainian label for a fitting program's category, or the not-fitting note. */
export function categoryLabel(evaluation: Evaluation): string {
  return evaluation.fits
    ? CATEGORY_LABEL[evaluation.category]
    : "Інший предмет НМТ";
}

/**
 * Screen-reader summary for a recommendation card (NFR-A11Y-01): the chance,
 * band, and category IN TEXT, so the signal never depends on color alone.
 */
export function cardSummary(evaluation: Evaluation): string {
  if (!evaluation.fits)
    return "Ця програма приймає інший предмет НМТ, тому шанс для неї не розраховується — обери інший четвертий предмет, щоб побачити оцінку.";
  const { chance, band, category } = evaluation;
  const range = band[0] === band[1] ? "" : `, діапазон ${band[0]}–${band[1]} %`;
  return `Шанс ${formatPercent(chance)}${range}, категорія ${CATEGORY_LABEL[category]}.`;
}

export { categoryOf };
