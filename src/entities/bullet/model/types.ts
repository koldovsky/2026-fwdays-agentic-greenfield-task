// bullet entity — a single tailored résumé bullet with its grounding status.
// FR-BULLETS-01 (grounding indicator + source ref), FR-BULLETS-02 / BC-HONESTY-02
// (overclaim-risk excluded from export by default).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

/**
 * Grounding verdict for a bullet (FR-BULLETS-01): either backed by a source CV
 * sentence (`grounded`) or flagged `overclaim-risk` when no evidence was found.
 */
export type BulletGroundingStatus = "grounded" | "overclaim-risk";

/**
 * Which evidence pool grounds a bullet (BC-HONESTY-03): a CV sentence, or a
 * user-confirmed answer to a wizard clarifying question. Both are honest
 * evidence — the union tags *which* pool, so the UI can always show which is
 * which and never silently merge them.
 */
export type EvidenceSource =
  | { readonly kind: "cv"; readonly sentence: string }
  | { readonly kind: "user-confirmed"; readonly question: string; readonly answer: string };

export interface Bullet {
  readonly id: string;
  /** The tailored bullet text. */
  readonly text: string;
  /** Grounding verdict from the grounding pass (FR-BULLETS-01). */
  readonly grounding: BulletGroundingStatus;
  /**
   * The evidence that grounds this bullet, when `grounded` (FR-BULLETS-01,
   * BC-HONESTY-03). Absent for `overclaim-risk` bullets.
   */
  readonly source?: EvidenceSource;
  /**
   * Whether this bullet is included in the exported résumé. Overclaim-risk
   * bullets default to excluded and must be re-included with an explicit
   * acknowledgement (FR-BULLETS-02, BC-HONESTY-02).
   */
  readonly includedInExport: boolean;
}
