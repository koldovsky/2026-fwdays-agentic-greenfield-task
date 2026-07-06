// Honesty-eval fixtures for the FLAGGED coverage judge (improve-tailoring-quality T5 §2.6).
// Deterministic proxies for the live LLM eval (live run deferred on ANTHROPIC_API_KEY).
// Each fixture is a manually-authored scored-row + verdict pair that drives
// applyCoverageJudge and gradeOutput deterministically.
//
// Behaviors verified:
//   §2.6 GROUNDED UPGRADE: a verbatim-citation verdict accepted → gap becomes
//     partial (or info), reflected in matchScore.
//   §2.6 FABRICATED CITATION REJECTED: verdict with fabricated citation
//     discarded → row stays gap, no score inflation.
//   §2.6 DETERMINISTIC PROXY: these fixtures stand in for a live LLM eval;
//     they MUST be green before any live run is attempted.
//
// Requirements covered: BC-HONESTY-01, FR-CHECKLIST-01.

import { describe, expect, it } from "vitest";

import { gradeOutput } from "./output";
import type { TailoringOutput } from "./types";

// ---------------------------------------------------------------------------
// Import the pure scorer utilities directly
// ---------------------------------------------------------------------------

import { applyCoverageJudge, matchScore, type ScoredRow } from "@/shared/lib/scoring";
import type { CoverageVerdict } from "@/shared/lib/scoring";
import type { Requirement } from "@/shared/lib/scoring";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function req(id: string, text: string, importance: Requirement["importance"] = "must-have"): Requirement {
  return { id, text, importance, keywords: [text.toLowerCase()] };
}

function gapRow(requirement: Requirement): ScoredRow {
  return { requirement, item: { status: "gap", rationale: "Немає відповідних навичок чи досвіду в резюме" } };
}

// Anonymized CV sentences matching the real user-example target from the spec.
// Verbatim citations are substrings of these sentences so the verifier accepts them.
const CANDIDATE_CV_SENTENCES: readonly string[] = [
  "Розробив мікросервісну архітектуру на TypeScript та Node.js для фінтех-стартапу.",
  "Провів технічне лідерство команди з п'яти розробників протягом двох років.",
  "Налаштував CI/CD пайплайни на GitHub Actions, скоротивши час деплою на 40%.",
  "Впровадив автоматизоване тестування з покриттям 85% за допомогою Jest та Cypress.",
];

// Requirements that correspond to the CV sentences above.
// NOTE: leadership and cicd are defined inline rather than via req() so
// their keywords include tokens that appear in the Ukrainian CV text — the
// relevance gate (judge-score.ts) requires the cited CV sentence to share at
// least one keyword-token with the requirement it upgrades (BC-HONESTY-01).
const REQUIREMENTS = {
  typescript: req("r-ts", "TypeScript experience", "must-have"),
  leadership: {
    id: "r-lead",
    text: "Team leadership",
    importance: "must-have" as const,
    // "лідерство" tokenizes to ["лідерство"] and appears in the Ukrainian CV
    // sentence containing the adjacent citation (BC-HONESTY-01 relevance gate).
    keywords: ["team leadership", "лідерство"],
  },
  cicd: {
    id: "r-cicd",
    text: "CI/CD experience",
    importance: "nice-to-have" as const,
    // "github" tokenizes to ["github"] and appears in the Ukrainian CV sentence
    // that contains "GitHub Actions" (the verbatim citation used below).
    keywords: ["ci/cd", "github actions"],
  },
  testing: req("r-test", "Automated testing", "nice-to-have"),
  // A requirement genuinely absent from the CV:
  kubernetes: req("r-k8s", "Kubernetes cluster management", "must-have"),
};

// ---------------------------------------------------------------------------
// §2.6 FIXTURE 1 — GROUNDED UPGRADE ACCEPTED
// A verdict with a verbatim citation from the CV upgrades a gap to partial/info,
// and the score increases compared to the pure heuristic baseline.
// ---------------------------------------------------------------------------

describe("honesty-eval fixture: grounded upgrade accepted (§2.6, BC-HONESTY-01, FR-CHECKLIST-01)", () => {
  it("verbatim covered citation: gap → partial, score increases vs heuristic", () => {
    const heuristicRows: ScoredRow[] = [gapRow(REQUIREMENTS.typescript)];

    // Verbatim citation — a real substring of the CV sentence.
    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r-ts",
        label: "covered",
        citation: "мікросервісну архітектуру на TypeScript",
      },
    ];

    const judgeRows = applyCoverageJudge(heuristicRows, verdicts, CANDIDATE_CV_SENTENCES);

    expect(judgeRows[0].item.status).toBe("partial");
    expect(matchScore(judgeRows)).toBeGreaterThan(matchScore(heuristicRows));
  });

  it("verbatim adjacent citation: gap → info", () => {
    const heuristicRows: ScoredRow[] = [gapRow(REQUIREMENTS.leadership)];

    const verdicts: CoverageVerdict[] = [
      {
        requirementId: "r-lead",
        label: "adjacent",
        citation: "технічне лідерство команди",
      },
    ];

    const judgeRows = applyCoverageJudge(heuristicRows, verdicts, CANDIDATE_CV_SENTENCES);
    expect(judgeRows[0].item.status).toBe("info");
  });

  it("multiple grounded upgrades accepted in one batch call", () => {
    const heuristicRows: ScoredRow[] = [
      gapRow(REQUIREMENTS.typescript),
      gapRow(REQUIREMENTS.cicd),
    ];

    const verdicts: CoverageVerdict[] = [
      { requirementId: "r-ts", label: "covered", citation: "TypeScript та Node.js" },
      { requirementId: "r-cicd", label: "covered", citation: "GitHub Actions" },
    ];

    const judgeRows = applyCoverageJudge(heuristicRows, verdicts, CANDIDATE_CV_SENTENCES);
    expect(judgeRows[0].item.status).toBe("partial");
    expect(judgeRows[1].item.status).toBe("partial");
    expect(matchScore(judgeRows)).toBeGreaterThan(matchScore(heuristicRows));
  });

  it("gap for a truly absent requirement stays gap even on a flag-on run", () => {
    const heuristicRows: ScoredRow[] = [gapRow(REQUIREMENTS.kubernetes)];

    // The judge returns covered — but the citation is fabricated (not in CV).
    const fabricatedVerdicts: CoverageVerdict[] = [
      { requirementId: "r-k8s", label: "covered", citation: "Deployed 100-node Kubernetes cluster" },
    ];

    const judgeRows = applyCoverageJudge(heuristicRows, fabricatedVerdicts, CANDIDATE_CV_SENTENCES);
    expect(judgeRows[0].item.status).toBe("gap");
  });
});

// ---------------------------------------------------------------------------
// §2.6 FIXTURE 2 — FABRICATED CITATION REJECTED
// A verdict with a hallucinated citation is discarded → row stays gap,
// score stays at the pure heuristic baseline (no inflation).
// ---------------------------------------------------------------------------

describe("honesty-eval fixture: fabricated citation rejected (§2.6, BC-HONESTY-01)", () => {
  it("fabricated citation: gap row unchanged, score identical to heuristic baseline", () => {
    const heuristicRows: ScoredRow[] = [gapRow(REQUIREMENTS.kubernetes)];

    const fabricatedVerdicts: CoverageVerdict[] = [
      {
        requirementId: "r-k8s",
        label: "covered",
        citation: "Managed a 200-node Kubernetes cluster across three regions.",
      },
    ];

    const judgeRows = applyCoverageJudge(heuristicRows, fabricatedVerdicts, CANDIDATE_CV_SENTENCES);

    expect(judgeRows[0].item.status).toBe("gap");
    expect(matchScore(judgeRows)).toBe(matchScore(heuristicRows));
  });

  it("partially-fabricated citation not matching any CV sentence: row stays gap", () => {
    // A citation that paraphrases the CV rather than quoting verbatim.
    const paraphrasedVerdicts: CoverageVerdict[] = [
      {
        requirementId: "r-ts",
        label: "covered",
        // Paraphrase — not a literal substring of any CANDIDATE_CV_SENTENCES.
        citation: "Built microservices with TypeScript",
      },
    ];

    const heuristicRows: ScoredRow[] = [gapRow(REQUIREMENTS.typescript)];
    const judgeRows = applyCoverageJudge(heuristicRows, paraphrasedVerdicts, CANDIDATE_CV_SENTENCES);

    // The scorer verifies verbatim (case-insensitive substring); a paraphrase
    // in a different language/script fails the check.
    expect(judgeRows[0].item.status).toBe("gap");
  });

  it("uncovered verdict for an absent requirement: gap stays gap (no fabrication)", () => {
    const heuristicRows: ScoredRow[] = [gapRow(REQUIREMENTS.kubernetes)];

    const verdicts: CoverageVerdict[] = [
      { requirementId: "r-k8s", label: "uncovered" },
    ];

    const judgeRows = applyCoverageJudge(heuristicRows, verdicts, CANDIDATE_CV_SENTENCES);
    expect(judgeRows[0].item.status).toBe("gap");
    expect(matchScore(judgeRows)).toBe(matchScore(heuristicRows));
  });
});

// ---------------------------------------------------------------------------
// §2.6 DETERMINISTIC PROXY — gradeOutput still passes after a judge upgrade
// The upgrade affects the checklist only (score/rationale); bullet verdicts,
// export set, and the rest of the output contract remain unchanged.
// ---------------------------------------------------------------------------

describe("honesty-eval fixture: gradeOutput passes after a coverage-judge upgrade (§2.6)", () => {
  it("a flag-on run with a grounded upgrade still produces a valid output artifact", () => {
    // Simulate the output the loop would produce after judge upgrades one row
    // from gap to partial. The bullet verdict is independently grounded.
    const CV_SENTENCE = CANDIDATE_CV_SENTENCES[0];
    const output: TailoringOutput = {
      cvSentences: [CV_SENTENCE],
      bullets: [
        { id: "b1", text: "Розробив TypeScript мікросервіси.", sourceSentence: CV_SENTENCE },
      ],
      verdicts: [
        { bulletId: "b1", label: "grounded", evidence: CV_SENTENCE },
      ],
      exportedBulletIds: ["b1"],
      checklist: [
        // The judge upgraded this from gap to partial.
        {
          requirement: "TypeScript experience",
          status: "partial",
          rationale: "Підтверджено цитатою з резюме: «TypeScript та Node.js»",
        },
      ],
      matchScore: 50, // > 0 because the gap was upgraded
    };

    const grade = gradeOutput(output);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBe(1);
  });

  it("a non-judge baseline output (flag off, all gaps) also passes gradeOutput", () => {
    const CV_SENTENCE = CANDIDATE_CV_SENTENCES[0];
    const output: TailoringOutput = {
      cvSentences: [CV_SENTENCE],
      bullets: [
        { id: "b1", text: "Розробив TypeScript мікросервіси.", sourceSentence: CV_SENTENCE },
      ],
      verdicts: [
        { bulletId: "b1", label: "grounded", evidence: CV_SENTENCE },
      ],
      exportedBulletIds: ["b1"],
      checklist: [
        {
          requirement: "TypeScript experience",
          status: "gap",
          rationale: "Немає відповідних навичок чи досвіду в резюме",
        },
      ],
      matchScore: 0,
    };

    const grade = gradeOutput(output);
    expect(grade.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2.6 SCORE INVARIANTS — judge upgrades credit score proportionally
// ---------------------------------------------------------------------------

describe("honesty-eval fixture: score invariants after judge upgrades (§2.6, FR-CHECKLIST-04)", () => {
  it("judge upgrade from gap to partial adds 0.5 credit for a must-have (weighted 3)", () => {
    // matchScore formula: earned/possible * 100, rounded.
    // must-have weight=3; gap credit=0, partial credit=0.5 → 1.5/3 = 50.
    const before: ScoredRow[] = [gapRow(req("r1", "TypeScript", "must-have"))];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "covered", citation: "TypeScript та Node.js" },
    ];
    const after = applyCoverageJudge(before, verdicts, CANDIDATE_CV_SENTENCES);

    expect(matchScore(before)).toBe(0);
    expect(matchScore(after)).toBe(50);
  });

  it("judge upgrade from gap to info adds 0.25 credit (adjacent verdict)", () => {
    // must-have weight=3; info credit=0.25 → 0.75/3 = 25.
    const before: ScoredRow[] = [gapRow(req("r1", "TypeScript", "must-have"))];
    const verdicts: CoverageVerdict[] = [
      { requirementId: "r1", label: "adjacent", citation: "TypeScript та Node.js" },
    ];
    const after = applyCoverageJudge(before, verdicts, CANDIDATE_CV_SENTENCES);

    expect(matchScore(before)).toBe(0);
    expect(matchScore(after)).toBe(25);
  });

  it("fabricated citation: score stays 0 regardless of verdict label (BC-HONESTY-01)", () => {
    for (const label of ["covered", "adjacent"] as const) {
      const before: ScoredRow[] = [gapRow(req("r1", "Kubernetes", "must-have"))];
      const verdicts: CoverageVerdict[] = [
        { requirementId: "r1", label, citation: "Never in the CV at all." },
      ];
      const after = applyCoverageJudge(before, verdicts, CANDIDATE_CV_SENTENCES);
      expect(matchScore(after)).toBe(0);
    }
  });
});
