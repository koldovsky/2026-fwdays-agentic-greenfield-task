// Cyrillic round-trip (add-tailoring-intelligence §4.7, matching the résumé
// export test): render a Ukrainian cover-letter ExportDocument to PDF, extract
// its text back with pdf-parse, and prove PT Sans renders the Cyrillic prose
// (no tofu/dropped glyphs) and that the free-tier footer is present/absent
// exactly as given (FR-EXPORT-04).
import { PDFParse } from "pdf-parse";
import { describe, expect, it } from "vitest";

import type { ExportDocument } from "@/entities/export-document";

import { renderCoverLetterPdf } from "./cover-letter-pdf";

async function extractText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => page.text).join("\n");
  } finally {
    await parser.destroy();
  }
}

describe("renderCoverLetterPdf Cyrillic round-trip (FR-COVERLETTER-02, NFR-I18N-01)", () => {
  it("renders Ukrainian headline, paragraphs, and footer as extractable text (free export)", async () => {
    const doc: ExportDocument = {
      headline: "Супровідний лист",
      bullets: [],
      coverLetter: {
        paragraphs: [
          "Доброго дня!",
          "Розробив платформу обробки даних для 200 000 користувачів.",
          "Буду радий обговорити деталі. З повагою.",
        ],
      },
      footer: "Створено у Vouch — чесний помічник резюме",
    };

    const text = await extractText(await renderCoverLetterPdf(doc));

    expect(text).toContain("Супровідний лист");
    expect(text).toContain("Розробив платформу обробки даних");
    expect(text).toContain("Буду радий обговорити деталі");
    expect(text).toContain("Створено у Vouch");
  });

  it("omits the footer entirely for a paid export (FR-EXPORT-04)", async () => {
    const doc: ExportDocument = {
      headline: "Супровідний лист",
      bullets: [],
      coverLetter: { paragraphs: ["Єдиний абзац листа."] },
    };

    const text = await extractText(await renderCoverLetterPdf(doc));

    expect(text).toContain("Єдиний абзац листа");
    expect(text).not.toContain("Vouch");
  });
});
