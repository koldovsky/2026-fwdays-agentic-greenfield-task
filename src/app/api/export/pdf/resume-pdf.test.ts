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

describe("renderResumePdf: structured sections (§4.4/4.6, FR-EXPORT-02)", () => {
  // NOTE: pdf-parse extracts PT Sans Cyrillic glyphs reliably, but garbles
  // Latin/ASCII text in the embedded glyph space — asserting on Cyrillic strings
  // is the pattern the existing tests use for reliable extraction.
  it("renders contact name, summary, experience, skills, education via sections (Cyrillic, §4.6)", async () => {
    const doc: ExportDocument = {
      bullets: ["fallback"],
      sections: {
        contact: { name: "Іван Петренко" },
        summary: ["Досвідчений інженер."],
        experience: [
          { title: "Старший інженер, ТОВ", dateRange: "2019-2024", bullets: ["Розробив мікросервіси"] },
        ],
        skills: ["тайпскрипт", "реакт"],
        education: ["Бакалавр, КПІ, 2019"],
      },
      footer: "Тест підвалу",
    };

    const buffer = await renderResumePdf(doc);
    const text = await extractText(buffer);

    expect(text).toContain("Іван Петренко");
    expect(text).toContain("Досвідчений інженер.");
    expect(text).toContain("Старший інженер");
    expect(text).toContain("Розробив мікросервіси");
    expect(text).toContain("тайпскрипт");
    expect(text).toContain("Бакалавр");
    expect(text).toContain("Тест підвалу");
  });

  it("FLAT FALLBACK: no sections → renders Cyrillic bullets via the flat path (§4.4)", async () => {
    const doc: ExportDocument = {
      bullets: ["Розробив платформу обробки даних."],
    };
    const buffer = await renderResumePdf(doc);
    const text = await extractText(buffer);
    expect(text).toContain("Розробив платформу обробки даних");
  });

  it("FORMAT PARITY: sections path and flat path both render a Cyrillic footer (FR-EXPORT-04)", async () => {
    const footerText = "Тестовий підвал для перевірки";

    const withSections: ExportDocument = {
      bullets: [],
      sections: { experience: [{ title: "Розробник", bullets: ["Побудував речі"] }], skills: [] },
      footer: footerText,
    };
    const withFlat: ExportDocument = {
      bullets: ["Побудував речі"],
      footer: footerText,
    };

    const [bufA, bufB] = await Promise.all([
      renderResumePdf(withSections),
      renderResumePdf(withFlat),
    ]);
    const [textA, textB] = await Promise.all([extractText(bufA), extractText(bufB)]);

    expect(textA).toContain(footerText);
    expect(textB).toContain(footerText);
  });

  it("Cyrillic round-trip with structured sections (PT Sans, NFR-I18N-01)", async () => {
    const doc: ExportDocument = {
      bullets: [],
      sections: {
        contact: { name: "Олена Коваленко" },
        experience: [
          { title: "Провідний розробник", dateRange: "2020-дотепер", bullets: ["Побудував систему платежів"] },
        ],
        skills: ["тайпскрипт", "реакт"],
      },
    };
    const buffer = await renderResumePdf(doc);
    const text = await extractText(buffer);
    expect(text).toContain("Олена Коваленко");
    expect(text).toContain("Провідний розробник");
    expect(text).toContain("Побудував систему платежів");
  });
});
