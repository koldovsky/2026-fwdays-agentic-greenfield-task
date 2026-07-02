// Domain types for the pure honest-scorer (shared layer — lowest FSD layer).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

export type RequirementImportance = "must-have" | "nice-to-have";

export type ChecklistStatus = "met" | "partial" | "gap" | "overclaim-risk";

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
