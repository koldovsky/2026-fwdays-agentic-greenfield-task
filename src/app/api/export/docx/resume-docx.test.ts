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
