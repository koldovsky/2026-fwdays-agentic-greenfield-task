// Domain types for the pure honest-scorer (shared layer — lowest FSD layer).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

export type RequirementImportance = "must-have" | "nice-to-have";

// Inferred candidate seniority, used ONLY to relax the claimed-skill rule
// (improve-tailoring-quality T5): for an experienced candidate a skill listed
// but not yet backed by prose is treated as coverable, not an overclaim. Junior
// and unknown seniority keep the strict claimed-only -> overclaim-risk rule.
// Structurally identical to `CareerStage` in shared/lib/llm; kept local so the
// pure scorer owns its own vocabulary and stays free of an llm import.
export type SeniorityLevel = "junior" | "mid" | "senior";

// "info" (blue): not directly met, but plausibly coverable by adjacent CV
// evidence — a suggestion to surface in a cover letter, not a red "gap".
export type ChecklistStatus = "met" | "partial" | "info" | "gap" | "overclaim-risk";

export interface Requirement {
  readonly id: string;
  readonly text: string;
  readonly importance: RequirementImportance;
  readonly keywords: readonly string[];
}

export interface CvProfile {
  /** Normalized skill tokens claimed on the CV. */
  readonly skills: readonly string[];
  /** Raw CV sentences — the prose used for evidence lookup / grounding. */
  readonly sentences: readonly string[];
}

export interface ChecklistItem {
  readonly status: ChecklistStatus;
  readonly rationale: string;
}
