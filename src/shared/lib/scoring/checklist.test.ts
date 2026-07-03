import { describe, expect, it } from "vitest";

import { checklistItem, matchScore } from "./index";
import type { ChecklistStatus, CvProfile, Requirement } from "./types";

// Emoji / pictographic ranges (no emoji allowed — FR-CHECKLIST-03).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u;

const ALL_STATUSES: readonly ChecklistStatus[] = [
  "met",
  "partial",
  "gap",
  "overclaim-risk",
];

function req(partial: Partial<Requirement> = {}): Requirement {
  return {
    id: "r1",
    text: "React experience",
    importance: "must-have",
    keywords: ["react"],
    ...partial,
  };
}

const cvWithReactProse: CvProfile = {
  skills: ["react", "typescript"],
  sentences: ["Побудував інтерфейс на React у попередній компанії"],
};

describe("checklistItem (FR-CHECKLIST-01/02/03, BC-HONESTY-01)", () => {
  it("Same input yields same output (determinism)", () => {
    const a = checklistItem(req(), cvWithReactProse);
    const b = checklistItem(req(), cvWithReactProse);
    expect(a).toEqual(b);
  });

  it("status is always exactly one of the 4 values (FR-CHECKLIST-02)", () => {
    const cases: Array<{ r: Requirement; cv: CvProfile }> = [
      { r: req(), cv: cvWithReactProse },
      { r: req({ keywords: ["react", "kubernetes"] }), cv: cvWithReactProse },
      { r: req({ keywords: ["cobol"] }), cv: cvWithReactProse },
      {
        r: req({ keywords: ["typescript"] }),
        cv: { skills: ["typescript"], sentences: ["Немає згадок про мову"] },
      },
    ];
    for (const { r, cv } of cases) {
      expect(ALL_STATUSES).toContain(checklistItem(r, cv).status);
    }
  });

  it("Rationale is Ukrainian, <=100 chars, no emoji (FR-CHECKLIST-03)", () => {
    const longEvidence = "Дуже довге речення ".repeat(20);
    const cases: CvProfile[] = [
      cvWithReactProse,
      { skills: ["react"], sentences: [longEvidence] },
      { skills: ["react"], sentences: ["Немає"] },
      { skills: [], sentences: [] },
    ];
    for (const cv of cases) {
      const { rationale } = checklistItem(req(), cv);
      expect(rationale.length).toBeLessThanOrEqual(100);
      expect(rationale).not.toMatch(EMOJI);
      expect(rationale.length).toBeGreaterThan(0);
    }
  });

  it("Rationale references CV evidence for met/partial", () => {
    const met = checklistItem(req(), cvWithReactProse);
    expect(met.status).toBe("met");
    // evidence is the CV sentence, not the requirement text
    expect(met.rationale).toContain("React");

    const partial = checklistItem(
      req({ keywords: ["react", "kubernetes"] }),
      cvWithReactProse,
    );
    expect(partial.status).toBe("partial");
    expect(partial.rationale).toContain("React");
  });

  it("overclaim-risk: skill token present but unsupported by any sentence (BC-HONESTY-01)", () => {
    const cv: CvProfile = {
      skills: ["kubernetes"],
      sentences: ["Працював над бекендом на Node"],
    };
    const item = checklistItem(req({ keywords: ["kubernetes"] }), cv);
    expect(item.status).toBe("overclaim-risk");
  });

  it("gap: keyword found nowhere", () => {
    const item = checklistItem(req({ keywords: ["cobol"] }), cvWithReactProse);
    expect(item.status).toBe("gap");
  });
});

describe("matchScore (FR-CHECKLIST-04)", () => {
  const met = { status: "met" as const, rationale: "" };

  it("Must-have weighting: meeting a must-have outscores meeting only a nice-to-have", () => {
    const mustHaveProfile = [
      { requirement: req({ importance: "must-have" }), item: met },
      {
        requirement: req({ importance: "nice-to-have" }),
        item: { status: "gap" as const, rationale: "" },
      },
    ];
    const niceHaveProfile = [
      {
        requirement: req({ importance: "must-have" }),
        item: { status: "gap" as const, rationale: "" },
      },
      { requirement: req({ importance: "nice-to-have" }), item: met },
    ];
    expect(matchScore(mustHaveProfile)).toBeGreaterThan(
      matchScore(niceHaveProfile),
    );
  });

  it("Integer 0-100 bounds across varied inputs", () => {
    const statuses: ChecklistStatus[] = [
      "met",
      "partial",
      "gap",
      "overclaim-risk",
    ];
    for (const s of statuses) {
      const score = matchScore([
        { requirement: req(), item: { status: s, rationale: "" } },
      ]);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
    expect(matchScore([])).toBe(0);
    expect(
      matchScore([{ requirement: req(), item: met }]),
    ).toBe(100);
  });
});
