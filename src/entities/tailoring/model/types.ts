// tailoring entity — the aggregate that ties one tailoring run together
// (FR-TAILOR-04): a CV profile + job description, the scored checklist, the
// rewritten bullets, and the 0–100 match score.
//
// FSD import rule: entities never import other entities. Component slices
// (cv-profile, job-description) are referenced BY ID; checklist rows and bullets
// are re-declared here from the shared scoring core (single source of truth).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

import type { ChecklistItem, Requirement } from "@/shared/lib/scoring";

/** One scored requirement row within a tailoring (re-declared from shared types). */
export interface TailoringChecklistRow {
  readonly requirement: Requirement;
  readonly item: ChecklistItem;
}

/** Grounding verdict for a tailoring bullet (mirrors the bullet entity). */
export type TailoringBulletGrounding = "grounded" | "overclaim-risk";

/** A rewritten bullet as held by the tailoring aggregate. */
export interface TailoringBullet {
  readonly id: string;
  readonly text: string;
  readonly grounding: TailoringBulletGrounding;
  /** Whether this bullet is included in export (FR-BULLETS-02 / BC-HONESTY-02). */
  readonly includedInExport: boolean;
}

/**
 * A single tailoring run stored in history for logged-in paid users (FR-TAILOR-04).
 * References its source CV profile and job description by id to keep the entity
 * self-contained (no entity→entity imports).
 */
export interface Tailoring {
  readonly id: string;
  /** Ref to the source CvProfile — by id, not by import (FSD rule). */
  readonly cvProfileId: string;
  /** Ref to the pasted JobDescription — by id, not by import (FSD rule). */
  readonly jobDescriptionId: string;
  /** The scored checklist rows for this run (FR-CHECKLIST-*). */
  readonly checklist: readonly TailoringChecklistRow[];
  /** The rewritten bullets for this run (FR-BULLETS-*). */
  readonly bullets: readonly TailoringBullet[];
  /** Deterministic 0–100 weighted match score (FR-CHECKLIST-04). */
  readonly matchScore: number;
}
