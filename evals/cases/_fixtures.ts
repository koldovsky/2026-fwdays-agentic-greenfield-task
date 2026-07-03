/** Shared eval fixtures — a realistic applicant profile (matches the app default). */
import type { Benefits, ElectiveSubject, Scores } from "@/app/lib/types";

export const SCORES: Scores = { ukr: 152, math: 138, hist: 145, eng: 161 };
export const NO_BENEFITS: Benefits = { village: false, quota: false, orphan: false };
/** Village (+0.02) + quota (+0.04) = +6 % bonus. */
export const BENEFITS_ON: Benefits = { village: true, quota: true, orphan: false };
export const ELECTIVE: ElectiveSubject = "Англійська";

/**
 * Scoring anchor for UI-microcopy dimensions (a11y labels, empty states,
 * category advice). These outputs are short *by design*; grade them as
 * production copy, not prose essays. Appended to those rubrics so the judge's
 * scale is calibrated to the artifact type rather than an open-ended "could
 * say more" standard.
 */
export const MICROCOPY_QUALITY =
  "SCORING NOTE — production UI microcopy, short by design: if the criteria above are fully met, the copy is excellent (95–100). Deduct ONLY for genuine defects (wrong or misleading information, a missing/unclear user action, or unnatural Ukrainian). Do NOT deduct for brevity, for being 'a short snippet', or for 'not adding more than required' — concision is correct here.";

/**
 * Scoring anchor for the score-breakdown transparency dimension. The output is
 * a compact, objective calculation; grade it on correctness/completeness, not
 * on how much prose surrounds it.
 */
export const TRANSPARENCY_QUALITY =
  "SCORING NOTE — objective score breakdown: if the arithmetic is correct and every subject line plus any benefit line sums to the stated total, the breakdown is fully correct and clear (95–100). Deduct ONLY for a real error (wrong arithmetic, a missing line, wrong locale formatting). Do NOT deduct for compact presentation or 'no extra explanation' — a correct, self-summing breakdown is exactly the goal.";
