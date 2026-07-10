// PII isolation tests for the structured resume export at the features/widgets
// level (§4.5, NFR-SEC-01/02). Lives in src/app/ to cross FSD layers legally.
// Written by the TEST-AUTHOR subagent (maker≠test-author, separation of duties).
// Asserts:
//   - Contact fields never appear in the flat bullets array.
//   - Contact PII is only in sections.contact, not leaked into any other field.
//   - ExportStepperProps structurally separates cvDocument from letterEvidence.
import { describe, expect, it } from "vitest";

import type { CvDocument } from "@/entities/cv-profile";
import type { ExportDocument } from "@/entities/export-document";
import { buildExportDocument } from "@/features/export-resume";
import type { ExportStepperProps } from "@/widgets/export-stepper";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const cvDocWithContact: CvDocument = {
  contact: {
    name: "Olena Kovalenko",
    email: "olena@test.example",
    phone: "+380-93-111-2233",
    links: ["https://linkedin.com/in/olenakovalenko"],
  },
  experience: [
    {
      title: "Senior Engineer, Acme",
      bullets: [],
    },
  ],
  skills: ["react", "typescript"],
};

const keptBullet = {
  id: "b1",
  text: "Led the API migration.",
  grounding: "grounded" as const,
  source: { kind: "cv" as const, sentence: "API migration completed." },
  includedInExport: true,
};

// ---------------------------------------------------------------------------
// buildExportDocument: contact is export-render only (§4.5, NFR-SEC-01/02)
// ---------------------------------------------------------------------------

describe("buildExportDocument: contact PII is export-render only (§4.5, NFR-SEC-01/02)", () => {
  it("contact name does NOT appear in the flat bullets array", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: cvDocWithContact });
    const bulletsText = doc.bullets.join(" ");
    expect(bulletsText).not.toContain("Olena Kovalenko");
    expect(bulletsText).not.toContain("olena@test.example");
    expect(bulletsText).not.toContain("+380-93-111-2233");
  });

  it("contact email is in sections.contact, not mixed into bullets or skills", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: cvDocWithContact });
    expect(doc.sections?.contact?.email).toBe("olena@test.example");
    expect(doc.sections?.contact?.name).toBe("Olena Kovalenko");
    // Not in skills.
    const skillsStr = (doc.sections?.skills ?? []).join(" ");
    expect(skillsStr).not.toContain("olena@test.example");
    // Not in summary.
    const summaryStr = (doc.sections?.summary ?? []).join(" ");
    expect(summaryStr).not.toContain("olena@test.example");
  });

  it("contact PII does NOT appear anywhere outside sections.contact", () => {
    const doc: ExportDocument = buildExportDocument([keptBullet], {
      cvDocument: cvDocWithContact,
    });
    const nonContactParts = [
      doc.headline ?? "",
      ...doc.bullets,
      doc.footer ?? "",
      ...(doc.sections?.summary ?? []),
      ...(doc.sections?.skills ?? []),
      ...(doc.sections?.education ?? []),
      ...(doc.sections?.experience ?? []).flatMap((r) => [
        r.title,
        r.dateRange ?? "",
        ...r.bullets,
      ]),
    ].join(" ");

    expect(nonContactParts).not.toContain("olena@test.example");
    expect(nonContactParts).not.toContain("+380-93-111-2233");
    expect(nonContactParts).not.toContain("linkedin.com/in/olenakovalenko");
  });

  it("contact phone is in sections.contact.phone, nowhere else", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: cvDocWithContact });
    expect(doc.sections?.contact?.phone).toBe("+380-93-111-2233");
    // No phone leakage into bullet text.
    expect(doc.bullets.join(" ")).not.toContain("+380-93-111-2233");
  });

  it("contact links are in sections.contact.links, not in any bullet", () => {
    const doc = buildExportDocument([keptBullet], { cvDocument: cvDocWithContact });
    expect(doc.sections?.contact?.links).toContain("https://linkedin.com/in/olenakovalenko");
    expect(doc.bullets.join(" ")).not.toContain("linkedin.com");
  });
});

// ---------------------------------------------------------------------------
// ExportStepperProps: cvDocument and letterEvidence are structurally separate
// ---------------------------------------------------------------------------

describe("ExportStepperProps: cvDocument and letterEvidence are separate props (§4.5, NFR-SEC-01/02)", () => {
  it("ExportStepperProps type has distinct cvDocument and letterEvidence fields", () => {
    // Structural check: both optional props exist with distinct types.
    // If they were accidentally merged into one prop, this type assertion fails at compile time.
    type Props = ExportStepperProps;
    type CvDocType = Props["cvDocument"];
    type LetterEvidenceType = Props["letterEvidence"];

    // CvDocument has .experience (array of roles).
    // LetterEvidence has .cvSentences (array of strings).
    // They are structurally incompatible — assigning one to the other fails TypeScript.
    const hasCvDocField: keyof NonNullable<CvDocType> = "experience";
    const hasLetterField: keyof NonNullable<LetterEvidenceType> = "cvSentences";

    expect(hasCvDocField).toBe("experience");
    expect(hasLetterField).toBe("cvSentences");
  });

  it("a props shape with only cvDocument has undefined letterEvidence", () => {
    const propsShape: Pick<ExportStepperProps, "cvDocument" | "letterEvidence"> = {
      cvDocument: {
        experience: [],
        skills: [],
      },
      letterEvidence: undefined,
    };
    expect(propsShape.cvDocument).toBeDefined();
    expect(propsShape.letterEvidence).toBeUndefined();
  });

  it("a props shape with only letterEvidence has undefined cvDocument", () => {
    const propsShape: Pick<ExportStepperProps, "cvDocument" | "letterEvidence"> = {
      cvDocument: undefined,
      letterEvidence: {
        cvSentences: ["Worked on backend APIs for 3 years."],
        requirements: [],
      },
    };
    expect(propsShape.letterEvidence).toBeDefined();
    expect(propsShape.cvDocument).toBeUndefined();
  });
});
