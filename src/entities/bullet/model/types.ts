// bullet entity — a single tailored résumé bullet with its grounding status.
// FR-BULLETS-01 (grounding indicator + source ref), FR-BULLETS-02 / BC-HONESTY-02
// (overclaim-risk excluded from export by default).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

/**
 * Grounding verdict for a bullet (FR-BULLETS-01): either backed by a source CV
 * sentence (`grounded`) or flagged `overclaim-risk` when no evidence was found.
 */
export type BulletGroundingStatus = "grounded" | "overclaim-risk";

export interface Bullet {
  readonly id: string;
  /** The tailored bullet text. */
  readonly text: string;
  /** Grounding verdict from the grounding pass (FR-BULLETS-01). */
  readonly grounding: BulletGroundingStatus;
  /**
   * The source CV sentence that grounds this bullet, when `grounded`
   * (FR-BULLETS-01). Absent for `overclaim-risk` bullets.
   */
  readonly sourceSentence?: string;
  /**
   * Whether this bullet is included in the exported résumé. Overclaim-risk
   * bullets default to excluded and must be re-included with an explicit
   * acknowledgement (FR-BULLETS-02, BC-HONESTY-02).
   */
  readonly includedInExport: boolean;
}
