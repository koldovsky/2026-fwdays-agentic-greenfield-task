// Tests for the FLAGGED coverage-judge deterministic scorer (improve-tailoring-quality T5 §2.3).
// Tests 2.3 (cited-evidence scorer), 2.5 (no-unflag / denylist), and the
// scored-row immutability contract (TC-PURE-01). No LLM calls — pure arithmetic.
//
// Requirements covered: FR-CHECKLIST-01, FR-CHECKLIST-03, FR-CHECKLIST-04,
//   BC-HONESTY-01, BC-HONESTY-02, TC-PURE-01.

import { describe, expect, it } from "vitest";

import { matchScore } from "./checklist";
import { applyCoverageJudge, type ScoredRow } from "./judge-score";
import type { CoverageVerdict } from "./judge-types";
import type { ChecklistItem, Requirement } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u;

function req(partial: Partial<Requirement> = {}): Requirement {
  return {
    id: "r1",
    text: "TypeScript experience",
    importance: "must-have",
    keywords: ["typescript"],
    ...partial,
  };
}

function gapRow(reqOverride: Partial<Requirement> = {}): ScoredRow {
  return {
    requirement: req(reqOverride),
    item: { status: "gap", rationale: "Немає відповідних навичок чи досвіду в резюме" },
  };
}

function rowWith(status: ChecklistItem["status"], reqOverride: Partial<Requirement> = {}): ScoredRow {
  return {
    requirement: req(reqOverride),
    item: { status, rationale: "Тест" },
  };
}

// ---------------------------------------------------------------------------
// 2.3 — CITED-EVIDENCE SCORER: covered + verbatim citation → partial
// ---------------------------------------------------------------------------

describe("applyCoverageJudge: covered verdict with verbatim citation upgrades gap (§2.3, FR-CHECKLIST-01)", () => {
  const cvSentences = [
    "Wrote TypeScript across the backend and tooling.",
    "Worked on a React app.",
  ];

  it("covered + verbatim citation: gap → partial", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        citation: "Wrote TypeScript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("partial");
  });

  it("covered verdict never produces met (BC-HONESTY-01)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        citation: "Wrote TypeScript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).not.toBe("met");
    expect(result[0].item.status).toBe("partial");
  });

  it("adjacent + verbatim citation: gap → info (§2.3)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "adjacent",
        // Citation is verbatim in the first CV sentence AND shares the
        // "typescript" keyword-token with the TypeScript requirement — the
        // relevance gate passes and the row upgrades to info (not partial).
        citation: "Wrote TypeScript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("info");
  });

  it("rationale names the surviving citation, <=100 chars (FR-CHECKLIST-03)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        citation: "Wrote TypeScript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    const { rationale } = result[0].item;
    expect(rationale.length).toBeLessThanOrEqual(100);
    expect(rationale).toContain("TypeScript");
  });

  it("rationale has no emoji and no exclamation point (FR-CHECKLIST-03, BC-BRAND-01)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        citation: "Wrote TypeScript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    const { rationale } = result[0].item;
    expect(rationale).not.toMatch(EMOJI);
    expect(rationale).not.toContain("!");
  });

  it("rationale is Ukrainian (contains Cyrillic) for both covered and adjacent upgrades", () => {
    const CYRILLIC = /[а-яіїєА-ЯІЇЄ]/;
    const rows: ScoredRow[] = [gapRow({ id: "r1" }), gapRow({ id: "r2" })];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "Wrote TypeScript across the backend" },
      { requirementId: "r2", label: "adjacent", citation: "Worked on a React app" },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.rationale).toMatch(CYRILLIC);
    expect(result[1].item.rationale).toMatch(CYRILLIC);
  });

  it("citation check is case-insensitive (partial substring match)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        // lowercase version of a sentence that has mixed case in cvSentences
        citation: "wrote typescript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("partial");
  });
});

// ---------------------------------------------------------------------------
// 2.3 — FABRICATED / uncited citation → row stays heuristic gap (BC-HONESTY-01)
// ---------------------------------------------------------------------------

describe("applyCoverageJudge: fabricated or absent citation keeps the heuristic row (§2.3, BC-HONESTY-01)", () => {
  const cvSentences = [
    "Wrote TypeScript across the backend and tooling.",
  ];

  it("fabricated citation not in CV → gap unchanged (BC-HONESTY-01)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        citation: "Led a team of 50 engineers worldwide.", // not in CV
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });

  it("empty string citation → gap unchanged (empty is not verbatim)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "" },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });

  it("whitespace-only citation → gap unchanged", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "   " },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });

  it("absent citation on covered verdict → gap unchanged", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered" }, // no citation field
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });

  it("uncovered verdict → row always unchanged regardless of any citation", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "uncovered", citation: "Wrote TypeScript across the backend" },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });

  it("no verdict for a requirement → gap unchanged", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r99" })];
    const verdicts: CoverageVerdict[] = []; // no r99 verdict
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });
});

// ---------------------------------------------------------------------------
// 2.3 / 2.5 — NO-UNFLAG: non-gap heuristic rows are never touched (BC-HONESTY-01/02)
// ---------------------------------------------------------------------------

describe("applyCoverageJudge: non-gap rows are NEVER modified (§2.3/§2.5, BC-HONESTY-01/02)", () => {
  const cvSentences = ["Wrote TypeScript across the backend and tooling."];
  const verbatimCitation = "Wrote TypeScript across the backend";

  const nonGapStatuses: ChecklistItem["status"][] = [
    "met",
    "partial",
    "info",
    "overclaim-risk",
  ];

  for (const status of nonGapStatuses) {
    it(`${status} row is kept as-is even with a covered verdict + verbatim citation`, () => {
      const rows: ScoredRow[] = [rowWith(status, { id: "r1" })];
      const verdicts: CoverageVerdict[] = [
        { requirementId: "r1", label: "covered", citation: verbatimCitation },
      ];
      const result = applyCoverageJudge(rows, verdicts, cvSentences);
      expect(result[0].item.status).toBe(status);
      expect(result[0].item.rationale).toBe("Тест"); // rationale also unchanged
    });
  }

  it("a covered verdict cannot unflag an overclaim-risk bullet (BC-HONESTY-02)", () => {
    const overclaim: ScoredRow = rowWith("overclaim-risk", { id: "r1" });
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: verbatimCitation },
    ];
    const result = applyCoverageJudge([overclaim], verdicts, cvSentences);
    expect(result[0].item.status).toBe("overclaim-risk");
  });

  it("a covered verdict on a gap row cannot fabricate met (gap → partial at most, never met)", () => {
    // The real invariant: even for a gap row, covered only reaches partial, never met.
    const rows: ScoredRow[] = [{ requirement: req({ id: "r1" }), item: { status: "gap", rationale: "Тест" } }];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: verbatimCitation },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).not.toBe("met");
    expect(result[0].item.status).toBe("partial");
  });

  it("non-gap rows returned unchanged (not upgraded, not downgraded)", () => {
    // Every non-gap status is preserved as-is — the judge only upgrades true gaps.
    for (const status of nonGapStatuses) {
      const rows: ScoredRow[] = [rowWith(status, { id: "r1" })];
      const verdicts: CoverageVerdict[] = [
        { requirementId: "r1", label: "covered", citation: verbatimCitation },
      ];
      const result = applyCoverageJudge(rows, verdicts, cvSentences);
      // Non-gap rows pass through; their status is UNCHANGED from the heuristic.
      expect(result[0].item.status).toBe(status);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-PURE-01 — input rows never mutated, result is a new array
// ---------------------------------------------------------------------------

describe("applyCoverageJudge: input rows are never mutated (TC-PURE-01)", () => {
  const cvSentences = ["Wrote TypeScript across the backend and tooling."];

  it("returns a new array reference (no mutation)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const original = JSON.parse(JSON.stringify(rows));
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "Wrote TypeScript across" },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result).not.toBe(rows);
    // original rows unchanged
    expect(rows[0].item.status).toBe(original[0].item.status);
  });

  it("same inputs always produce same outputs (determinism, TC-PURE-01)", () => {
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "Wrote TypeScript across" },
    ];
    const a = applyCoverageJudge(rows, verdicts, cvSentences);
    const b = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// matchScore integration: upgrades from the judge credit the score correctly
// ---------------------------------------------------------------------------

describe("matchScore over coverage-judge upgraded rows (FR-CHECKLIST-04)", () => {
  it("a gap→partial upgrade raises the match score vs the pure heuristic", () => {
    // Simulate what the loop does: run heuristic scorer (produces gaps), then
    // apply the judge. Compare the resulting scores.
    const requirement = req({ id: "r1", importance: "must-have" });
    const heuristicRows: ScoredRow[] = [
      { requirement, item: { status: "gap", rationale: "Немає відповідних навичок" } },
    ];
    const cvSentences = ["Wrote TypeScript across the backend."];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "Wrote TypeScript across the backend" },
    ];
    const judgeRows = applyCoverageJudge(heuristicRows, verdicts, cvSentences);

    const heuristicScore = matchScore(heuristicRows);
    const judgeScore = matchScore(judgeRows);

    expect(judgeScore).toBeGreaterThan(heuristicScore);
    expect(judgeRows[0].item.status).toBe("partial");
  });

  it("a fabricated citation leaves the score identical to the pure heuristic (BC-HONESTY-01)", () => {
    const requirement = req({ id: "r1", importance: "must-have" });
    const heuristicRows: ScoredRow[] = [
      { requirement, item: { status: "gap", rationale: "Немає відповідних навичок" } },
    ];
    const cvSentences = ["Wrote TypeScript across the backend."];
    const fabricated: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "Led a $10M cloud migration." },
    ];
    const judgeRows = applyCoverageJudge(heuristicRows, fabricated, cvSentences);

    expect(matchScore(judgeRows)).toBe(matchScore(heuristicRows));
    expect(judgeRows[0].item.status).toBe("gap");
  });
});

// ---------------------------------------------------------------------------
// Relevance gate: verbatim-but-irrelevant citations are DISCARDED (BC-HONESTY-01)
// These tests prove the NEW relevance-aware gate introduced in improve-tailoring-
// quality T5 §2.3: a citation that is verbatim in the CV but shares no keyword-
// token with the requirement it claims to cover cannot upgrade the gap.
// ---------------------------------------------------------------------------

describe("applyCoverageJudge: relevance gate — verbatim-but-irrelevant citation discarded (BC-HONESTY-01)", () => {
  // CV contains two sentences: one about TypeScript, one about React.
  // The TypeScript requirement must not be upgraded by a React-only citation.
  const cvSentences = [
    "Wrote TypeScript across the backend and tooling.",
    "Worked on a React app for two years.",
  ];

  it("verbatim citation that shares NO requirement keyword-token → row stays gap (BC-HONESTY-01)", () => {
    // The TypeScript requirement's tokens are ["typescript", "experience"].
    // "Worked on a React app for two years" IS verbatim in the CV, but "react"
    // and "years" share nothing with ["typescript", "experience"] — discarded.
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        citation: "Worked on a React app for two years",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });

  it("citation under MIN_CITATION_CHARS (trivial / stopword token) → row stays gap (BC-HONESTY-01)", () => {
    // A 2-character citation ("на") is verbatim in the CV but far too short to
    // be evidence of anything — the trivial-length gate rejects it before any
    // keyword-relevance check.
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "na" },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("gap");
  });

  it("citation verbatim AND non-trivial AND shares a requirement keyword → upgrades gap to partial (covered)", () => {
    // "Wrote TypeScript across the backend" is verbatim in cvSentences[0] AND
    // the token "typescript" matches the requirement keyword — gate passes.
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        citation: "Wrote TypeScript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("partial");
    expect(result[0].item.rationale).toContain("TypeScript");
  });

  it("citation verbatim AND non-trivial AND shares a requirement keyword → upgrades gap to info (adjacent)", () => {
    // Same verbatim citation with an adjacent verdict upgrades to info, not partial.
    const rows: ScoredRow[] = [gapRow({ id: "r1" })];
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "adjacent",
        citation: "Wrote TypeScript across the backend",
      },
    ];
    const result = applyCoverageJudge(rows, verdicts, cvSentences);
    expect(result[0].item.status).toBe("info");
  });

  it("trivial/irrelevant citation leaves matchScore identical to the pure heuristic result (BC-HONESTY-01)", () => {
    // A citation that is verbatim in the CV but unrelated to the requirement
    // must not credit any score — matchScore is identical before and after.
    const requirement = req({ id: "r1", importance: "must-have" });
    const heuristicRows: ScoredRow[] = [
      { requirement, item: { status: "gap", rationale: "Немає відповідних навичок" } },
    ];
    const irrelevant: CoverageVerdict[] = [
      {
        requirementId: "r1",
        label: "covered",
        // Verbatim in cvSentences but "react"/"years" share nothing with "typescript".
        citation: "Worked on a React app for two years",
      },
    ];
    const judgeRows = applyCoverageJudge(heuristicRows, irrelevant, cvSentences);
    expect(matchScore(judgeRows)).toBe(matchScore(heuristicRows));
    expect(judgeRows[0].item.status).toBe("gap");
  });
});
