// On-open reading-position reconciliation policy. This is an APP/UX policy (it can produce a user
// prompt), deliberately distinct from core/sync's SILENT `furthestWins` (ADR-011): Komga is the source
// of truth, but rather than silently yanking the reader forward when the server is ahead, the reader
// ASKS. Pure + DOM-free so it unit-tests trivially and the future native client can reuse the rule.

import type { Locator } from '@/core/model'

/** A meaningful server-ahead conflict surfaced to the reader so it can prompt before jumping. */
export interface ProgressConflict {
  /** Komga's position (the source of truth) — where a "Resume from Komga" jump would go. */
  remote: Locator
  /** 0..1 device-local progression (where the reader resumes by default). */
  localProgression: number
  /** 0..1 server progression (strictly ahead of local). */
  remoteProgression: number
}

export interface ProgressReconciliation {
  /** The position to restore on open: the device's LATEST local position, or Komga's when none is local. */
  restore: Locator | null
  /** Set only when Komga is meaningfully AHEAD of this device — the reader prompts before jumping. */
  conflict: ProgressConflict | null
}

/** Default "ahead" threshold: ignore sub-1% differences (e.g. Komga's position-grid quantisation, or our
 *  own floored writes) so only a genuine further-elsewhere read prompts. */
export const CONFLICT_EPSILON = 0.01

/**
 * Reconcile the device's local position with Komga's (the source of truth) when a book opens.
 *
 * Policy (a deliberate refinement of silent furthest-wins, per product decision):
 *  - **Komga behind / equal / absent** → resume the LOCAL position. The sync outbox pushes local up to
 *    Komga (furthest-wins) — "if progress is less in Komga, push".
 *  - **Komga AHEAD by more than `epsilon`, and a local position exists** → resume local but return a
 *    `conflict` so the reader can ASK ("Resume from Komga, or stay here?") — "if not, ask the user".
 *  - **Komga ahead but NO local position yet** (first time on this device) → resume straight from Komga.
 */
export function reconcileOnOpen(
  local: Locator | null | undefined,
  remote: Locator | null | undefined,
  epsilon: number = CONFLICT_EPSILON,
): ProgressReconciliation {
  const localProgression = local?.locations?.totalProgression ?? 0
  const remoteProgression = remote?.locations?.totalProgression ?? 0

  if (remote && remoteProgression > localProgression + epsilon) {
    return local
      ? { restore: local, conflict: { remote, localProgression, remoteProgression } }
      : { restore: remote, conflict: null }
  }
  return { restore: local ?? remote ?? null, conflict: null }
}
