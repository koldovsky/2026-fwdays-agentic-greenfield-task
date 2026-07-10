// Tenure-aware checklistItem tests (improve-tailoring-quality §1.3).
// Written by the TEST-AUTHOR subagent (maker≠test-author, separation of duties).
// Covers: requiredYears(), tenure-lifts-partial-to-met, no-false-credit for
// ungrounded skills, zero/unknown tenure never creates false credit (BC-HONESTY-01).
import { describe, expect, it } from "vitest";

import { checklistItem, requiredYears } from "./checklist";
import type { CvProfile, Requirement } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function req(partial: Partial<Requirement> = {}): Requirement {
  return {
    id: "r-tenure",
    text: "3+ years of backend experience",
    importance: "must-have",
    keywords: ["backend"],
    ...partial,
  };
}

// A CV that has prose evidence for "backend" but NOT for "aws" — partially grounded.
// Used to test tenure lifting partial → met.
const partialBackendCv: CvProfile = {
  skills: ["node.js", "postgresql"],
  sentences: ["Built and maintained backend services for a FinTech platform for 5 years"],
  // Note: "backend" is grounded (in sentences), but "aws" is NOT.
};

// A requirement with TWO keywords: "backend" (grounded) and "aws" (not grounded).
// This will be "partial" when only one keyword is grounded.
// Tenure check applies: satisfying tenure lifts this to "met".
const partialBackendReq: Requirement = {
  id: "r-partial",
  text: "3+ years of backend experience with aws",
  importance: "must-have",
  keywords: ["backend", "aws"],
};

// A CV that has prose evidence for "backend" — fully grounded (single keyword).
const backendCv: CvProfile = {
  skills: ["node.js", "postgresql"],
  sentences: ["Built and maintained backend services for a FinTech platform for 5 years"],
};

// A CV that only CLAIMS "backend" in skills, no prose evidence.
const claimedOnlyBackendCv: CvProfile = {
  skills: ["backend", "node.js"],
  sentences: ["I enjoy problem-solving and teamwork"],
};

// A CV with no backend evidence at all.
const noBackendCv: CvProfile = {
  skills: ["frontend", "react"],
  sentences: ["Built responsive UIs with React"],
};

// ---------------------------------------------------------------------------
// requiredYears (§1.3) — pure extraction
// ---------------------------------------------------------------------------

describe("requiredYears (§1.3)", () => {
  it("detects 'N+ years' in EN", () => {
    expect(requiredYears(req({ text: "3+ years of backend experience" }))).toBe(3);
    expect(requiredYears(req({ text: "5+ years experience" }))).toBe(5);
    expect(requiredYears(req({ text: "10+ years managing teams" }))).toBe(10);
  });

  it("detects 'N years' without plus sign", () => {
    expect(requiredYears(req({ text: "2 years of Python experience" }))).toBe(2);
    expect(requiredYears(req({ text: "7 yrs of cloud infra" }))).toBe(7);
  });

  it("detects UA '(N) рокі(в/в/у)' forms", () => {
    expect(requiredYears(req({ text: "5 років досвіду" }))).toBe(5);
    expect(requiredYears(req({ text: "3 роки роботи" }))).toBe(3);
    expect(requiredYears(req({ text: "2 року стажу" }))).toBe(2);
  });

  it("returns undefined for requirements with no year count", () => {
    expect(requiredYears(req({ text: "React experience required" }))).toBeUndefined();
    expect(requiredYears(req({ text: "Leadership skills" }))).toBeUndefined();
    expect(requiredYears(req({ text: "" }))).toBeUndefined();
  });

  it("returns undefined for zero-year text (no false credit)", () => {
    expect(requiredYears(req({ text: "0 years experience" }))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tenure lifts grounded partial → met (§1.3)
// ---------------------------------------------------------------------------

describe("checklistItem: tenure-aware scoring (§1.3, BC-HONESTY-01)", () => {
  // Tenure lifting works on a PARTIAL result (some keywords grounded, not all).
  // partialBackendReq has keywords ["backend", "aws"]; partialBackendCv grounds
  // "backend" (prose) but not "aws" → partial. Tenure can lift this to met.

  it("grounded partial + sufficient tenure → 'met' (tenure lifts partial to met)", () => {
    // "backend" is grounded; "aws" is not → partial without tenure.
    // With tenure >= 3 years, lifts to met.
    const item = checklistItem(partialBackendReq, partialBackendCv, undefined, 5);
    expect(item.status).toBe("met");
  });

  it("grounded partial + INSUFFICIENT tenure → 'partial' (not met without enough years)", () => {
    // "backend" grounded; "aws" not; tenure = only 1 year (< 3 required) → partial.
    const item = checklistItem(partialBackendReq, partialBackendCv, undefined, 1);
    expect(item.status).toBe("partial");
  });

  it("grounded partial + no tenure supplied → 'partial' (absence ≠ zero credit gift)", () => {
    // No candidateTenureYears passed → tenure check skipped → stays partial.
    const item = checklistItem(partialBackendReq, partialBackendCv, undefined, undefined);
    expect(item.status).toBe("partial");
  });

  it("single-keyword fully grounded → 'met' regardless of tenure (tenure only helps partial)", () => {
    // "backend" is the only keyword; fully grounded → met immediately.
    // This confirms the baseline: tenure is not needed when all keywords are met.
    const item = checklistItem(req(), backendCv, undefined, undefined);
    expect(item.status).toBe("met");
  });

  it("tenure never credits an UNGROUNDED skill (BC-HONESTY-01)", () => {
    // CV has NO grounded backend prose; claimed-only in skills.
    // Even with sufficient tenure, status should NOT be 'met'.
    const item = checklistItem(req(), claimedOnlyBackendCv, undefined, 10);
    expect(item.status).not.toBe("met");
    // Should be overclaim-risk (for junior/unknown) — tenure does not invent grounding.
    expect(item.status).toBe("overclaim-risk");
  });

  it("tenure never credits a completely absent skill (gap)", () => {
    // CV has no backend mention at all; tenure = 20 years.
    const item = checklistItem(req(), noBackendCv, undefined, 20);
    // Tenure cannot manufacture grounding from nothing.
    expect(["gap", "info", "overclaim-risk"]).toContain(item.status);
    expect(item.status).not.toBe("met");
    expect(item.status).not.toBe("partial");
  });

  it("a non-duration requirement is unaffected by candidateTenureYears", () => {
    // No year pattern in the requirement text.
    const plainReq = req({ text: "React experience", keywords: ["react"] });
    const cvWithReact: CvProfile = {
      skills: [],
      sentences: ["Built components with React for two years"],
    };
    // With or without tenure, grounded → met.
    expect(checklistItem(plainReq, cvWithReact, undefined, 99).status).toBe("met");
    expect(checklistItem(plainReq, cvWithReact, undefined, undefined).status).toBe("met");
  });

  it("tenure-met rationale is Ukrainian, <=100 chars, no emoji, mentions tenure (§1.3)", () => {
    // partialBackendReq: partial grounded + sufficient tenure → met with tenure rationale.
    const item = checklistItem(partialBackendReq, partialBackendCv, undefined, 5);
    expect(item.status).toBe("met");
    expect(item.rationale.length).toBeLessThanOrEqual(100);
    expect(item.rationale.length).toBeGreaterThan(0);
    expect(item.rationale).not.toMatch(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u,
    );
    // Rationale should reference that tenure was used (стаж/стажем).
    expect(item.rationale).toMatch(/стаж|стажем/i);
  });

  it("seniority + tenure: senior + grounded partial + sufficient tenure → 'met'", () => {
    const item = checklistItem(partialBackendReq, partialBackendCv, "senior", 5);
    expect(item.status).toBe("met");
  });

  it("seniority + tenure: mid+claimed-only + sufficient tenure still NOT 'met' (no grounding, BC-HONESTY-01)", () => {
    // Claimed-only for mid → partial (claimed-covered), NOT met even with tenure,
    // because tenure only upgrades an ALREADY-grounded partial.
    const item = checklistItem(req(), claimedOnlyBackendCv, "mid", 10);
    // claimed-only+mid = "partial" (claimed-covered), tenure cannot promote to met.
    expect(item.status).toBe("partial");
    expect(item.status).not.toBe("met");
  });

  it("tenure = 0 gives no duration credit: partial stays partial (BC-HONESTY-01)", () => {
    // Zero tenure → does not satisfy "3+ years" → partial stays partial.
    const item = checklistItem(partialBackendReq, partialBackendCv, undefined, 0);
    expect(item.status).toBe("partial");
  });
});
