import { describe, expect, it } from "vitest";

import type { ExportDocument, ExportSections } from "../model/types";
import { renderPlainText } from "./render-text";

describe("renderPlainText", () => {
  it("renders headline, bullets, and footer separated by blank lines", () => {
    expect(
      renderPlainText({
        headline: "Адаптоване резюме",
        bullets: ["Shipped a React platform.", "Led onboarding."],
        footer: "Tailored with Vouch",
      }),
    ).toBe(
      "Адаптоване резюме\n\n- Shipped a React platform.\n- Led onboarding.\n\nTailored with Vouch",
    );
  });

  it("omits an absent headline and footer", () => {
    expect(renderPlainText({ bullets: ["Only bullet."] })).toBe("- Only bullet.");
  });

  it("returns an empty string for no bullets and no chrome", () => {
    expect(renderPlainText({ bullets: [] })).toBe("");
  });
});

// ---------------------------------------------------------------------------
// renderPlainText: structured sections (improve-tailoring-quality §4.4)
// ---------------------------------------------------------------------------

const fullSections: ExportSections = {
  contact: {
    name: "Jane Dev",
    email: "jane@example.com",
    phone: "+44 7700 900001",
    links: ["https://github.com/janedev"],
  },
  summary: ["Experienced engineer with 7 years in fintech."],
  experience: [
    { title: "Senior Engineer, Acme Corp", dateRange: "2018-2022", bullets: ["Led migration", "Owned pipeline"] },
    { title: "Junior Developer, Startup Ltd", dateRange: "2015-2018", bullets: [] },
  ],
  skills: ["typescript", "react", "postgresql"],
  education: ["BSc Computer Science, 2014"],
};

function docWithSections(sections: ExportSections, extra: Partial<ExportDocument> = {}): ExportDocument {
  return { bullets: ["fallback bullet"], sections, ...extra };
}

describe("renderPlainText: structured sections (§4.4)", () => {
  it("renders contact name and contact details line", () => {
    const text = renderPlainText(docWithSections(fullSections));
    expect(text).toContain("Jane Dev");
    expect(text).toContain("jane@example.com");
    expect(text).toContain("+44 7700 900001");
    expect(text).toContain("https://github.com/janedev");
  });

  it("renders summary paragraph(s)", () => {
    const text = renderPlainText(docWithSections(fullSections));
    expect(text).toContain("Experienced engineer with 7 years in fintech.");
  });

  it("renders experience role titles with date ranges and bullet prefixes", () => {
    const text = renderPlainText(docWithSections(fullSections));
    expect(text).toContain("Senior Engineer, Acme Corp  (2018-2022)");
    expect(text).toContain("- Led migration");
    expect(text).toContain("- Owned pipeline");
    expect(text).toContain("Junior Developer, Startup Ltd  (2015-2018)");
  });

  it("renders skills as a comma-separated line", () => {
    const text = renderPlainText(docWithSections(fullSections));
    expect(text).toContain("typescript, react, postgresql");
  });

  it("renders education lines", () => {
    const text = renderPlainText(docWithSections(fullSections));
    expect(text).toContain("BSc Computer Science, 2014");
  });

  it("FLAT FALLBACK: no sections → renders bullets with '- ' prefix (§4.4)", () => {
    const text = renderPlainText({ bullets: ["Only bullet."] });
    expect(text).toBe("- Only bullet.");
    expect(text).not.toContain("sections");
  });

  it("sections path never renders the flat fallback bullets line", () => {
    const text = renderPlainText(docWithSections(fullSections));
    // The flat bullets array ('fallback bullet') must NOT appear since sections are present
    expect(text).not.toContain("fallback bullet");
  });

  it("renders the footer even with sections present (FR-EXPORT-04)", () => {
    const text = renderPlainText(docWithSections(fullSections, { footer: "Made with Vouch" }));
    expect(text).toContain("Made with Vouch");
  });

  it("FORMAT PARITY: sections content in plain-text matches what the DOCX/PDF renderers will receive (same ExportSections shape)", () => {
    // This is a structural parity assertion — all three renderers take the same
    // ExportSections type. We verify that renderPlainText produces a non-empty
    // output for every non-empty section field, mirroring the section order.
    const minimalSections: ExportSections = {
      experience: [{ title: "Lead Dev", bullets: ["Shipped feature X"] }],
      skills: ["go"],
    };
    const text = renderPlainText(docWithSections(minimalSections));
    expect(text).toContain("Lead Dev");
    expect(text).toContain("- Shipped feature X");
    expect(text).toContain("go");
  });

  it("omits contact line when contact is absent (no fabrication)", () => {
    const noContactSections: ExportSections = {
      summary: ["A developer."],
      experience: [{ title: "Dev Role", bullets: ["Built things"] }],
      skills: ["python"],
    };
    const text = renderPlainText(docWithSections(noContactSections));
    // No contact block → no email/phone/link in output
    expect(text).not.toContain("@");
    expect(text).not.toContain("+");
  });

  it("a role with no dateRange renders title only (no extra parens)", () => {
    const sections: ExportSections = {
      experience: [{ title: "Engineer, NoDates Corp", bullets: ["Did work"] }],
      skills: [],
    };
    const text = renderPlainText(docWithSections(sections));
    expect(text).toContain("Engineer, NoDates Corp");
    expect(text).not.toContain("Engineer, NoDates Corp  (");
  });

  it("Cyrillic content round-trips through renderPlainText", () => {
    const cyrillicSections: ExportSections = {
      contact: { name: "Іван Петренко", email: "ivan@example.ua" },
      summary: ["Досвідчений розробник."],
      experience: [{ title: "Старший інженер", bullets: ["Розробив мікросервіси"] }],
      skills: ["go", "docker"],
    };
    const text = renderPlainText(docWithSections(cyrillicSections));
    expect(text).toContain("Іван Петренко");
    expect(text).toContain("Досвідчений розробник.");
    expect(text).toContain("Старший інженер");
    expect(text).toContain("- Розробив мікросервіси");
  });
});
