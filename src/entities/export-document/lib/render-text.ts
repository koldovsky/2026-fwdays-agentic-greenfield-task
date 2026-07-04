// Plain-text renderer for an ExportDocument (FR-EXPORT-01, clipboard). Pure and
// deterministic — the same model the PDF/DOCX renderers consume, rendered as
// newline-delimited text. Replaces the old view-local buildExportText helper.
import type { ExportDocument } from "../model/types";

export function renderPlainText(doc: ExportDocument): string {
  const parts: string[] = [];
  if (doc.headline !== undefined && doc.headline !== "") {
    parts.push(doc.headline, "");
  }
  parts.push(...doc.bullets.map((bullet) => `- ${bullet}`));
  // Cover-letter prose (§4): blank-line-separated paragraphs, no bullet prefix.
  if (doc.coverLetter !== undefined && doc.coverLetter.paragraphs.length > 0) {
    parts.push(doc.coverLetter.paragraphs.join("\n\n"));
  }
  if (doc.footer !== undefined && doc.footer !== "") {
    parts.push("", doc.footer);
  }
  return parts.join("\n");
}
