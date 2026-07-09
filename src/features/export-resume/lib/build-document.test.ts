import { describe, expect, it } from "vitest";

import type { Bullet } from "@/entities/bullet";
import type { CvDocument } from "@/entities/cv-profile";

import { buildExportDocument } from "./build-document";

const included1: Bullet = {
  id: "1",
  text: "Led migration to TypeScript.",
  grounding: "grounded",
  source: { kind: "cv", sentence: "Migrated the codebase to TypeScript." },
  includedInExport: true,
};

const excluded: Bullet = {
  id: "2",
  text: "Scaled the platform to 10M users.",
  grounding: "overclaim-risk",
  includedInExport: false,
};

const included2: Bullet = {
  id: "3",
  text: "Mentored two junior engineers.",
  grounding: "grounded",
  source: { kind: "user-confirmed", question: "Did you mentor anyone?", answer: "Yes, two juniors." },
  includedInExport: true,
};

describe("buildExportDocument", () => {
  it("filters to only bullets flagged includedInExport (BC-HONESTY-02)", () => {
    const doc = buildExportDocument([included1, excluded, included2]);
    expect(doc.bullets).toEqual([included1.text, included2.text]);
  });

  it("preserves the input order of the included bullets", () => {
    const doc = buildExportDocument([included2, excluded, included1]);
    expect(doc.bullets).toEqual([included2.text, included1.text]);
  });

  it("applies the headline option when provided", () => {
    const doc = buildExportDocument([included1], { headline: "Tailored résumé" });
    expect(doc.headline).toBe("Tailored résumé");
  });

  it("omits headline when not provided or empty", () => {
    expect(buildExportDocument([included1]).headline).toBeUndefined();
    expect(buildExportDocument([included1], { headline: "" }).headline).toBeUndefined();
  });

  it("applies the footer option when provided (FR-EXPORT-04)", () => {
    const doc = buildExportDocument([included1], { footer: "Made with Vouch — free tier" });
    expect(doc.footer).toBe("Made with Vouch — free tier");
  });

  it("omits footer when not provided or empty", () => {
    expect(buildExportDocument([included1]).footer).toBeUndefined();
    expect(buildExportDocument([included1], { footer: "" }).footer).toBeUndefined();
  });

  it("applies both headline and footer together", () => {
    const doc = buildExportDocument([included1, included2], {
      headline: "Tailored résumé",
      footer: "Made with Vouch",
    });
    expect(doc).toEqual({
      headline: "Tailored résumé",
      bullets: [included1.text, included2.text],
      footer: "Made with Vouch",
    });
  });

  it("empty bullets → empty bullets array, no headline/footer leakage", () => {
    expect(buildExportDocument([])).toEqual({ bullets: [] });
  });

  it("all-excluded bullets → empty bullets array", () => {
    const doc = buildExportDocument([excluded]);
    expect(doc.bullets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Structured sections with cvDocument (improve-tailoring-quality §4.3)
// ---------------------------------------------------------------------------

const cvDocWithExperience: CvDocument = {
  contact: {
    name: "Jane Dev",
    email: "jane@example.com",
    phone: "+44 7700 900001",
    links: ["https://github.com/janedev"],
  },
  summary: ["Experienced engineer with 7 years in fintech."],
  experience: [
    {
      title: "Senior Engineer, Acme Corp",
      dateRange: { startMonth: 2018 * 12, endMonth: 2022 * 12, ongoing: false, raw: "2018-2022" },
      bullets: ["Led microservice migration", "Owned payment pipeline"],
    },
    {
      title: "Junior Developer, Startup Ltd",
      dateRange: { startMonth: 2015 * 12, endMonth: 2018 * 12, ongoing: false, raw: "2015-2018" },
      bullets: ["Delivered three releases"],
    },
  ],
  skills: ["typescript", "react", "postgresql"],
  education: ["BSc Computer Science, 2014"],
};

describe("buildExportDocument: structured sections (§4.2/§4.3)", () => {
  it("emits sections when cvDocument is provided", () => {
    const doc = buildExportDocument([included1, included2], { cvDocument: cvDocWithExperience });
    expect(doc.sections).toBeDefined();
  });

  it("does NOT emit sections when cvDocument is absent (flat fallback, §4.4)", () => {
    const doc = buildExportDocument([included1]);
    expect(doc.sections).toBeUndefined();
  });

  it("contact block is passed through to sections.contact (PII render-only)", () => {
    const doc = buildExportDocument([included1], { cvDocument: cvDocWithExperience });
    expect(doc.sections!.contact).toBeDefined();
    expect(doc.sections!.contact!.name).toBe("Jane Dev");
    expect(doc.sections!.contact!.email).toBe("jane@example.com");
    expect(doc.sections!.contact!.phone).toBe("+44 7700 900001");
    expect(doc.sections!.contact!.links).toContain("https://github.com/janedev");
  });

  it("summary is passed through to sections.summary", () => {
    const doc = buildExportDocument([included1], { cvDocument: cvDocWithExperience });
    expect(doc.sections!.summary).toEqual(cvDocWithExperience.summary);
  });

  it("skills are passed through to sections.skills", () => {
    const doc = buildExportDocument([included1], { cvDocument: cvDocWithExperience });
    expect(doc.sections!.skills).toEqual(cvDocWithExperience.skills);
  });

  it("education is passed through to sections.education", () => {
    const doc = buildExportDocument([included1], { cvDocument: cvDocWithExperience });
    expect(doc.sections!.education).toEqual(cvDocWithExperience.education);
  });

  it("experience roles preserve original titles and date ranges (original language)", () => {
    const doc = buildExportDocument([included1], { cvDocument: cvDocWithExperience });
    const roles = doc.sections!.experience!;
    expect(roles[0].title).toBe("Senior Engineer, Acme Corp");
    expect(roles[0].dateRange).toBe("2018-2022");
    expect(roles[1].title).toBe("Junior Developer, Startup Ltd");
  });

  it("kept bullets attach to the first (most recent) role only (§4.3 maker deviation)", () => {
    const doc = buildExportDocument([included1, included2], { cvDocument: cvDocWithExperience });
    const roles = doc.sections!.experience!;
    // First role receives the kept bullets
    expect(roles[0].bullets).toContain(included1.text);
    expect(roles[0].bullets).toContain(included2.text);
    // Later roles have no bullets (factual title/dates only)
    expect(roles[1].bullets).toHaveLength(0);
  });

  it("MERGE HONESTY: an excluded (overclaim-risk) bullet appears in NO experience role (BC-HONESTY-02)", () => {
    const doc = buildExportDocument([included1, excluded, included2], {
      cvDocument: cvDocWithExperience,
    });
    const allBulletsInRoles = (doc.sections!.experience ?? []).flatMap((r) => r.bullets);
    expect(allBulletsInRoles).not.toContain(excluded.text);
    // Also not in flat bullets array
    expect(doc.bullets).not.toContain(excluded.text);
  });

  it("MERGE HONESTY: original unparsed role bullets are NOT re-inserted (grounded-only content)", () => {
    const doc = buildExportDocument([included1], { cvDocument: cvDocWithExperience });
    const allBulletsInRoles = (doc.sections!.experience ?? []).flatMap((r) => r.bullets);
    // The CV's own "Led microservice migration" raw bullet must NOT appear — only tailored kept bullets
    expect(allBulletsInRoles).not.toContain("Led microservice migration");
    expect(allBulletsInRoles).not.toContain("Owned payment pipeline");
    expect(allBulletsInRoles).not.toContain("Delivered three releases");
  });

  it("MERGE HONESTY: when no bullets are kept, all experience roles have empty bullet arrays", () => {
    const allExcluded = [excluded];
    const doc = buildExportDocument(allExcluded, { cvDocument: cvDocWithExperience });
    const allBulletsInRoles = (doc.sections!.experience ?? []).flatMap((r) => r.bullets);
    expect(allBulletsInRoles).toHaveLength(0);
  });

  it("flat bullets are always populated even when sections are present (§4.4 fallback parity)", () => {
    const doc = buildExportDocument([included1, included2], { cvDocument: cvDocWithExperience });
    // flat bullets = the kept texts
    expect(doc.bullets).toContain(included1.text);
    expect(doc.bullets).toContain(included2.text);
    // and sections are also present
    expect(doc.sections).toBeDefined();
  });

  it("no sections emitted when cvDocument has empty experience and no other content", () => {
    const emptyDoc: CvDocument = { experience: [], skills: [] };
    const doc = buildExportDocument([included1], { cvDocument: emptyDoc });
    // An empty document yields no renderable sections → no sections key.
    expect(doc.sections).toBeUndefined();
  });

  it("absent contact in CvDocument → sections.contact is undefined (never fabricated)", () => {
    const noContactDoc: CvDocument = {
      experience: [{ title: "Engineer", bullets: ["Built an API"] }],
      skills: ["go"],
    };
    const doc = buildExportDocument([included1], { cvDocument: noContactDoc });
    expect(doc.sections?.contact).toBeUndefined();
  });
});
