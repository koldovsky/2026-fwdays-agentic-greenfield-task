// Public API barrel for the scoring slice — other layers import ONLY this.
export { checklistItem, matchScore } from "./checklist";
export { applyCoverageJudge, type ScoredRow } from "./judge-score";
export { extractJobTitle } from "./job-title";
export type {
  CoverageVerdict,
  CoverageVerdictLabel,
} from "./judge-types";
export type {
  ChecklistItem,
  ChecklistStatus,
  CvProfile,
  Requirement,
  RequirementImportance,
  SeniorityLevel,
} from "./types";
