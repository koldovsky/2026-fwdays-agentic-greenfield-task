// Pure, deterministic JD-text normalizer (TC-PURE-01): no IO, no DOM, no LLM.
// Mirrors the cv-profile normalize approach, adapted for whole-JD text.

import type { JobDescription, RankedRequirement } from "../model/types";

/**
 * Normalize raw JD text into a deterministic canonical string.
 *
 * - Collapses runs of intra-line whitespace to a single space.
 * - Trims each line and drops blank lines.
 * - Joins the surviving lines with a single newline.
 *
 * Idempotent: `normalizeJdText(normalizeJdText(x)) === normalizeJdText(x)`.
 * Deterministic: same input always yields the same output. No IO/network.
 */
export function normalizeJdText(raw: string): string {
  return raw
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Build a {@link JobDescription} from raw pasted text plus extracted requirements
 * (FR-JD-02). Pure glue: normalizes the text and passes requirements through in
 * the given order. Defaults to no requirements when none have been extracted yet.
 */
export function buildJobDescription(
  raw: string,
  requirements: readonly RankedRequirement[] = [],
): JobDescription {
  return {
    raw,
    normalized: normalizeJdText(raw),
    requirements,
  };
}
