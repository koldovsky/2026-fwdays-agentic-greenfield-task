// Assembles the cover-letter ExportDocument from the tailoring's already-grounded
// bullets (add-tailoring-intelligence §4, decision #6 — MVP reflows grounded
// bullets to prose; a fuller LLM-written letter is the later path behind
// buildCoverLetterPrompt). It reads the `includedInExport` flag the loop already
// set (applyExportDefaults excluded overclaim-risk by default, BC-HONESTY-02) and
// NEVER re-derives that exclusion — so an overclaim can't leak into the letter
// (§4 scenario: excluded bullets do not reappear). The greeting/intro/closing are
// neutral Ukrainian framing supplied by the caller (i18n), never new claims.
import type { Bullet } from "@/entities/bullet";
import type { ExportDocument } from "@/entities/export-document";

export interface BuildCoverLetterOptions {
  /** Localized opening line (e.g. "Доброго дня!"). */
  readonly greeting?: string;
  /** Localized connective line introducing the grounded highlights. */
  readonly intro?: string;
  /** Localized closing line (e.g. "З повагою"). */
  readonly closing?: string;
  readonly headline?: string;
  readonly footer?: string;
}

/**
 * Build the cover-letter ExportDocument. `bullets` are the tailoring's bullets;
 * only those flagged `includedInExport` (grounded, kept) become body paragraphs.
 * Returns an empty-bullets document carrying the `coverLetter` prose block.
 */
export function buildCoverLetterDocument(
  bullets: readonly Bullet[],
  options: BuildCoverLetterOptions = {},
): ExportDocument {
  const grounded = bullets
    .filter((bullet) => bullet.includedInExport)
    .map((bullet) => bullet.text);

  const paragraphs: string[] = [];
  if (options.greeting) paragraphs.push(options.greeting);
  if (options.intro) paragraphs.push(options.intro);
  paragraphs.push(...grounded);
  if (options.closing) paragraphs.push(options.closing);

  return {
    ...(options.headline !== undefined && options.headline !== ""
      ? { headline: options.headline }
      : {}),
    bullets: [],
    coverLetter: { paragraphs },
    ...(options.footer !== undefined && options.footer !== "" ? { footer: options.footer } : {}),
  };
}
