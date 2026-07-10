// Server-side DOCX renderer for the résumé export (FR-EXPORT-03). Colocated
// with its route. Unlike PDF, docx does NOT embed fonts — it names one and the
// reader renders it — so Ukrainian text is safe with any cross-platform font;
// Calibri is Word's default and present on Windows/macOS/most Linux setups.
import { Document, Packer, Paragraph, TextRun } from "docx";

import type { ExportDocument, ExportSections } from "@/entities/export-document";

const FONT = "Calibri";
const INK = "16243D";
const MUTED = "6B7280";

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 120 },
    children: [new TextRun({ text, font: FONT, size: 22, color: INK })],
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: FONT, size: 22, color: INK })],
  });
}

/** Structured sections (§4.4) — same section order as PDF + plain-text renderers. */
function sectionParagraphs(sections: ExportSections): Paragraph[] {
  const out: Paragraph[] = [];
  const { contact, summary, experience, skills, education } = sections;

  if (contact !== undefined) {
    if (contact.name !== undefined) {
      out.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: contact.name, font: FONT, bold: true, size: 30, color: INK })],
        }),
      );
    }
    const line = [contact.email, contact.phone, ...(contact.links ?? [])].filter(
      (v): v is string => v !== undefined && v !== "",
    );
    if (line.length > 0) {
      out.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: line.join("  |  "), font: FONT, size: 18, color: MUTED })],
        }),
      );
    }
  }
  if (summary !== undefined) for (const line of summary) out.push(bodyParagraph(line));
  if (experience !== undefined) {
    for (const role of experience) {
      out.push(
        new Paragraph({
          spacing: { before: 160, after: role.dateRange !== undefined ? 20 : 80 },
          children: [new TextRun({ text: role.title, font: FONT, bold: true, size: 24, color: INK })],
        }),
      );
      if (role.dateRange !== undefined) {
        out.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: role.dateRange, font: FONT, italics: true, size: 18, color: MUTED })],
          }),
        );
      }
      for (const bullet of role.bullets) out.push(bulletParagraph(bullet));
    }
  }
  if (skills !== undefined && skills.length > 0) out.push(bodyParagraph(skills.join(", ")));
  if (education !== undefined) for (const line of education) out.push(bodyParagraph(line));
  return out;
}

export function renderResumeDocx(doc: ExportDocument): Promise<Buffer> {
  const children: Paragraph[] = [];

  if (doc.headline !== undefined && doc.headline !== "") {
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: doc.headline, font: FONT, bold: true, size: 36, color: INK })],
      }),
    );
  }

  if (doc.sections !== undefined) {
    children.push(...sectionParagraphs(doc.sections));
  } else {
    for (const bullet of doc.bullets) children.push(bulletParagraph(bullet));
  }

  if (doc.footer !== undefined && doc.footer !== "") {
    children.push(
      new Paragraph({
        spacing: { before: 360 },
        children: [new TextRun({ text: doc.footer, font: FONT, size: 18, color: MUTED })],
      }),
    );
  }

  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
