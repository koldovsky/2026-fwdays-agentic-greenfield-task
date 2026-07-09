// Pure export-default rule for bullets (TC-PURE-01): no IO, no DOM, no LLM.
// Overclaim-risk bullets are excluded from export by default; only grounded
// bullets are included unless the user actively opts one back in
// (FR-BULLETS-02, BC-HONESTY-02).

import type { Bullet, BulletGroundingStatus } from "../model/types";

/**
 * Default export inclusion for a grounding status: grounded bullets are included,
 * overclaim-risk bullets are excluded by default (FR-BULLETS-02, BC-HONESTY-02).
 */
export function defaultIncludeInExport(grounding: BulletGroundingStatus): boolean {
  return grounding === "grounded";
}

/**
 * Apply the export-default rule to a set of bullets, setting each bullet's
 * `includedInExport` from its grounding status. Does not mutate inputs; returns
 * a new array. Use this to seed the default state before any user opt-in.
 */
export function applyExportDefaults(bullets: readonly Bullet[]): Bullet[] {
  return bullets.map((bullet) => ({
    ...bullet,
    includedInExport: defaultIncludeInExport(bullet.grounding),
  }));
}

/**
 * Select the bullets that will actually be exported: those flagged
 * `includedInExport`. Overclaim-risk bullets appear here only if a user
 * explicitly opted them back in (BC-HONESTY-02) — they are never silently
 * included. Input order is preserved.
 */
export function exportBullets(bullets: readonly Bullet[]): Bullet[] {
  return bullets.filter((bullet) => bullet.includedInExport);
}
