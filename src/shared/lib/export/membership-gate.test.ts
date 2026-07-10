// Unit tests for the pure server-side export honesty gate
// (server-side-export-gate, T5 #8, BC-HONESTY-02, NFR-SEC-04).
//
// Spec under test: `isExportGrounded(doc, allowedTexts)` must be true iff every
// bullet text reachable in `doc` — both the flat `bullets` list AND every
// `sections.experience[].bullets` entry — is a member of `allowedTexts`
// (the texts the tailoring pipeline actually persisted). It is a MEMBERSHIP
// check, not an `included`-flag filter: a persisted overclaim-risk bullet the
// user re-includes must still pass, because membership only cares whether the
// pipeline produced the text, not whether it is currently toggled in.
import { describe, expect, it } from "vitest";

import { collectExportBulletTexts, isExportGrounded, type ExportGateDocument } from "./membership-gate";

const GROUNDED_TEXT = "Led migration of the billing service to Postgres.";
const OVERCLAIM_TEXT = "Scaled the platform to ten million daily users.";
const FABRICATED_TEXT = "Personally briefed the board of directors weekly.";

describe("collectExportBulletTexts", () => {
  it("returns an empty array for a document with no bullets anywhere", () => {
    const doc: ExportGateDocument = { bullets: [] };
    expect(collectExportBulletTexts(doc)).toEqual([]);
  });

  it("collects flat `bullets` only when `sections` is absent", () => {
    const doc: ExportGateDocument = { bullets: [GROUNDED_TEXT, OVERCLAIM_TEXT] };
    expect(collectExportBulletTexts(doc)).toEqual([GROUNDED_TEXT, OVERCLAIM_TEXT]);
  });

  it("collects flat bullets AND every experience role's bullets, in document order", () => {
    const doc: ExportGateDocument = {
      bullets: [GROUNDED_TEXT],
      sections: {
        experience: [
          { bullets: [OVERCLAIM_TEXT] },
          { bullets: [] },
          { bullets: ["Owned the on-call rotation."] },
        ],
      },
    };
    expect(collectExportBulletTexts(doc)).toEqual([
      GROUNDED_TEXT,
      OVERCLAIM_TEXT,
      "Owned the on-call rotation.",
    ]);
  });

  it("treats an empty `sections.experience` array as contributing no extra texts", () => {
    const doc: ExportGateDocument = { bullets: [GROUNDED_TEXT], sections: { experience: [] } };
    expect(collectExportBulletTexts(doc)).toEqual([GROUNDED_TEXT]);
  });

  it("treats an absent `sections.experience` (sections present, no experience key) the same as no sections", () => {
    const doc: ExportGateDocument = { bullets: [GROUNDED_TEXT], sections: {} };
    expect(collectExportBulletTexts(doc)).toEqual([GROUNDED_TEXT]);
  });
});

describe("isExportGrounded — membership, not an `included` filter", () => {
  it("is vacuously true for a document with no bullets anywhere (empty doc)", () => {
    const doc: ExportGateDocument = { bullets: [] };
    expect(isExportGrounded(doc, new Set())).toBe(true);
    expect(isExportGrounded(doc, new Set([GROUNDED_TEXT]))).toBe(true);
  });

  it("is true when every flat bullet text is a persisted member", () => {
    const doc: ExportGateDocument = { bullets: [GROUNDED_TEXT] };
    expect(isExportGrounded(doc, new Set([GROUNDED_TEXT, OVERCLAIM_TEXT]))).toBe(true);
  });

  it("allows a persisted OVERCLAIM-RISK bullet the user re-included (FR-BULLETS-02) — membership, not an `included` filter", () => {
    // The gate only checks "was this text ever persisted by the pipeline",
    // never the bullet's `included`/grounding label — that toggle is client-only
    // state and re-including a flagged bullet is a legitimate user choice.
    const doc: ExportGateDocument = { bullets: [OVERCLAIM_TEXT] };
    expect(isExportGrounded(doc, new Set([GROUNDED_TEXT, OVERCLAIM_TEXT]))).toBe(true);
  });

  it("is false when a flat bullet text was never persisted (fabrication)", () => {
    const doc: ExportGateDocument = { bullets: [GROUNDED_TEXT, FABRICATED_TEXT] };
    expect(isExportGrounded(doc, new Set([GROUNDED_TEXT, OVERCLAIM_TEXT]))).toBe(false);
  });

  it("is false when a fabricated bullet text hides inside sections.experience[].bullets", () => {
    const doc: ExportGateDocument = {
      bullets: [GROUNDED_TEXT],
      sections: { experience: [{ bullets: [FABRICATED_TEXT] }] },
    };
    expect(isExportGrounded(doc, new Set([GROUNDED_TEXT, OVERCLAIM_TEXT]))).toBe(false);
  });

  it("is true when every experience-role bullet text is persisted, across multiple roles", () => {
    const doc: ExportGateDocument = {
      bullets: [],
      sections: {
        experience: [{ bullets: [GROUNDED_TEXT] }, { bullets: [OVERCLAIM_TEXT] }],
      },
    };
    expect(isExportGrounded(doc, new Set([GROUNDED_TEXT, OVERCLAIM_TEXT]))).toBe(true);
  });

  it("is a case-sensitive, exact-string check — a near-identical rewrite is rejected (NFR-SEC-04, not fuzzy)", () => {
    const doc: ExportGateDocument = { bullets: [GROUNDED_TEXT.toUpperCase()] };
    expect(isExportGrounded(doc, new Set([GROUNDED_TEXT]))).toBe(false);
  });

  it("is false against an empty allowed set when the document has any bullet text", () => {
    const doc: ExportGateDocument = { bullets: [GROUNDED_TEXT] };
    expect(isExportGrounded(doc, new Set())).toBe(false);
  });
});
