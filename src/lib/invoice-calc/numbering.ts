/**
 * Invoice numbering (FR-CALC-01).
 *
 * Numbers come from a per-supplier, per-year sequential counter rendered
 * `YYYY-NNN` (zero-padded to three digits, growing naturally past 999 →
 * `2026-1000`). The counter is computed, not stored: callers pass the
 * supplier's existing numbers and this module derives the next one.
 * Cancelled invoices stay in the register, so their numbers remain in
 * `existing` and are never reused. Serialising concurrent assignments
 * (e.g. two tabs issuing at once) is the register storage layer's concern.
 */

export const INVOICE_NUMBER_EXAMPLE = "2026-001";

const SEQUENCE_PAD = 3;

/**
 * Canonical `YYYY-NNN`: a real four-digit year (1000–9999, matching the
 * `nextInvoiceNumber` contract) and a sequence of exactly 3 digits, or 4+
 * without a leading zero.
 */
const INVOICE_NUMBER_PATTERN = /^([1-9]\d{3})-(\d{3}|[1-9]\d{3,})$/;

interface ParsedInvoiceNumber {
  readonly year: number;
  readonly sequence: number;
}

function parseInvoiceNumber(candidate: string): ParsedInvoiceNumber | null {
  const match = INVOICE_NUMBER_PATTERN.exec(candidate);
  if (!match) {
    return null;
  }
  const [, yearPart, sequencePart] = match;
  const sequence = Number.parseInt(sequencePart, 10);
  if (sequence === 0) {
    return null;
  }
  return {
    year: Number.parseInt(yearPart, 10),
    sequence,
  };
}

/**
 * Computes the next invoice number for `year` from the supplier's existing
 * numbers. Entries from other years or in foreign formats are ignored.
 */
export function nextInvoiceNumber(
  existing: readonly string[],
  year: number
): string {
  if (!Number.isSafeInteger(year) || year < 1000 || year > 9999) {
    throw new Error(`Year must be a four-digit integer, received ${year}`);
  }
  let highestSequence = 0;
  for (const number of existing) {
    const parsed = parseInvoiceNumber(number);
    if (parsed && parsed.year === year && parsed.sequence > highestSequence) {
      highestSequence = parsed.sequence;
    }
  }
  const nextSequence = highestSequence + 1;
  return `${year}-${String(nextSequence).padStart(SEQUENCE_PAD, "0")}`;
}

export type NumberValidation =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "duplicate" | "malformed";
      readonly message: string;
    };

/**
 * Validates a user-edited invoice number against the register: it must be
 * canonical `YYYY-NNN` and unique among the supplier's existing numbers.
 */
export function validateNumber(
  candidate: string,
  existing: readonly string[]
): NumberValidation {
  const trimmed = candidate.trim();
  const parsed = parseInvoiceNumber(trimmed);
  if (!parsed) {
    return {
      ok: false,
      reason: "malformed",
      message: `Invoice number must look like ${INVOICE_NUMBER_EXAMPLE} (year-sequence)`,
    };
  }
  if (existing.includes(trimmed)) {
    return {
      ok: false,
      reason: "duplicate",
      message: `Invoice number ${trimmed} is already used; the next free number is ${nextInvoiceNumber(existing, parsed.year)}`,
    };
  }
  return { ok: true };
}
