/**
 * Scoring engine — the heart of the product (scoring-engine capability).
 *
 * Pure domain logic: no UI, no storage, no I/O. Implements the §6 chance model
 * exactly (FR-SCORE-01/02/03), so it can be unit-tested against fixed inputs.
 *
 *   competitive_score = Σ(subject_score × subject_weight) × (1 + benefit)
 *   chance%           = logistic(competitive_score − last_year_cutoff, k)
 *                       k grows with the number of state-funded seats
 *   band              = [ logistic(diff − σ), logistic(diff + σ) ]
 *                       σ = stdev of the cutoff over 3 years
 *
 * BC-HONESTY-01: `evaluate()` always returns a band, never a bare number.
 */
import { BENEFITS } from "@/app/lib/programs";
import type {
  Benefits,
  Category,
  ElectiveSubject,
  Program,
  Scores,
  SubjectKey,
} from "@/app/lib/types";

/** Valid NMT score bounds (§6.1). */
export const SCORE_MIN = 100;
export const SCORE_MAX = 200;

/** Category thresholds (§6 table). Reach `< 40`, Realistic `40–74`, Safe `≥ 75`. */
export const SAFE_THRESHOLD = 75;
export const REAL_THRESHOLD = 40;

/** Ukrainian category labels, keyed by the design-system traffic-light code. */
export const CATEGORY_LABEL: Record<Category, string> = {
  safe: "Надійно",
  real: "Реально",
  dream: "Мрія",
};

/** Result of scoring one program against the applicant's profile. */
export interface Evaluation {
  /** Competitive score (subjects × weights × benefit), capped at 200. */
  competitive: number;
  /** Point chance estimate, 2–98 %. */
  chance: number;
  /** Uncertainty band [lo, hi] in % (BC-HONESTY-01). */
  band: [number, number];
  /** Risk category derived from the point chance. */
  category: Category;
  /** Whether the applicant's chosen elective is accepted by this program. */
  fits: boolean;
}

/** Clamp a raw score input to the valid NMT range, rounding to an integer. */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return SCORE_MIN;
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(value)));
}

/** Combined additive benefit fraction from the active toggles (FR-INPUT-03). */
export function benefitBonus(benefits: Benefits): number {
  return BENEFITS.reduce(
    (sum, def) => sum + (benefits[def.key] ? def.bonus : 0),
    0,
  );
}

/** Raw weighted sum of scores × coefficients (before the benefit multiplier). */
export function rawScore(program: Program, scores: Scores): number {
  return (Object.keys(program.coeff) as SubjectKey[]).reduce(
    (sum, key) => sum + scores[key] * (program.coeff[key] ?? 0),
    0,
  );
}

/**
 * Competitive score: `raw × (1 + benefit)`, capped at 200 (FR-SCORE-01).
 * The cap mirrors the real admissions ceiling — a benefit can't push a score
 * above the maximum possible NMT-derived value.
 */
export function competitiveScore(
  program: Program,
  scores: Scores,
  benefits: Benefits,
): number {
  return Math.min(SCORE_MAX, rawScore(program, scores) * (1 + benefitBonus(benefits)));
}

/**
 * Logistic chance curve, clamped to 2–98 % (never 0/100 — honesty: no
 * guarantees, and no "impossible"). `k` flattens the curve; larger `k` → a
 * softer relationship between score gap and chance.
 */
export function logistic(diff: number, k: number): number {
  return Math.max(2, Math.min(98, Math.round(100 / (1 + Math.exp(-diff / k)))));
}

/** Cutoff volatility σ: population stdev of the 3-year history, floored at 1.6. */
export function cutoffVolatility(program: Program): number {
  const years = [
    program.cutoffs[2022],
    program.cutoffs[2023],
    program.cutoffs[2024],
  ];
  const mean = years.reduce((a, b) => a + b, 0) / years.length;
  const variance =
    years.reduce((s, y) => s + (y - mean) * (y - mean), 0) / years.length;
  return Math.max(1.6, Math.sqrt(variance));
}

/** Curve steepness `k`: grows with state-funded seats (more seats → flatter). */
export function curveK(program: Program): number {
  return 3.0 + Math.min(1.4, program.budgetSeats / 90);
}

/** Map a point chance to its risk category (§6 thresholds). */
export function categoryOf(chance: number): Category {
  if (chance >= SAFE_THRESHOLD) return "safe";
  if (chance >= REAL_THRESHOLD) return "real";
  return "dream";
}

/** Whether a program accepts the applicant's chosen elective (4th subject). */
export function programFits(
  program: Program,
  elective: ElectiveSubject,
): boolean {
  return program.electives.includes(elective);
}

/**
 * Score one program against a full profile (FR-SCORE-01/02/03).
 * Always returns a band alongside the point chance (BC-HONESTY-01).
 */
export function evaluate(
  program: Program,
  scores: Scores,
  benefits: Benefits,
  elective: ElectiveSubject,
): Evaluation {
  const competitive = competitiveScore(program, scores, benefits);
  const diff = competitive - program.cutoffs[2024];
  const k = curveK(program);
  const sigma = cutoffVolatility(program);

  const chance = logistic(diff, k);
  const lo = logistic(diff - sigma, k);
  const hi = logistic(diff + sigma, k);

  return {
    competitive,
    chance,
    band: [Math.min(lo, hi), Math.max(lo, hi)],
    category: categoryOf(chance),
    fits: programFits(program, elective),
  };
}
