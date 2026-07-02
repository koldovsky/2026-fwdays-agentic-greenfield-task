// Pure selectors over the tailoring aggregate (TC-PURE-01): no IO, no DOM, no LLM.

import type { Tailoring, TailoringBullet } from "../model/types";

/**
 * The bullets that will actually be exported: those flagged `includedInExport`.
 * Overclaim-risk bullets appear here only if explicitly opted back in
 * (BC-HONESTY-02). Input order is preserved.
 */
export function exportableBullets(tailoring: Tailoring): readonly TailoringBullet[] {
  return tailoring.bullets.filter((bullet) => bullet.includedInExport);
}

/** Whether the tailoring produced any overclaim-risk bullets (FR-BULLETS-02). */
export function hasOverclaims(tailoring: Tailoring): boolean {
  return tailoring.bullets.some((bullet) => bullet.grounding === "overclaim-risk");
}
