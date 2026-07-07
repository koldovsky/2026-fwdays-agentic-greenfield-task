// cv-profile entity — business noun for the candidate's normalized résumé.
// The flat `CvProfile` (skills + sentences) is re-exported from the shared
// scoring core (single source of truth) for the pure scorer.
// `CvDocument` is a richer, OPTIONAL sectioned view of the same résumé used by
// the structured resume export (improve-tailoring-quality T5 §1.1/§4.1) and by
// tenure evaluation for duration requirements (§1.3).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

export type { CvProfile } from "@/shared/lib/scoring";

/**
 * A parsed calendar month range on a résumé (improve-tailoring-quality §1.1).
 * Months are absolute (year * 12 + monthIndex, monthIndex 0-11) so tenure is a
 * plain subtraction; a range with no parseable end is treated as ongoing and
 * anchored to the document's `asOfMonth` at tenure time (never fabricated here).
 * A range whose dates never parsed yields zero tenure downstream (§1.3) — no
 * false credit (BC-HONESTY-01).
 */
export interface CvDateRange {
  /** Absolute start month (year*12 + 0-11), or undefined if unparseable. */
  readonly startMonth?: number;
  /** Absolute end month, or undefined when "present"/"дотепер" (ongoing) or unparseable. */
  readonly endMonth?: number;
  /** True when the range explicitly ended with a present-marker (ongoing role). */
  readonly ongoing: boolean;
  /** The raw date text as it appeared on the CV (for render fidelity, original language). */
  readonly raw: string;
}

/**
 * One experience role parsed from the résumé (§1.1/§4.1). `title` is the raw
 * header line in the CV's ORIGINAL language; `bullets` are the role's original
 * bullet lines (later replaced by kept tailored bullets in the export merge,
 * §4.3). Nothing here is fabricated — an absent field is simply omitted.
 */
export interface CvRole {
  /** Raw role/header line, CV's original language (e.g. "Senior Engineer, Acme"). */
  readonly title: string;
  /** Parsed date range for the role, when a date line was detected. */
  readonly dateRange?: CvDateRange;
  /** The role's original bullet lines, in order (CV's original language). */
  readonly bullets: readonly string[];
}

/**
 * Contact block (§4.1). Every field is optional and included ONLY when detected
 * verbatim in the CV — never fabricated. SECURITY (NFR-SEC-01/02): these fields
 * are PII and are export-render only; they MUST NOT enter any LLM payload and
 * MUST NOT be logged in plaintext.
 */
export interface CvContact {
  readonly name?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly links?: readonly string[];
}

/**
 * A minimal sectioned view of a résumé (§1.1/§4.1). Every section is OPTIONAL:
 * a section absent from the source is omitted, never invented. The flat
 * {@link CvProfile} remains the scorer's input; this document is the structured
 * export source and the tenure input. Pure/deterministic (TC-PURE-01).
 */
export interface CvDocument {
  readonly contact?: CvContact;
  /** Free-text professional summary paragraph(s), CV's original language. */
  readonly summary?: readonly string[];
  /** Experience roles, in the order they appear on the CV. */
  readonly experience: readonly CvRole[];
  /** Skill tokens (same normalization as CvProfile.skills). */
  readonly skills: readonly string[];
  /** Education lines, CV's original language. */
  readonly education?: readonly string[];
}
