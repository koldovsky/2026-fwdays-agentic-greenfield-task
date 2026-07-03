// checklist-item entity — a scored requirement row + the aggregate checklist.
// Base types re-exported from the shared scoring core (single source of truth).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

import type { ChecklistItem, Requirement } from "@/shared/lib/scoring";

export type { ChecklistItem, ChecklistStatus } from "@/shared/lib/scoring";

/** One requirement paired with its scored checklist item. */
export type ChecklistRow = {
  readonly requirement: Requirement;
  readonly item: ChecklistItem;
};

/** The full tailoring checklist: every requirement row + a 0–100 match score. */
export type Checklist = {
  readonly rows: readonly ChecklistRow[];
  readonly score: number;
};
