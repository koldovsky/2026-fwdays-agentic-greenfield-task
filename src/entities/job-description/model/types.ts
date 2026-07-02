// job-description entity — business noun for the pasted job description (FR-JD-02).
// The requirement shape is re-declared from the shared scoring core (single
// source of truth); entities never import other entities (FSD import rule).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

import type { Requirement } from "@/shared/lib/scoring";

/**
 * A JD requirement paired with its extraction/priority rank (FR-JD-02).
 * Re-declared here from the shared `Requirement` type rather than imported from
 * the requirement entity, to honor the FSD rule (no entity→entity imports).
 */
export type RankedRequirement = Requirement & { readonly rank: number };

/** The pasted job description: raw text, normalized text, and ranked requirements. */
export interface JobDescription {
  /** Raw JD text exactly as pasted by the user. */
  readonly raw: string;
  /** Deterministic normalized form of {@link raw} (whitespace-collapsed). */
  readonly normalized: string;
  /**
   * Requirements extracted from the JD, each labelled must-have / nice-to-have
   * and carrying an extraction rank, displayed for review before generation
   * (FR-JD-02).
   */
  readonly requirements: readonly RankedRequirement[];
}
