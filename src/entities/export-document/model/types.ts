// export-document entity — the format-agnostic model every export format
// (clipboard / PDF / DOCX) renders from (add-resume-wizard §4, FR-EXPORT-*).
// One source of truth: an optional headline, the ordered bullets to export,
// and an optional footer line (the free-tier attribution, FR-EXPORT-04).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO, no renderer imports.

/**
 * A grounded cover letter as ordered prose paragraphs (add-tailoring-intelligence
 * §4). Optional and format-agnostic: the résumé exports ignore it, the
 * cover-letter export renders it. Kept separate from `bullets` so neither
 * renderer has to guess which a string is.
 */
export interface CoverLetterBlock {
  readonly paragraphs: readonly string[];
}

export interface ExportDocument {
  /** Optional document title (e.g. a localized "Tailored résumé"). */
  readonly headline?: string;
  /** The bullets to export, already filtered + ordered by the builder. */
  readonly bullets: readonly string[];
  /** Optional grounded cover-letter prose (§4); absent for résumé exports. */
  readonly coverLetter?: CoverLetterBlock;
  /** Free-tier attribution line; omitted for paid exports (FR-EXPORT-04). */
  readonly footer?: string;
}
