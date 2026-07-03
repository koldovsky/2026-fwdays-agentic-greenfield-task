// Builds the format-agnostic ExportDocument from the tailored bullets
// (add-resume-wizard §4, task 4.2). Filters to the bullets the user kept
// (includedInExport — the loop's applyExportDefaults already excluded
// overclaim-risk by default, BC-HONESTY-02; this NEVER re-derives that, it only
// reads the flag), preserving order. The footer is passed in by the caller so
// this stays free of i18n/entitlement concerns: caller supplies the free-tier
// attribution line for a free export and omits it for a paid one (FR-EXPORT-04).
import type { Bullet } from "@/entities/bullet";
import type { ExportDocument } from "@/entities/export-document";

export interface BuildExportDocumentOptions {
  readonly headline?: string;
  readonly footer?: string;
}

export function buildExportDocument(
  bullets: readonly Bullet[],
  options: BuildExportDocumentOptions = {},
): ExportDocument {
  return {
    ...(options.headline !== undefined && options.headline !== ""
      ? { headline: options.headline }
      : {}),
    bullets: bullets.filter((bullet) => bullet.includedInExport).map((bullet) => bullet.text),
    ...(options.footer !== undefined && options.footer !== "" ? { footer: options.footer } : {}),
  };
}
