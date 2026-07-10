// Map a stored tailoring back into the result-view widget props
// (add-tailoring-history, FR-HISTORY-02). Pure: the detail view re-opens the
// persisted checklist + bullets in the SAME widgets the live flow uses, so a
// re-opened tailoring looks identical to a fresh one. Framework-free helper.
//
// The persisted rows use the repo's compact enums (importance must/nice,
// grounding met/partial/overclaim/manual); this reverses them to the widget
// vocabulary (must-have/nice-to-have, grounded/overclaim-risk). Synthetic ids
// are derived from position — stored rows carry no widget id, and order is
// stable (the repo selects by `ord`).
import type { Bullet } from "@/entities/bullet";
import type { Requirement } from "@/entities/requirement";
import type { TailoringRecord } from "@/shared/lib/db";
import type { ChecklistPanelRow } from "@/widgets/checklist-panel";

function toImportance(importance: "must" | "nice"): Requirement["importance"] {
  return importance === "must" ? "must-have" : "nice-to-have";
}

function toBulletGrounding(
  grounding: "met" | "partial" | "overclaim" | "manual",
): Bullet["grounding"] {
  // Only overclaim maps to the risk flag; met/partial/manual are honest evidence.
  return grounding === "overclaim" ? "overclaim-risk" : "grounded";
}

/** Stored checklist items → checklist-panel rows. */
export function toChecklistRows(record: TailoringRecord): ChecklistPanelRow[] {
  return record.checklist.map((item, i) => ({
    requirement: {
      id: `req-${i}`,
      text: item.requirement,
      importance: toImportance(item.importance),
      keywords: [],
    } satisfies Requirement,
    status: item.status,
    rationale: item.rationale,
  }));
}

/** Stored bullets → bullet-list bullets, preserving their included state. */
export function toBullets(record: TailoringRecord): Bullet[] {
  return record.bullets.map((bullet, i) => ({
    id: `blt-${i}`,
    text: bullet.text,
    grounding: toBulletGrounding(bullet.grounding),
    includedInExport: bullet.included,
  }));
}
