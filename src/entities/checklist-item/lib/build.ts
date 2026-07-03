// Pure glue over the shared scoring core (TC-PURE-01): no LLM, no IO, no DOM.
// Builds the full checklist (rows + weighted match score) for a tailoring.

import type { CvProfile, Requirement } from "@/shared/lib/scoring";
import { checklistItem, matchScore } from "@/shared/lib/scoring";

import type { Checklist, ChecklistRow } from "../model/types";

/**
 * Build the checklist for a set of ranked requirements against a CV profile.
 * One {@link ChecklistRow} per requirement (input order preserved), plus the
 * deterministic 0–100 weighted match score over those same rows
 * (FR-CHECKLIST-01/04). Pure — delegates all scoring to `shared/lib/scoring`.
 */
export function buildChecklist(
  requirements: readonly Requirement[],
  cvProfile: CvProfile,
): Checklist {
  const rows: ChecklistRow[] = requirements.map((requirement) => ({
    requirement,
    item: checklistItem(requirement, cvProfile),
  }));

  const score = matchScore(rows);

  return { rows, score };
}
