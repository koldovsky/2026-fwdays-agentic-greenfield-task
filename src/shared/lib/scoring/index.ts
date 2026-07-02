// Public API barrel for the scoring slice — other layers import ONLY this.
export { checklistItem, matchScore } from "./checklist";
export type {
  ChecklistItem,
  ChecklistStatus,
  CvProfile,
  Requirement,
  RequirementImportance,
} from "./types";
