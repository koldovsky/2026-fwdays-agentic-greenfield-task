// Trajectory eval tests specific to the FLAGGED coverage judge
// (improve-tailoring-quality T5 §2.5). Covers:
//   - grounding-isolation: judge context keys (requirements, coverageJudge,
//     coverageVerdicts) in a ground-bullet step FAIL the eval.
//   - orderOk: judge-coverage sits at rank 2 (after extract, before generation),
//     non-decreasing order accepted.
//   - A flag-on golden trace (judge-coverage before score) passes all checks.
//   - A covered verdict path (judge ran, score upgraded) proves the verdict never
//     reached bullet-grounding context.
//
// Requirements covered: BC-HONESTY-01, BC-HONESTY-02, BC-HONESTY-03, FR-BULLETS-03.

import { describe, expect, it } from "vitest";

import { goldenTrace } from "./fixtures";
import { gradeTrajectory } from "./trajectory";
import type { RunTrace } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mutateTrace(
  fn: (t: { -readonly [K in keyof RunTrace]: RunTrace[K] }) => void,
): RunTrace {
  const copy: RunTrace = JSON.parse(JSON.stringify(goldenTrace));
  const mutable = copy as { -readonly [K in keyof RunTrace]: RunTrace[K] };
  fn(mutable);
  return mutable;
}

/**
 * A well-formed analysis+generation trace that includes judge-coverage at rank 2
 * (improve-tailoring-quality T5). The judge's context keys are [cvText, requirements]
 * and it sits BEFORE score, which runs before generation — this is the accepted
 * pipeline order (design.md §1). Bullet-grounding context contains ONLY
 * {bullet, cvText} — judge keys never reach it.
 */
const goldenTraceWithJudge: RunTrace = mutateTrace((t) => {
  t.steps = [
    { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
    { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"], llmPayload: "extract" },
    { skill: "judge-coverage", attempts: 1, contextKeys: ["cvText", "requirements"], llmPayload: "judge-prompt" },
    { skill: "score", attempts: 1, contextKeys: ["requirements", "cvProfile"] },
    { skill: "derive-clarifying-questions", attempts: 1, contextKeys: ["checklist"] },
    { skill: "generate-bullet", attempts: 1, contextKeys: ["cvProfile", "requirements", "jdText"], llmPayload: "generate" },
    { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText"] },
    { skill: "generate-bullet", attempts: 1, contextKeys: ["cvProfile", "requirements", "jdText"] },
    { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText"] },
  ];
});

// ---------------------------------------------------------------------------
// §2.5 — pipeline-order: judge-coverage at rank 2 is accepted
// ---------------------------------------------------------------------------

describe("gradeTrajectory: judge-coverage pipeline order (§2.5, BC-HONESTY-01)", () => {
  it("golden trace with judge-coverage passes ALL checks", () => {
    const grade = gradeTrajectory(goldenTraceWithJudge);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBe(1);
  });

  it("judge-coverage before score (both at rank 2) passes pipeline-order", () => {
    const grade = gradeTrajectory(goldenTraceWithJudge);
    const order = grade.checks.find((c) => c.id === "pipeline-order");
    expect(order?.ok).toBe(true);
  });

  it("judge-coverage before score passes grounding-isolation (judge keys never in ground-bullet)", () => {
    const grade = gradeTrajectory(goldenTraceWithJudge);
    const isolation = grade.checks.find((c) => c.id === "grounding-isolation");
    expect(isolation?.ok).toBe(true);
  });

  it("judge-coverage at rank 2 AFTER generation fails pipeline-order", () => {
    const badOrder = mutateTrace((t) => {
      t.steps = [
        { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
        { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"] },
        { skill: "generate-bullet", attempts: 1, contextKeys: ["cvProfile", "requirements", "jdText"] },
        // judge-coverage AFTER generation is rank 3 after rank 2 — violates non-decreasing
        { skill: "judge-coverage", attempts: 1, contextKeys: ["cvText", "requirements"] },
        { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText"] },
      ];
    });
    const grade = gradeTrajectory(badOrder);
    expect(grade.checks.find((c) => c.id === "pipeline-order")?.ok).toBe(false);
    expect(grade.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §2.5 — grounding-isolation: judge context keys in ground-bullet FAIL the eval
// ---------------------------------------------------------------------------

describe("gradeTrajectory: GROUNDING_FORBIDDEN judge keys fail grounding-isolation (§2.5)", () => {
  it("ground-bullet sees 'requirements' → grounding-isolation fails", () => {
    const leaky = mutateTrace((t) => {
      const steps = [...t.steps];
      steps[steps.length - 1] = {
        skill: "ground-bullet",
        attempts: 1,
        // 'requirements' is in GROUNDING_FORBIDDEN (trajectory.ts)
        contextKeys: ["bullet", "cvText", "requirements"],
      };
      t.steps = steps;
    });
    const grade = gradeTrajectory(leaky);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(false);
    expect(grade.passed).toBe(false);
  });

  it("ground-bullet sees 'coverageJudge' → grounding-isolation fails (BC-HONESTY-01)", () => {
    const leaky = mutateTrace((t) => {
      const steps = [...t.steps];
      steps[steps.length - 1] = {
        skill: "ground-bullet",
        attempts: 1,
        contextKeys: ["bullet", "cvText", "coverageJudge"],
      };
      t.steps = steps;
    });
    const grade = gradeTrajectory(leaky);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(false);
    expect(grade.passed).toBe(false);
  });

  it("ground-bullet sees 'coverageVerdicts' → grounding-isolation fails (BC-HONESTY-01)", () => {
    const leaky = mutateTrace((t) => {
      const steps = [...t.steps];
      steps[steps.length - 1] = {
        skill: "ground-bullet",
        attempts: 1,
        contextKeys: ["bullet", "cvText", "coverageVerdicts"],
      };
      t.steps = steps;
    });
    const grade = gradeTrajectory(leaky);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(false);
    expect(grade.passed).toBe(false);
  });

  it("covered verdict path: judge ran, ground-bullet has NO judge keys — grounding-isolation passes", () => {
    // The judge ran (judge-coverage step recorded), but its verdict data was
    // applied to the checklist before generation. The ground-bullet step only
    // ever sees {bullet, cvText} — the judge's intermediate verdicts never
    // reach the grounding context. This is the correctness proof for §2.5.
    const coveredPath: RunTrace = {
      stepCap: 20,
      terminated: "done",
      steps: [
        { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
        { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"] },
        { skill: "judge-coverage", attempts: 1, contextKeys: ["cvText", "requirements"] },
        { skill: "score", attempts: 1, contextKeys: ["requirements", "cvProfile"] },
        { skill: "derive-clarifying-questions", attempts: 1, contextKeys: ["checklist"] },
        { skill: "generate-bullet", attempts: 1, contextKeys: ["cvProfile", "requirements", "jdText"] },
        // Ground-bullet context: judge keys absent — the verdict was already
        // folded into the checklist before generation; grounding sees only CV.
        { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText"] },
      ],
    };
    const grade = gradeTrajectory(coveredPath);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(true);
    expect(grade.passed).toBe(true);
  });

  it("DENYLIST: all three judge-specific GROUNDING_FORBIDDEN keys fail isolation independently", () => {
    const forbiddenJudgeKeys = ["requirements", "coverageJudge", "coverageVerdicts"] as const;
    for (const key of forbiddenJudgeKeys) {
      const leaky = mutateTrace((t) => {
        // Replace a ground-bullet step so it sees the forbidden key.
        const steps = [...t.steps];
        const lastGround = [...steps].reverse().find((s) => s.skill === "ground-bullet");
        if (lastGround) {
          const idx = steps.indexOf(lastGround);
          steps[idx] = {
            skill: "ground-bullet",
            attempts: 1,
            contextKeys: ["bullet", "cvText", key],
          };
          t.steps = steps;
        }
      });
      const grade = gradeTrajectory(leaky);
      expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// §2.5 — grounding-isolation: GROUNDING_ALLOWED keys remain legal in ground-bullet
// ---------------------------------------------------------------------------

describe("gradeTrajectory: GROUNDING_ALLOWED keys are legal in ground-bullet (§2.5)", () => {
  it("ground-bullet with [bullet, cvText, confirmedAnswers] passes grounding-isolation (BC-HONESTY-03)", () => {
    const allowed: RunTrace = {
      stepCap: 20,
      terminated: "done",
      steps: [
        { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
        { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"] },
        { skill: "score", attempts: 1, contextKeys: ["requirements", "cvProfile"] },
        { skill: "derive-clarifying-questions", attempts: 1, contextKeys: ["checklist"] },
        { skill: "generate-bullet", attempts: 1, contextKeys: ["cvProfile", "requirements", "jdText"] },
        { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText", "confirmedAnswers"] },
      ],
    };
    const grade = gradeTrajectory(allowed);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(true);
  });
});
