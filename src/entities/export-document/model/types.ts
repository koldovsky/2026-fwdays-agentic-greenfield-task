// export-document entity — the format-agnostic model every export format
// (clipboard / PDF / DOCX) renders from (add-resume-wizard §4, FR-EXPORT-*).
// One source of truth: an optional headline, the ordered bullets to export,
// and an optional footer line (the free-tier attribution, FR-EXPORT-04).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO, no renderer imports.

export interface ExportDocument {
  /** Optional document title (e.g. a localized "Tailored résumé"). */
  readonly headline?: string;
  /** The bullets to export, already filtered + ordered by the builder. */
  readonly bullets: readonly string[];
  /** Free-tier attribution line; omitted for paid exports (FR-EXPORT-04). */
  readonly footer?: string;
}
