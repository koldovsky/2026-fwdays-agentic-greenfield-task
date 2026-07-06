// Public API barrel for the scoring slice — other layers import ONLY this.
export { checklistItem, matchScore } from "./checklist";
export { extractJobTitle } from "./job-title";
export type {
  ChecklistItem,
  ChecklistStatus,
  CvProfile,
  Requirement,
  RequirementImportance,
  SeniorityLevel,
} from "./types";
