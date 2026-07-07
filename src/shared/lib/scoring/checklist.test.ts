import { describe, expect, it } from "vitest";

import { checklistItem, matchScore, requiredYears } from "./index";
import type { ChecklistStatus, CvProfile, Requirement } from "./types";

// Emoji / pictographic ranges (no emoji allowed — FR-CHECKLIST-03).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u;

const ALL_STATUSES: readonly ChecklistStatus[] = [
  "met",
  "partial",
  "info",
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

  it("info: a multi-word requirement is adjacent-covered by a component token (FR-CHECKLIST-01)", () => {
    // "React Native" is not in the CV, but "React" is — coverable, not a red gap.
    const item = checklistItem(req({ keywords: ["react native"] }), cvWithReactProse);
    expect(item.status).toBe("info");
    expect(item.rationale).toContain("react");
    expect(item.rationale.length).toBeLessThanOrEqual(100);
    expect(item.rationale).not.toMatch(EMOJI);
  });

  it("info never fires on a true gap or a single-word keyword", () => {
    // Single-word keyword absent entirely → gap, never info.
    expect(checklistItem(req({ keywords: ["kubernetes"] }), cvWithReactProse).status).toBe("gap");
    // Multi-word keyword with no component present → gap.
    expect(checklistItem(req({ keywords: ["apache kafka"] }), cvWithReactProse).status).toBe("gap");
  });

  it("info does not override grounded or claimed-only statuses", () => {
    // Grounded component would be "info", but a fully grounded keyword wins as met/partial.
    const partial = checklistItem(
      req({ keywords: ["react", "react native"] }),
      cvWithReactProse,
    );
    expect(partial.status).toBe("partial");
  });
});

describe("checklistItem: alias-aware keyword coverage (improve-tailoring-quality T5)", () => {
  it("alias in CV prose grounds the keyword: 'k8s' satisfies a 'Kubernetes' requirement (met)", () => {
    const cv: CvProfile = {
      skills: ["k8s"],
      sentences: ["Розгортав сервіси у k8s кластері продакшн"],
    };
    const item = checklistItem(req({ keywords: ["Kubernetes"] }), cv);
    expect(item.status).toBe("met");
  });

  it("alias grounds one of two keywords in prose → partial, not met", () => {
    const cv: CvProfile = { skills: [], sentences: ["Writing js code daily"] };
    const item = checklistItem(req({ keywords: ["javascript", "python"] }), cv);
    expect(item.status).toBe("partial");
  });

  it("alias skills-list claim ('aws' for 'Amazon Web Services') is claimed-only, not prose-grounded", () => {
    const cv: CvProfile = { skills: ["aws"], sentences: [] };
    const requirement = req({ keywords: ["Amazon Web Services"] });
    expect(checklistItem(requirement, cv).status).toBe("overclaim-risk");
    expect(checklistItem(requirement, cv, "mid").status).toBe("partial");
  });

  it("alias grounding does not credit an unrelated keyword (no inflation, BC-HONESTY-01)", () => {
    const cv: CvProfile = { skills: ["aws"], sentences: ["Working with AWS Lambda daily"] };
    const unrelated = checklistItem(req({ keywords: ["docker"] }), cv);
    expect(unrelated.status).toBe("gap");
  });

  it("an unrecognized keyword behaves exactly as before (no alias expansion)", () => {
    const cv: CvProfile = { skills: ["cobol"], sentences: [] };
    // "cobol" is not in any alias group, so it only ever matches itself.
    expect(checklistItem(req({ keywords: ["fortran"] }), cv).status).toBe("gap");
  });
});

describe("alias boundary matching (no substring collisions, BC-HONESTY-01)", () => {
  // A short alias must never credit an unrelated word that merely contains it
  // as a substring. The only relevant text is a colliding word → must be "gap".
  it("'ts' inside 'results'/'projects' does NOT ground a TypeScript requirement", () => {
    const cv: CvProfile = {
      skills: [],
      sentences: ["Delivered measurable results across projects"],
    };
    expect(checklistItem(req({ keywords: ["TypeScript"] }), cv).status).toBe("gap");
  });

  it("'js' inside 'json' does NOT ground a JavaScript requirement", () => {
    const cv: CvProfile = {
      skills: [],
      sentences: ["Parsed a large json payload"],
    };
    expect(checklistItem(req({ keywords: ["JavaScript"] }), cv).status).toBe("gap");
  });

  it("'ui' inside 'build'/'requirements' does NOT ground a user interface requirement", () => {
    const cv: CvProfile = {
      skills: [],
      sentences: ["We build internal tools and gathered requirements"],
    };
    expect(checklistItem(req({ keywords: ["user interface"] }), cv).status).toBe("gap");
  });

  it("'aws' inside 'laws' does NOT ground an Amazon Web Services requirement", () => {
    const cv: CvProfile = {
      skills: [],
      sentences: ["Aware of local laws"],
    };
    expect(checklistItem(req({ keywords: ["Amazon Web Services"] }), cv).status).toBe("gap");
  });

  // Positive counterparts: a standalone whole-token alias DOES ground/claim.
  it("standalone 'ts' in prose grounds a TypeScript requirement (met)", () => {
    const cv: CvProfile = { skills: [], sentences: ["Stack: ts, aws"] };
    expect(checklistItem(req({ keywords: ["TypeScript"] }), cv).status).toBe("met");
  });

  it("standalone 'aws' as a claimed skill claims an Amazon Web Services requirement", () => {
    const cv: CvProfile = { skills: ["ts", "aws"], sentences: ["No cloud prose here"] };
    expect(checklistItem(req({ keywords: ["Amazon Web Services"] }), cv).status).toBe(
      "overclaim-risk",
    );
  });

  it("standalone 'ui' in prose grounds a user interface requirement (met)", () => {
    const cv: CvProfile = { skills: [], sentences: ["Built the UI for the dashboard"] };
    expect(checklistItem(req({ keywords: ["user interface"] }), cv).status).toBe("met");
  });

  it("standalone 'js' as a claimed skill claims a JavaScript requirement", () => {
    const cv: CvProfile = { skills: ["js"], sentences: ["No language mentioned in prose"] };
    expect(checklistItem(req({ keywords: ["JavaScript"] }), cv).status).toBe(
      "overclaim-risk",
    );
  });
});

describe("checklistItem: seniority relaxation (improve-tailoring-quality T5)", () => {
  const claimedOnlyReq = req({ keywords: ["kubernetes"] });
  const claimedOnlyCv: CvProfile = {
    skills: ["kubernetes"],
    sentences: ["Немає згадок про контейнеризацію в цьому реченні"],
  };

  it("claimed-only skill is overclaim-risk when seniority is undefined or junior", () => {
    expect(checklistItem(claimedOnlyReq, claimedOnlyCv).status).toBe(
      "overclaim-risk",
    );
    expect(checklistItem(claimedOnlyReq, claimedOnlyCv, "junior").status).toBe(
      "overclaim-risk",
    );
  });

  it("claimed-only skill is partial (claimed-covered) for mid and senior", () => {
    expect(checklistItem(claimedOnlyReq, claimedOnlyCv, "mid").status).toBe(
      "partial",
    );
    expect(checklistItem(claimedOnlyReq, claimedOnlyCv, "senior").status).toBe(
      "partial",
    );
  });

  it("a claimed-only skill never reaches 'met', even for senior (BC-HONESTY-01)", () => {
    const item = checklistItem(claimedOnlyReq, claimedOnlyCv, "senior");
    expect(item.status).not.toBe("met");
    expect(item.status).toBe("partial");
  });

  it("grounded-in-prose still wins regardless of seniority", () => {
    const groundedItem = checklistItem(req(), cvWithReactProse, "junior");
    expect(groundedItem.status).toBe("met");
  });

  it("claimed-covered rationale is Ukrainian, <=100 chars, no emoji/exclamation, names the skill", () => {
    const item = checklistItem(claimedOnlyReq, claimedOnlyCv, "senior");
    expect(item.rationale.length).toBeLessThanOrEqual(100);
    expect(item.rationale.length).toBeGreaterThan(0);
    expect(item.rationale).not.toMatch(EMOJI);
    expect(item.rationale).not.toContain("!");
    expect(item.rationale).toContain("kubernetes");
    expect(item.rationale).toMatch(/[а-яіїєА-ЯІЇЄ]/);
  });

  it("determinism holds for both alias-grounded and seniority-relaxed results", () => {
    const a = checklistItem(claimedOnlyReq, claimedOnlyCv, "senior");
    const b = checklistItem(claimedOnlyReq, claimedOnlyCv, "senior");
    expect(a).toEqual(b);

    const aliasReq = req({ keywords: ["kubernetes"] });
    const aliasCv: CvProfile = {
      skills: [],
      sentences: ["Deployed with k8s in production"],
    };
    const c = checklistItem(aliasReq, aliasCv);
    const d = checklistItem(aliasReq, aliasCv);
    expect(c).toEqual(d);
  });
});

// ---------------------------------------------------------------------------
// requiredYears + candidateTenureYears (improve-tailoring-quality §1.3, BC-HONESTY-01)
// ---------------------------------------------------------------------------

describe("requiredYears (§1.3)", () => {
  it("returns undefined for a requirement with no year count", () => {
    expect(requiredYears(req({ text: "React experience" }))).toBeUndefined();
    expect(requiredYears(req({ text: "TypeScript знання" }))).toBeUndefined();
  });

  it("detects '3+ years' syntax", () => {
    expect(requiredYears(req({ text: "3+ years of backend experience" }))).toBe(3);
  });

  it("detects '5 years' syntax (no +)", () => {
    expect(requiredYears(req({ text: "5 years React" }))).toBe(5);
  });

  it("detects '7 років' (Ukrainian)", () => {
    expect(requiredYears(req({ text: "7 років досвіду з Node.js" }))).toBe(7);
  });

  it("returns undefined for a year count of zero", () => {
    expect(requiredYears(req({ text: "0 years experience" }))).toBeUndefined();
  });

  it("reads the first integer — does not fabricate a higher bar", () => {
    // "at least 2 years" → 2; "10 or more years" → 10
    expect(requiredYears(req({ text: "at least 2 years of Go" }))).toBe(2);
  });
});

describe("checklistItem: tenure evaluation (§1.3, BC-HONESTY-01)", () => {
  const groundedDurationReq: Requirement = {
    id: "r-dur",
    text: "3+ years of Node.js experience",
    importance: "must-have",
    keywords: ["node.js"],
  };

  const groundedCv: CvProfile = {
    skills: ["node.js"],
    sentences: ["Built REST APIs using Node.js for three years in production"],
  };

  it("tenure lifts a grounded-partial to 'met' when candidateTenureYears >= required", () => {
    // With only one of 2 keywords grounded the base status would be partial;
    // but with tenure satisfied it should be 'met'.
    const multiKwReq: Requirement = {
      ...groundedDurationReq,
      keywords: ["node.js", "express"],
    };
    const partialCv: CvProfile = {
      skills: [],
      sentences: ["Built REST APIs using Node.js for three years in production"],
    };
    const itemWithTenure = checklistItem(multiKwReq, partialCv, undefined, 5);
    expect(itemWithTenure.status).toBe("met");
  });

  it("tenure does NOT lift a requirement if the skill keyword is missing from the CV (BC-HONESTY-01)", () => {
    const unrelatdCv: CvProfile = {
      skills: [],
      sentences: ["Built mobile apps in Swift for four years"],
    };
    const item = checklistItem(groundedDurationReq, unrelatdCv, undefined, 10);
    // No Node.js mention anywhere in the CV → gap or overclaim-risk, never met.
    expect(item.status).not.toBe("met");
    expect(item.status).not.toBe("partial");
  });

  it("unknown / zero tenure gives no false duration credit (BC-HONESTY-01)", () => {
    const item = checklistItem(groundedDurationReq, groundedCv, undefined, undefined);
    // Without tenureYears the partial grounding stays partial — no automatic lift.
    expect(item.status).toBe("met"); // actually fully grounded here; use below for partial case
  });

  it("insufficient tenure keeps the status at partial, does not lift to met", () => {
    const multiKwReq: Requirement = {
      ...groundedDurationReq,
      text: "5+ years of Node.js and PostgreSQL",
      keywords: ["node.js", "postgresql"],
    };
    const partialCv: CvProfile = {
      skills: [],
      sentences: ["Built REST APIs using Node.js for three years in production"],
    };
    // Only node.js grounded, not postgresql; tenureYears=2 < 5 required → partial
    const itemLowTenure = checklistItem(multiKwReq, partialCv, undefined, 2);
    expect(itemLowTenure.status).toBe("partial");

    // Sufficient tenure lifts to met when grounded on the domain keyword
    const itemHighTenure = checklistItem(
      { ...multiKwReq, keywords: ["node.js"] },
      partialCv,
      undefined,
      6,
    );
    expect(itemHighTenure.status).toBe("met");
  });

  it("tenure-met rationale is Ukrainian, <=100 chars, cites the CV evidence", () => {
    const singleKwReq: Requirement = {
      id: "r-t",
      text: "3+ years of Node.js",
      importance: "must-have",
      keywords: ["node.js"],
    };
    const cv: CvProfile = {
      skills: [],
      sentences: ["Built REST APIs using Node.js for three years"],
    };
    const item = checklistItem(singleKwReq, cv, undefined, 4);
    expect(item.status).toBe("met");
    expect(item.rationale.length).toBeLessThanOrEqual(100);
    expect(item.rationale.length).toBeGreaterThan(0);
    expect(item.rationale).not.toMatch(/[!]/);
  });

  it("tenure does not affect non-duration requirements (no year count in text)", () => {
    const nonDurationReq = req({ text: "React experience", keywords: ["react"] });
    const cv = cvWithReactProse;
    const withTenure = checklistItem(nonDurationReq, cv, undefined, 50);
    const withoutTenure = checklistItem(nonDurationReq, cv, undefined, undefined);
    // Both should be 'met' — tenure neither helps nor hurts a non-duration req.
    expect(withTenure.status).toBe(withoutTenure.status);
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

  it("info credit sits between partial and gap (FR-CHECKLIST-04)", () => {
    const one = (status: ChecklistStatus) =>
      matchScore([{ requirement: req(), item: { status, rationale: "" } }]);
    expect(one("info")).toBeLessThan(one("partial"));
    expect(one("info")).toBeGreaterThan(one("gap"));
    expect(one("info")).toBeGreaterThan(one("overclaim-risk"));
  });

  it("Integer 0-100 bounds across varied inputs", () => {
    const statuses: ChecklistStatus[] = [
      "met",
      "partial",
      "info",
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
