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

/**
 * Optional structured résumé sections (improve-tailoring-quality §4.2). Every
 * section is optional: an undetected section is omitted, never fabricated. When
 * `sections` is present the renderers lay out a structured document; when it is
 * absent they fall back to the flat `bullets` list (§4.4), so pre-T5 exports and
 * cover-letter exports are unaffected. Framework-free (TC-PURE-01).
 *
 * SECURITY (NFR-SEC-01/02): `contact` holds PII (name/email/phone/links). It is
 * export-render ONLY and is set exclusively by the client export builder from the
 * candidate's own parsed CV — it MUST NEVER be placed in an LLM payload or logged.
 */
export interface ExportContact {
  readonly name?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly links?: readonly string[];
}

export interface ExportExperienceRole {
  /** Role/header line, CV's original language. */
  readonly title: string;
  /** Human-readable date range as it appeared on the CV (original language). */
  readonly dateRange?: string;
  /** Bullets for this role — kept tailored bullets after the merge (§4.3). */
  readonly bullets: readonly string[];
}

export interface ExportSections {
  readonly contact?: ExportContact;
  readonly summary?: readonly string[];
  readonly experience?: readonly ExportExperienceRole[];
  readonly skills?: readonly string[];
  readonly education?: readonly string[];
}

export interface ExportDocument {
  /** Optional document title (e.g. a localized "Tailored résumé"). */
  readonly headline?: string;
  /** The bullets to export, already filtered + ordered by the builder. */
  readonly bullets: readonly string[];
  /**
   * Optional structured sections (§4.2). When present the renderers render the
   * structure; `bullets` stays populated as the flat fallback / plain-text body.
   */
  readonly sections?: ExportSections;
  /** Optional grounded cover-letter prose (§4); absent for résumé exports. */
  readonly coverLetter?: CoverLetterBlock;
  /** Free-tier attribution line; omitted for paid exports (FR-EXPORT-04). */
  readonly footer?: string;
}
