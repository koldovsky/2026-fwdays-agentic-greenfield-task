// Group 4 tests for renderPlainText with structured sections (§4.4 parity).
// Written by the TEST-AUTHOR subagent (maker≠test-author, separation of duties).
// Covers: sections rendered in consistent order (contact/summary/experience/
// skills/education), flat fallback when sections absent, Cyrillic pass-through,
// footer behavior unchanged (FR-EXPORT-01/04).
import { describe, expect, it } from "vitest";

import type { ExportDocument } from "../model/types";
import { renderPlainText } from "./render-text";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const structuredDoc: ExportDocument = {
  headline: "Tailored Résumé",
  bullets: ["Led migration to microservices.", "Reduced latency by 40%."],
  sections: {
    contact: {
      name: "Ivan Shevchenko",
      email: "ivan@example.com",
      phone: "+380-97-000-0000",
      links: ["https://github.com/ivanshevchenko"],
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
    contact: {
      name: "Іван Шевченко",
      email: "ivan@example.ua",
    },
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
// Structured rendering (§4.4 format parity)
// ---------------------------------------------------------------------------

describe("renderPlainText: structured sections (§4.4)", () => {
  it("renders headline when present", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("Tailored Résumé");
  });

  it("renders contact name and email on separate/combined lines", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("Ivan Shevchenko");
    expect(text).toContain("ivan@example.com");
  });

  it("renders contact phone and links in the contact line", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("+380-97-000-0000");
    expect(text).toContain("https://github.com/ivanshevchenko");
  });

  it("renders summary lines", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("Experienced backend engineer with 5 years in FinTech.");
  });

  it("renders experience role titles with date ranges", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("Senior Engineer, FinBank");
    expect(text).toContain("Jan 2020");
  });

  it("renders kept bullets under the first role with a dash prefix", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("- Led migration to microservices.");
    expect(text).toContain("- Reduced latency by 40%.");
  });

  it("renders later roles with title+date but no bullets", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("Junior Developer, StartupXYZ");
    expect(text).toContain("2018-2019");
  });

  it("renders skills section", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("typescript");
    expect(text).toContain("react");
    expect(text).toContain("postgresql");
  });

  it("renders education lines", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("National Technical University of Ukraine");
  });

  it("renders footer when present (FR-EXPORT-04)", () => {
    const text = renderPlainText(structuredDoc);
    expect(text).toContain("Tailored with Vouch — free tier");
  });

  it("omits footer when absent (paid export, FR-EXPORT-04)", () => {
    const paidDoc: ExportDocument = {
      bullets: ["Led migration."],
      sections: {
        experience: [{ title: "Engineer, Acme", bullets: ["Led migration."] }],
        skills: ["go"],
      },
    };
    const text = renderPlainText(paidDoc);
    expect(text).not.toContain("Vouch");
    expect(text).not.toContain("footer");
  });

  it("sections order is: contact → summary → experience → skills → education", () => {
    const text = renderPlainText(structuredDoc);
    const contactIdx = text.indexOf("Ivan Shevchenko");
    const summaryIdx = text.indexOf("Experienced backend engineer");
    const experienceIdx = text.indexOf("Senior Engineer, FinBank");
    const skillsIdx = text.indexOf("typescript");
    const educationIdx = text.indexOf("National Technical University");

    expect(contactIdx).toBeLessThan(summaryIdx);
    expect(summaryIdx).toBeLessThan(experienceIdx);
    expect(experienceIdx).toBeLessThan(skillsIdx);
    expect(skillsIdx).toBeLessThan(educationIdx);
  });
});

// ---------------------------------------------------------------------------
// Flat fallback (§4.4)
// ---------------------------------------------------------------------------

describe("renderPlainText: flat fallback when sections absent (§4.4)", () => {
  it("renders flat bullet list when document has no sections", () => {
    const flat: ExportDocument = {
      bullets: ["Built APIs.", "Mentored two engineers."],
      footer: "Tailored with Vouch",
    };
    const text = renderPlainText(flat);
    expect(text).toContain("- Built APIs.");
    expect(text).toContain("- Mentored two engineers.");
    expect(text).toContain("Tailored with Vouch");
  });

  it("flat fallback renders no section headers (no fabricated structure)", () => {
    const flat: ExportDocument = { bullets: ["Only bullet."] };
    const text = renderPlainText(flat);
    // Should not invent headers like "Experience:" or "Skills:" when no sections.
    expect(text).not.toMatch(/^(Experience|Skills|Education|Summary):/im);
    expect(text).toBe("- Only bullet.");
  });

  it("empty sections object → still uses structured path (no crash)", () => {
    const emptyish: ExportDocument = { bullets: ["Bullet."], sections: {} };
    expect(() => renderPlainText(emptyish)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cyrillic round-trip (§4.4, NFR-I18N-01)
// ---------------------------------------------------------------------------

describe("renderPlainText: Cyrillic pass-through (§4.4, NFR-I18N-01)", () => {
  it("Cyrillic name, summary, experience title, and bullets survive rendering", () => {
    const text = renderPlainText(cyrillicStructuredDoc);
    expect(text).toContain("Іван Шевченко");
    expect(text).toContain("ivan@example.ua");
    expect(text).toContain("Старший інженер з досвідом у ФінТех.");
    expect(text).toContain("Старший інженер, ФінБанк");
    expect(text).toContain("Січень 2020 – дотепер");
    expect(text).toContain("- Розробив платформу.");
    expect(text).toContain("- Керував командою.");
  });

  it("is deterministic across multiple renders (TC-PURE-01)", () => {
    const a = renderPlainText(cyrillicStructuredDoc);
    const b = renderPlainText(cyrillicStructuredDoc);
    expect(a).toBe(b);
  });
});
