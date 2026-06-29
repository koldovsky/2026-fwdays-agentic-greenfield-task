// @trace FR-AI-05 TC-PURE-01

/**
 * Deterministic scale-reply → anchor mapping (FR-AI-05). Pure and framework-free
 * (no next/*, react, DOM, Date.now()). Handles a reply that is essentially a
 * single number with Ukrainian locale formatting: a decimal comma (`3,5`),
 * surrounding whitespace, and trailing punctuation (`4.`). It deliberately does
 * NOT extract a number out of prose ("4 з 5" or "десь четвірка") — that is the
 * model judge's job; this module only validates a candidate against the
 * question's own anchor set, so an out-of-range or invented value can never be
 * stored (the security-relevant property).
 */

import { isValidAnchorValue } from "@/lib/schemas/answer";

/**
 * Parse a reply that is a single number with optional sign, a `.`/`,` decimal
 * separator, and surrounding whitespace or trailing punctuation. Returns the
 * numeric value, or null when the reply is not cleanly a single number
 * (prose, multiple numbers, letters mixed in, empty).
 */
export function normalizeNumericReply(raw: string): number | null {
  const match = raw.trim().match(/^([+-]?\d+(?:[.,]\d+)?)[\s.,!?]*$/);
  if (match === null) return null;
  const numeric = match[1].replace(",", ".");
  const value = Number(numeric);
  return Number.isFinite(value) ? value : null;
}

/**
 * Map a raw scale reply to exactly one of the question's anchor values, or null
 * when it maps to none. A normalised value that matches no anchor (for example
 * `3,5` against an integer anchor set) returns null rather than being rounded —
 * the caller treats null as unmappable (follow-up, then a null insufficient row
 * at the cap).
 */
export function mapReplyToAnchor(
  raw: string,
  anchors: ReadonlyArray<{ value: number }>,
): number | null {
  const value = normalizeNumericReply(raw);
  if (value === null) return null;
  return isValidAnchorValue(value, anchors) ? value : null;
}
