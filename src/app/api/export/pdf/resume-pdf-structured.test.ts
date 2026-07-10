// Group 4 PDF renderer tests for structured sections (§4.4 format parity).
// Written by the TEST-AUTHOR subagent (maker≠test-author, separation of duties).
// Follows the round-trip pattern in resume-pdf.test.ts (pdf-parse extraction).
// Covers: sections rendered (contact/summary/experience/skills/education);
// flat fallback when sections absent; Cyrillic round-trip (PT Sans); footer parity.
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
        dateRange: "Серпень 2020 – дотепер",
        bullets: ["Розробив платформу.", "Керував командою."],
      },
    ],
    skills: ["typescript", "react"],
  },
};

// ---------------------------------------------------------------------------
// Structured PDF rendering (§4.4)
// ---------------------------------------------------------------------------

describe("renderResumePdf: structured sections (§4.4, FR-EXPORT-02)", () => {
  it("renders headline in the output", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Tailored Résumé");
  });

  it("renders contact name and email", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Ivan Shevchenko");
    expect(text).toContain("ivan@example.com");
  });

  it("renders summary line", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Experienced backend engineer");
  });

  it("renders experience role title and date range", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Senior Engineer, FinBank");
    expect(text).toContain("Jan 2020");
  });

  it("renders kept bullets for the first role", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Led migration to microservices.");
    expect(text).toContain("Reduced latency by 40%.");
  });

  it("renders later role title (empty-bullet role contributes no fabricated content)", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Junior Developer, StartupXYZ");
  });

  it("renders skills", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("typescript");
    expect(text).toContain("react");
    expect(text).toContain("postgresql");
  });

  it("renders education line", async () => {
    const buffer = await renderResumePdf(structuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("National Technical University of Ukraine");
  });

  it("renders footer (FR-EXPORT-04)", async () => {
    const buffer = await renderResumePdf(structuredDoc);
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
    const buffer = await renderResumePdf(paidDoc);
    const text = await extractText(buffer);
    expect(text).not.toContain("Vouch");
  });
});

// ---------------------------------------------------------------------------
// Flat fallback (§4.4)
// ---------------------------------------------------------------------------

describe("renderResumePdf: flat fallback when sections absent (§4.4)", () => {
  it("renders bullets list when document has no sections", async () => {
    const flat: ExportDocument = {
      bullets: [
        "Built TypeScript APIs at scale.",
        "Shipped the mobile payment flow.",
      ],
      footer: "Tailored with Vouch",
    };
    const buffer = await renderResumePdf(flat);
    const text = await extractText(buffer);
    expect(text).toContain("Built TypeScript APIs at scale.");
    expect(text).toContain("Shipped the mobile payment flow.");
    expect(text).toContain("Tailored with Vouch");
  });
});

// ---------------------------------------------------------------------------
// Cyrillic round-trip via PT Sans (§4.4, NFR-I18N-01)
// ---------------------------------------------------------------------------

describe("renderResumePdf: Cyrillic round-trip via PT Sans (§4.4, NFR-I18N-01)", () => {
  it("Cyrillic contact, summary, title, dateRange, and bullets render as extractable text", async () => {
    const buffer = await renderResumePdf(cyrillicStructuredDoc);
    const text = await extractText(buffer);
    expect(text).toContain("Іван Шевченко");
    expect(text).toContain("ivan@example.ua");
    expect(text).toContain("Старший інженер з досвідом у ФінТех.");
    expect(text).toContain("Старший інженер, ФінБанк");
    expect(text).toContain("Розробив платформу.");
    expect(text).toContain("Керував командою.");
  });
});
