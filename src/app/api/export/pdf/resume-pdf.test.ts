// Round-trip check (add-resume-wizard task 5.4): render a Cyrillic
// ExportDocument to PDF, then extract its text back out with pdf-parse (the
// same library the CV-upload path already trusts) to prove the PT Sans
// registration actually renders Ukrainian glyphs rather than silently
// dropping/tofu-ing them, and that the free-tier footer is present/absent
// exactly as given.
import { PDFParse } from "pdf-parse";
import { describe, expect, it } from "vitest";

import type { ExportDocument } from "@/entities/export-document";

import { renderResumePdf } from "./resume-pdf";

async function extractText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => page.text).join("\n");
  } finally {
    await parser.destroy();
  }
}

describe("renderResumePdf Cyrillic round-trip (FR-EXPORT-02, NFR-I18N-01)", () => {
  it("renders Ukrainian headline, bullets, and footer as extractable text", async () => {
    const doc: ExportDocument = {
      headline: "Іван Петренко — Розробник програмного забезпечення",
      bullets: [
        "Розробив платформу обробки даних для 200 000 користувачів.",
        "Керував командою з п'яти інженерів під час міграції на мікросервіси.",
      ],
      footer: "Створено у Vouch — чесний помічник резюме",
    };

    const buffer = await renderResumePdf(doc);
    const text = await extractText(buffer);

    expect(text).toContain("Іван Петренко");
    expect(text).toContain("Розробив платформу обробки даних");
    expect(text).toContain("Керував командою з п'яти інженерів");
    expect(text).toContain("Створено у Vouch");
  });

  it("omits the footer line entirely when the document has none (paid export, FR-EXPORT-04)", async () => {
    const doc: ExportDocument = {
      headline: "Тестовий заголовок",
      bullets: ["Єдиний пункт резюме."],
    };

    const buffer = await renderResumePdf(doc);
    const text = await extractText(buffer);

    expect(text).toContain("Тестовий заголовок");
    expect(text).toContain("Єдиний пункт резюме");
    expect(text).not.toContain("Vouch");
  });
});
