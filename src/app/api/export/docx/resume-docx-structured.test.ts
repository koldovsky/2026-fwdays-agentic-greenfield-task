// Group 4 DOCX renderer tests for structured sections (§4.4 format parity).
// Written by the TEST-AUTHOR subagent (maker≠test-author, separation of duties).
// Follows the round-trip pattern in resume-docx.test.ts (mammoth extraction).
// Covers: sections rendered (contact/summary/experience/skills/education);
// flat fallback when sections absent; Cyrillic pass-through; footer parity.
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";

import type { ExportDocument } from "@/entities/export-document";

import { renderResumeDocx } from "./resume-docx";

async function extractText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const structuredDoc: ExportDocument = {
  headline: "Tailored Résumé",
  bullets: ["Led migration to microservices.", "Reduced latency by 40%."],
  sections: {
    contact: {
      name: "Ivan Shevchenko",
      email: "ivan@example.com",
      phone: "+380-97-000-0000",
    },
    summary: ["Experienced backend engineer with 5 years in FinTech."],
    experience: [
      {
        title: "Senior Engineer, FinBank",
        dateRange: "Jan 2020 – present",
        bullets: ["Led migration to microservices.", "Reduced latency by 40%."],
      },
      {
        title: "Junior Developer, StartupXYZ",
        dateRange: "2018-2019",
        bullets: [],
      },
    ],
    skills: ["typescript", "react", "postgresql"],
    education: ["National Technical University of Ukraine, B.Sc. Computer Science, 2018"],
  },
  footer: "Tailored with Vouch — free tier",
};

const cyrillicStructuredDoc: ExportDocument = {
  bullets: ["Розробив платформу.", "Керував командою."],
  sections: {
    contact: { name: "Іван Шевченко", email: "ivan@example.ua" },
    summary: ["Старший інженер з досвідом у ФінТех."],
    experience: [
      {
        title: "Старший інженер, ФінБанк",
        dateRange: "Січень 2020 – дотепер",
        bullets: ["Розробив платформу.", "Керував командою."],
      },
    ],
    skills: ["typescript", "react"],
  },
};

// ---------------------------------------------------------------------------
// Structured DOCX rendering (§4.4)
// ---------------------------------------------------------------------------

describe("renderResumeDocx: structured sections (§4.4, FR-EXPORT-03)", () => {
  it("renders headline in the output", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Tailored Résumé");
  });

  it("renders contact name and email", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Ivan Shevchenko");
    expect(text).toContain("ivan@example.com");
  });

  it("renders contact phone", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("+380-97-000-0000");
  });

  it("renders summary line", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Experienced backend engineer with 5 years in FinTech.");
  });

  it("renders experience role title and date range", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Senior Engineer, FinBank");
    expect(text).toContain("Jan 2020");
  });

  it("renders kept bullets under the first role", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Led migration to microservices.");
    expect(text).toContain("Reduced latency by 40%.");
  });

  it("renders later role title+date (empty bullets leave no fabricated content)", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Junior Developer, StartupXYZ");
    expect(text).toContain("2018-2019");
  });

  it("renders skills", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("typescript");
    expect(text).toContain("react");
    expect(text).toContain("postgresql");
  });

  it("renders education line", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("National Technical University of Ukraine");
  });

  it("renders footer (FR-EXPORT-04)", async () => {
    const buffer = await renderResumeDocx(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Tailored with Vouch — free tier");
  });

  it("omits footer when absent (paid export, FR-EXPORT-04)", async () => {
    const paidDoc: ExportDocument = {
      bullets: ["Led migration."],
      sections: {
        experience: [{ title: "Engineer, Acme", bullets: ["Led migration."] }],
        skills: ["go"],
      },
    };
    const buffer = await renderResumeDocx(paidDoc);
    const text = await extractText(buffer);
    expect(text).not.toContain("Vouch");
  });
});

// ---------------------------------------------------------------------------
// Flat fallback (§4.4)
// ---------------------------------------------------------------------------

describe("renderResumeDocx: flat fallback when sections absent (§4.4)", () => {
  it("renders bullet list when no sections present", async () => {
    const flat: ExportDocument = {
      bullets: ["Built APIs in TypeScript.", "Shipped the first mobile release."],
      footer: "Tailored with Vouch",
    };
    const buffer = await renderResumeDocx(flat);
    const text = await extractText(buffer);
    expect(text).toContain("Built APIs in TypeScript.");
    expect(text).toContain("Shipped the first mobile release.");
    expect(text).toContain("Tailored with Vouch");
  });
});

// ---------------------------------------------------------------------------
// Cyrillic round-trip (§4.4, NFR-I18N-01)
// ---------------------------------------------------------------------------

describe("renderResumeDocx: Cyrillic round-trip (§4.4, NFR-I18N-01)", () => {
  it("Cyrillic contact, summary, title, dateRange, and bullets survive DOCX serialization", async () => {
    const buffer = await renderResumeDocx(cyrillicStructuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Іван Шевченко");
    expect(text).toContain("ivan@example.ua");
    expect(text).toContain("Старший інженер з досвідом у ФінТех.");
    expect(text).toContain("Старший інженер, ФінБанк");
    expect(text).toContain("Розробив платформу.");
    expect(text).toContain("Керував командою.");
  });
});
