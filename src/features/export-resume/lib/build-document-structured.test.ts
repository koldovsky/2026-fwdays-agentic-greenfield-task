// Group 4 tests for buildExportDocument with cvDocument (§4.3 merge honesty).
// Written by the TEST-AUTHOR subagent (maker≠test-author, separation of duties).
// Key invariants:
//   - Kept bullets (includedInExport=true) merge into the first (most-recent) role.
//   - Excluded overclaim-risk bullets (includedInExport=false) appear in NO section.
//   - Original role bullets are NOT re-inserted (they were never grounding-checked).
//   - Later roles carry title+dates only — no fabricated bullets.
//   - Flat fallback when cvDocument absent (backward compat §4.4).
//   - Sections omitted when no cvDocument supplied.
import { describe, expect, it } from "vitest";

import type { Bullet } from "@/entities/bullet";
import type { CvDocument } from "@/entities/cv-profile";

import { buildExportDocument } from "./build-document";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const keptBullet: Bullet = {
  id: "b1",
  text: "Led migration of payment service to Postgres.",
  grounding: "grounded",
  source: { kind: "cv", sentence: "Migrated the payment service to Postgres over Q3." },
  includedInExport: true,
};

const anotherKeptBullet: Bullet = {
  id: "b2",
  text: "Reduced API latency by 40% through query optimisation.",
  grounding: "grounded",
  source: { kind: "cv", sentence: "Optimised database queries and cut latency 40%." },
  includedInExport: true,
};

const overclaim: Bullet = {
  id: "b3",
  text: "Scaled the platform to 100 million users.",
  grounding: "overclaim-risk",
  includedInExport: false,
};

const anotherExcluded: Bullet = {
  id: "b4",
  text: "Raised $10M in Series B funding.",
  grounding: "overclaim-risk",
  includedInExport: false,
};

/** A minimal CvDocument with two roles and CV-level original bullets. */
const twoRoleCvDocument: CvDocument = {
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
      dateRange: {
        startMonth: 2020 * 12 + 0,
        ongoing: true,
        raw: "Jan 2020 – present",
      },
      // Original CV bullets — must NOT re-appear in the export.
      bullets: ["Original CV bullet that was never tailored"],
    },
    {
      title: "Junior Developer, StartupXYZ",
      dateRange: {
        startMonth: 2018 * 12 + 0,
        endMonth: 2019 * 12 + 11,
        ongoing: false,
        raw: "2018-2019",
      },
      bullets: ["Another original CV bullet for the old role"],
    },
  ],
  skills: ["typescript", "react", "postgresql"],
  education: ["National Technical University of Ukraine, B.Sc. Computer Science, 2018"],
};

/** A CvDocument with a single role. */
const singleRoleCvDocument: CvDocument = {
  experience: [
    {
      title: "Lead Engineer, Acme",
      dateRange: {
        startMonth: 2019 * 12 + 0,
        endMonth: 2023 * 12 + 11,
        ongoing: false,
        raw: "2019-2023",
      },
      bullets: ["Original bullet"],
    },
  ],
  skills: ["python", "aws"],
};

// ---------------------------------------------------------------------------
// Merge honesty (§4.3, BC-HONESTY-02)
// ---------------------------------------------------------------------------

describe("buildExportDocument: merge honesty (§4.3, BC-HONESTY-02)", () => {
  it("kept bullets appear in the first role's bullets array", () => {
    const doc = buildExportDocument([keptBullet, overclaim, anotherKeptBullet], {
      cvDocument: twoRoleCvDocument,
    });
    expect(doc.sections?.experience).toBeDefined();
    const firstRole = doc.sections!.experience![0];
    expect(firstRole.bullets).toContain(keptBullet.text);
    expect(firstRole.bullets).toContain(anotherKeptBullet.text);
  });

  it("EXCLUDED overclaim bullet is absent from ALL sections (BC-HONESTY-02)", () => {
    const doc = buildExportDocument([keptBullet, overclaim, anotherExcluded], {
      cvDocument: twoRoleCvDocument,
    });
    // Check the flat bullets array.
    expect(doc.bullets).not.toContain(overclaim.text);
    expect(doc.bullets).not.toContain(anotherExcluded.text);

    // Check every experience role.
    const allRoleBullets = (doc.sections?.experience ?? []).flatMap((r) => r.bullets);
    expect(allRoleBullets).not.toContain(overclaim.text);
    expect(allRoleBullets).not.toContain(anotherExcluded.text);

    // Check summary and skills (should not contain overclaim text either).
    const summaryText = (doc.sections?.summary ?? []).join(" ");
    expect(summaryText).not.toContain(overclaim.text);
    const skillsText = (doc.sections?.skills ?? []).join(" ");
    expect(skillsText).not.toContain(overclaim.text);
  });

  it("original un-tailored CV role bullets are NOT re-inserted (§4.3 honesty)", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: twoRoleCvDocument });
    const allRoleBullets = (doc.sections?.experience ?? []).flatMap((r) => r.bullets);
    // The original CV bullets should NOT appear — they were never grounding-checked.
    expect(allRoleBullets).not.toContain("Original CV bullet that was never tailored");
    expect(allRoleBullets).not.toContain("Another original CV bullet for the old role");
  });

  it("later roles carry title + dateRange but have EMPTY bullets (maker's documented deviation)", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: twoRoleCvDocument });
    expect(doc.sections?.experience).toBeDefined();
    expect(doc.sections!.experience!.length).toBe(2);
    const laterRole = doc.sections!.experience![1];
    expect(laterRole.title).toContain("Junior Developer");
    expect(laterRole.bullets).toHaveLength(0);
  });

  it("role title + dateRange pass through in the CV's original language (factual)", () => {
    const uaDoc: CvDocument = {
      experience: [
        {
          title: "Старший інженер, ТОВ «Прогрес»",
          dateRange: { startMonth: 2020 * 12, ongoing: false, endMonth: 2023 * 12, raw: "2020-2023" },
          bullets: [],
        },
      ],
      skills: [],
    };
    const doc = buildExportDocument([keptBullet], { cvDocument: uaDoc });
    expect(doc.sections!.experience![0].title).toBe("Старший інженер, ТОВ «Прогрес»");
    expect(doc.sections!.experience![0].dateRange).toBe("2020-2023");
  });

  it("all-excluded bullets → first role has empty bullets, no overclaim content anywhere", () => {
    const doc = buildExportDocument([overclaim, anotherExcluded], {
      cvDocument: twoRoleCvDocument,
    });
    expect(doc.bullets).toHaveLength(0);
    const allRoleBullets = (doc.sections?.experience ?? []).flatMap((r) => r.bullets);
    expect(allRoleBullets).toHaveLength(0);
    expect(allRoleBullets).not.toContain(overclaim.text);
  });

  it("no sections when no cvDocument supplied (flat fallback §4.4)", () => {
    const doc = buildExportDocument([keptBullet]);
    expect(doc.sections).toBeUndefined();
    expect(doc.bullets).toContain(keptBullet.text);
  });
});

// ---------------------------------------------------------------------------
// Contact, summary, skills, education (§4.2 structure)
// ---------------------------------------------------------------------------

describe("buildExportDocument: structured sections (§4.2)", () => {
  it("includes contact when cvDocument has contact (PII — render-only)", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: twoRoleCvDocument });
    expect(doc.sections?.contact).toBeDefined();
    expect(doc.sections!.contact!.name).toBe("Ivan Shevchenko");
    expect(doc.sections!.contact!.email).toBe("ivan@example.com");
    expect(doc.sections!.contact!.phone).toBeDefined();
    expect(doc.sections!.contact!.links).toContain("https://github.com/ivanshevchenko");
  });

  it("includes summary lines from the cvDocument", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: twoRoleCvDocument });
    expect(doc.sections?.summary).toBeDefined();
    expect(doc.sections!.summary).toContain("Experienced backend engineer with 5 years in FinTech.");
  });

  it("includes skills from the cvDocument", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: twoRoleCvDocument });
    expect(doc.sections?.skills).toBeDefined();
    expect(doc.sections!.skills).toContain("typescript");
    expect(doc.sections!.skills).toContain("react");
  });

  it("includes education from the cvDocument", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: twoRoleCvDocument });
    expect(doc.sections?.education).toBeDefined();
    expect(doc.sections!.education!.some((l) => l.includes("National Technical University"))).toBe(true);
  });

  it("omits contact in sections when cvDocument has no contact", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: singleRoleCvDocument });
    expect(doc.sections?.contact).toBeUndefined();
  });

  it("omits summary in sections when cvDocument has no summary", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: singleRoleCvDocument });
    expect(doc.sections?.summary).toBeUndefined();
  });

  it("flat bullets array is always populated alongside sections (renderer fallback)", () => {
    const doc = buildExportDocument([keptBullet, anotherKeptBullet, overclaim], {
      cvDocument: twoRoleCvDocument,
    });
    // Only kept bullets in the flat array.
    expect(doc.bullets).toEqual([keptBullet.text, anotherKeptBullet.text]);
  });

  it("headline and footer options pass through alongside sections", () => {
    const doc = buildExportDocument([keptBullet], {
      headline: "Tailored Résumé",
      footer: "Made with Vouch",
      cvDocument: twoRoleCvDocument,
    });
    expect(doc.headline).toBe("Tailored Résumé");
    expect(doc.footer).toBe("Made with Vouch");
    expect(doc.sections).toBeDefined();
  });
});
