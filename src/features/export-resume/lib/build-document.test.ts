import { describe, expect, it } from "vitest";

import type { Bullet } from "@/entities/bullet";

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
