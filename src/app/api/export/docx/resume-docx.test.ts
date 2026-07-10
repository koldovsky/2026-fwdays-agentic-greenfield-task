// Round-trip check (add-resume-wizard task 5.4): render a Cyrillic
// ExportDocument to DOCX, then extract its text back out with mammoth (the
// same library the CV-upload path already trusts) to prove Ukrainian text
// survives the docx package's XML serialization, and that the free-tier
// footer is present/absent exactly as given.
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";

import type { ExportDocument } from "@/entities/export-document";

import { renderResumeDocx } from "./resume-docx";

describe("renderResumeDocx Cyrillic round-trip (FR-EXPORT-03, NFR-I18N-01)", () => {
  it("renders Ukrainian headline, bullets, and footer as extractable text", async () => {
    const doc: ExportDocument = {
      headline: "Іван Петренко — Розробник програмного забезпечення",
      bullets: [
        "Розробив платформу обробки даних для 200 000 користувачів.",
        "Керував командою з п'яти інженерів під час міграції на мікросервіси.",
      ],
      footer: "Створено у Vouch — чесний помічник резюме",
    };

    const buffer = await renderResumeDocx(doc);
    const { value: text } = await mammoth.extractRawText({ buffer });

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

    const buffer = await renderResumeDocx(doc);
    const { value: text } = await mammoth.extractRawText({ buffer });

    expect(text).toContain("Тестовий заголовок");
    expect(text).toContain("Єдиний пункт резюме");
    expect(text).not.toContain("Vouch");
  });
});

describe("renderResumeDocx: structured sections (§4.4/4.6, FR-EXPORT-03)", () => {
  it("renders contact, summary, experience, skills, education via sections", async () => {
    const doc: ExportDocument = {
      bullets: ["fallback"],
      sections: {
        contact: { name: "Іван Петренко", email: "ivan@example.ua" },
        summary: ["Досвідчений інженер."],
        experience: [
          { title: "Старший інженер, ТОВ Acme", dateRange: "2019-2024", bullets: ["Розробив мікросервіси"] },
        ],
        skills: ["go", "docker", "postgresql"],
        education: ["Бакалавр, КПІ, 2019"],
      },
      footer: "Vouch free tier",
    };

    const buffer = await renderResumeDocx(doc);
    const { value: text } = await mammoth.extractRawText({ buffer });

    expect(text).toContain("Іван Петренко");
    expect(text).toContain("ivan@example.ua");
    expect(text).toContain("Досвідчений інженер.");
    expect(text).toContain("Старший інженер");
    expect(text).toContain("Розробив мікросервіси");
    expect(text).toContain("go");
    expect(text).toContain("Бакалавр");
    expect(text).toContain("Vouch free tier");
  });

  it("FLAT FALLBACK: no sections → renders bullets not section content (§4.4)", async () => {
    const doc: ExportDocument = {
      bullets: ["Built a REST API in Node.js."],
    };
    const buffer = await renderResumeDocx(doc);
    const { value: text } = await mammoth.extractRawText({ buffer });
    expect(text).toContain("Built a REST API in Node.js");
  });

  it("FORMAT PARITY: sections path and flat path both render the footer (FR-EXPORT-04)", async () => {
    const footerText = "Vouch free tier";

    const withSections: ExportDocument = {
      bullets: [],
      sections: { experience: [{ title: "Dev", bullets: ["Built things"] }], skills: [] },
      footer: footerText,
    };
    const withFlat: ExportDocument = {
      bullets: ["Built things"],
      footer: footerText,
    };

    const [bufA, bufB] = await Promise.all([
      renderResumeDocx(withSections),
      renderResumeDocx(withFlat),
    ]);
    const [{ value: textA }, { value: textB }] = await Promise.all([
      mammoth.extractRawText({ buffer: bufA }),
      mammoth.extractRawText({ buffer: bufB }),
    ]);

    expect(textA).toContain(footerText);
    expect(textB).toContain(footerText);
  });

  it("Cyrillic round-trip with structured sections (NFR-I18N-01)", async () => {
    const doc: ExportDocument = {
      bullets: [],
      sections: {
        contact: { name: "Олена Коваленко" },
        experience: [
          { title: "Провідний розробник", dateRange: "2020-дотепер", bullets: ["Побудував систему платежів"] },
        ],
        skills: ["typescript", "react"],
      },
    };
    const buffer = await renderResumeDocx(doc);
    const { value: text } = await mammoth.extractRawText({ buffer });
    expect(text).toContain("Олена Коваленко");
    expect(text).toContain("Провідний розробник");
    expect(text).toContain("Побудував систему платежів");
  });
});
