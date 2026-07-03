// Server-side DOCX renderer for the résumé export (FR-EXPORT-03). Colocated
// with its route. Unlike PDF, docx does NOT embed fonts — it names one and the
// reader renders it — so Ukrainian text is safe with any cross-platform font;
// Calibri is Word's default and present on Windows/macOS/most Linux setups.
import { Document, Packer, Paragraph, TextRun } from "docx";

import type { ExportDocument } from "@/entities/export-document";

const FONT = "Calibri";
const INK = "16243D";
const MUTED = "6B7280";

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

  for (const bullet of doc.bullets) {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 120 },
        children: [new TextRun({ text: bullet, font: FONT, size: 22, color: INK })],
      }),
    );
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
