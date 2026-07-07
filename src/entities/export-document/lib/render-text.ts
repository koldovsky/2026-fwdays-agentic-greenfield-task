// Plain-text renderer for an ExportDocument (FR-EXPORT-01, clipboard). Pure and
// deterministic — the same model the PDF/DOCX renderers consume, rendered as
// newline-delimited text. Replaces the old view-local buildExportText helper.
// When `sections` is present it renders the structured document; otherwise it
// falls back to the flat bullet list (§4.4 flat fallback).
import type { ExportDocument, ExportSections } from "../model/types";

/** Render the structured sections (§4.4); consistent order with PDF/DOCX. */
function renderSections(sections: ExportSections): string[] {
  const parts: string[] = [];
  const { contact, summary, experience, skills, education } = sections;

  if (contact !== undefined) {
    if (contact.name !== undefined) parts.push(contact.name);
    const line = [contact.email, contact.phone, ...(contact.links ?? [])].filter(
      (v): v is string => v !== undefined && v !== "",
    );
    if (line.length > 0) parts.push(line.join("  |  "));
    parts.push("");
  }
  if (summary !== undefined && summary.length > 0) {
    parts.push(...summary, "");
  }
  if (experience !== undefined && experience.length > 0) {
    for (const role of experience) {
      parts.push(role.dateRange !== undefined ? `${role.title}  (${role.dateRange})` : role.title);
      parts.push(...role.bullets.map((b) => `- ${b}`));
      parts.push("");
    }
  }
  if (skills !== undefined && skills.length > 0) {
    parts.push(skills.join(", "), "");
  }
  if (education !== undefined && education.length > 0) {
    parts.push(...education, "");
  }
  // Drop a trailing empty line for tidiness.
  while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

export function renderPlainText(doc: ExportDocument): string {
  const parts: string[] = [];
  if (doc.headline !== undefined && doc.headline !== "") {
    parts.push(doc.headline, "");
  }
  if (doc.sections !== undefined) {
    parts.push(...renderSections(doc.sections));
  } else {
    parts.push(...doc.bullets.map((bullet) => `- ${bullet}`));
  }
  // Cover-letter prose (§4): blank-line-separated paragraphs, no bullet prefix.
  if (doc.coverLetter !== undefined && doc.coverLetter.paragraphs.length > 0) {
    parts.push(doc.coverLetter.paragraphs.join("\n\n"));
  }
  if (doc.footer !== undefined && doc.footer !== "") {
    parts.push("", doc.footer);
  }
  return parts.join("\n");
}
