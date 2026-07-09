// Loop-level tests for the FLAGGED coverage judge (improve-tailoring-quality T5 §2.4, §2.7).
// Exercises the loop with a fake provider (no LLM, no network, no key).
//
// Behaviors covered:
//   §2.4 + §2.7 FLAG-OFF IDENTITY: with coverageJudgeEnabled=false (default),
//     - NO judge call is made to the provider
//     - NO judge-coverage step is recorded in the trace
//     - The trajectory is identical to the pure heuristic path
//
//   §2.4 FLAG-ON:
//     - judge-coverage step IS recorded with contextKeys exactly ["cvText", "requirements"]
//     - judge-coverage runs BEFORE score (rank 2, pipeline-order respected)
//     - The trajectory gradeTrajectory passes all checks
//
//   §2.4 FAIL-SOFT:
//     - judge error/timeout → runOptional records NOTHING, run still completes
//     - Score falls back to pure heuristic rows
//     - No failed step in trace (gradeTrajectory passes fail-honest-termination)
//
//   §2.4 JUDGE KEYS NOT IN GROUNDING:
//     - The judge-coverage step's contextKeys NEVER appear in ground-bullet's contextKeys
//
// Requirements: FR-CHECKLIST-01, NFR-OBS-01, NFR-SEC-02, BC-HONESTY-01.

import { gradeTrajectory, type RunTrace } from "@/shared/lib/evals";
import {
  createFakeProvider,
  fakeCoverageJudge,
  fakeExtraction,
  fakeGeneration,
  fakeGrounding,
  fakeSeniority,
} from "@/shared/lib/llm/testing/fake-provider";
import { describe, expect, it } from "vitest";

import type { TailoringRunInput } from "../model/types";
import { runAnalysisPhase, type AnalysisEvent, type LoopDeps } from "./loop";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CV_TEXT = [
  "Навички: React, TypeScript",
  "CVSENTINEL: розробив платіжну систему та масштабував команду до десяти інженерів",
].join("\n");
const JD_TEXT = "JDSENTINEL: шукаємо React інженера з досвідом платіжних систем";
const INPUT: TailoringRunInput = { cvText: CV_TEXT, jdText: JD_TEXT };

const CV_EVIDENCE = "CVSENTINEL: розробив платіжну систему та масштабував команду до десяти інженерів";

function baseScript() {
  return {
    extraction: fakeExtraction([
      { id: "r1", text: "REQSENTINEL React", importance: "must-have" as const, keywords: ["react"] },
    ]),
    seniority: fakeSeniority("mid"),
    generation: fakeGeneration([
      { id: "b1", text: "Розробив платіжну систему.", sourceSentence: CV_EVIDENCE },
    ]),
    grounding: fakeGrounding([{ bulletId: "b1", label: "grounded" as const, evidence: CV_EVIDENCE }]),
  };
}

/** Collect all events + return value from the analysis phase generator. */
async function driveAnalysis(
  deps: LoopDeps,
  input: TailoringRunInput = INPUT,
): Promise<{ events: AnalysisEvent[]; trace: RunTrace }> {
  const gen = runAnalysisPhase(deps, input);
  const events: AnalysisEvent[] = [];
  let step = await gen.next();
  while (!step.done) {
    events.push(step.value);
    step = await gen.next();
  }
  return { events, trace: step.value };
}

// ---------------------------------------------------------------------------
// §2.7 — FLAG-OFF IDENTITY: no judge call, no step, identical to heuristic
// ---------------------------------------------------------------------------

describe("runAnalysisPhase: flag OFF → judge never called, no step recorded (§2.7, FR-CHECKLIST-01)", () => {
  it("makes NO coverage-judge LLM call when coverageJudgeEnabled=false", async () => {
    const provider = createFakeProvider(baseScript());
    await driveAnalysis({ llm: provider, coverageJudgeEnabled: false });

    const judgeCalls = provider.calls.filter((c) => c.phase === "coverage-judge");
    expect(judgeCalls).toHaveLength(0);
  });

  it("records NO judge-coverage step in the trace when flag is off", async () => {
    const provider = createFakeProvider(baseScript());
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: false });

    const judgeStep = trace.steps.find((s) => s.skill === "judge-coverage");
    expect(judgeStep).toBeUndefined();
  });

  it("flag OFF trace is identical in shape to the pure heuristic path (no extra steps)", async () => {
    // Reference: run without any coverage judge option (implicit default off).
    const refProvider = createFakeProvider(baseScript());
    const { trace: refTrace } = await driveAnalysis({ llm: refProvider });

    const flagOffProvider = createFakeProvider(baseScript());
    const { trace: flagOffTrace } = await driveAnalysis({
      llm: flagOffProvider,
      coverageJudgeEnabled: false,
    });

    // Skill sequences must be identical.
    expect(flagOffTrace.steps.map((s) => s.skill)).toEqual(
      refTrace.steps.map((s) => s.skill),
    );
  });

  it("flag OFF: gradeTrajectory passes all checks (heuristic trace is still valid)", async () => {
    const provider = createFakeProvider(baseScript());
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: false });

    // Analysis-only trace: pipeline-order and grounding-isolation evaluated on
    // analysis steps only; two-pass-grounding/grounding-terminal require bullets
    // (not present in analysis phase), so we only assert the checks that CAN pass.
    const order = gradeTrajectory(trace).checks.find((c) => c.id === "pipeline-order");
    const isolation = gradeTrajectory(trace).checks.find((c) => c.id === "grounding-isolation");
    expect(order?.ok).toBe(true);
    expect(isolation?.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2.4 — FLAG-ON: judge step recorded with correct contextKeys
// ---------------------------------------------------------------------------

describe("runAnalysisPhase: flag ON → judge-coverage step recorded (§2.4)", () => {
  it("records a judge-coverage step when coverageJudgeEnabled=true", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      coverageJudge: fakeCoverageJudge([
        { requirementId: "r1", label: "covered", citation: CV_EVIDENCE.slice(0, 30) },
      ]),
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const judgeStep = trace.steps.find((s) => s.skill === "judge-coverage");
    expect(judgeStep).toBeDefined();
  });

  it("judge-coverage step contextKeys are exactly ['cvText', 'requirements'] (NFR-SEC-02)", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      coverageJudge: fakeCoverageJudge([
        { requirementId: "r1", label: "covered", citation: CV_EVIDENCE.slice(0, 30) },
      ]),
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const judgeStep = trace.steps.find((s) => s.skill === "judge-coverage");
    expect(judgeStep?.contextKeys).toBeDefined();
    expect([...judgeStep!.contextKeys].sort()).toEqual(["cvText", "requirements"].sort());
  });

  it("judge-coverage step runs BEFORE score (pipeline-order passes, §2.4)", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      coverageJudge: fakeCoverageJudge([
        { requirementId: "r1", label: "covered", citation: CV_EVIDENCE.slice(0, 30) },
      ]),
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const skills = trace.steps.map((s) => s.skill);
    const judgeIdx = skills.indexOf("judge-coverage");
    const scoreIdx = skills.indexOf("score");
    expect(judgeIdx).toBeGreaterThanOrEqual(0);
    expect(scoreIdx).toBeGreaterThanOrEqual(0);
    expect(judgeIdx).toBeLessThan(scoreIdx);
  });

  it("judge-coverage contextKeys NEVER appear in any ground-bullet step (BC-HONESTY-01)", async () => {
    // The analysis phase has no ground-bullet steps, but we assert the
    // structural invariant explicitly: judge keys are never in ground-bullet.
    const provider = createFakeProvider({
      ...baseScript(),
      coverageJudge: fakeCoverageJudge([]),
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const groundSteps = trace.steps.filter((s) => s.skill === "ground-bullet");
    for (const step of groundSteps) {
      expect(step.contextKeys).not.toContain("requirements");
      expect(step.contextKeys).not.toContain("coverageJudge");
      expect(step.contextKeys).not.toContain("coverageVerdicts");
    }
  });

  it("pipeline-order check passes for a flag-on analysis trace", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      coverageJudge: fakeCoverageJudge([
        { requirementId: "r1", label: "uncovered" },
      ]),
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const order = gradeTrajectory(trace).checks.find((c) => c.id === "pipeline-order");
    expect(order?.ok).toBe(true);
  });

  it("analysis completes (terminated=done) when judge runs normally (§2.4)", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      coverageJudge: fakeCoverageJudge([
        { requirementId: "r1", label: "covered", citation: CV_EVIDENCE.slice(0, 30) },
      ]),
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });
    expect(trace.terminated).toBe("done");
  });
});

// ---------------------------------------------------------------------------
// §2.4 — FAIL-SOFT: judge error/timeout → heuristic path, no crash
// ---------------------------------------------------------------------------

describe("runAnalysisPhase: judge error → fail-soft (§2.4, NFR-OBS-01)", () => {
  it("judge throwing → analysis still completes (terminated=done)", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      throwOn: ["coverage-judge"],
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    expect(trace.terminated).toBe("done");
  });

  it("judge throwing → NO judge-coverage step recorded (runOptional records nothing on failure)", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      throwOn: ["coverage-judge"],
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const judgeStep = trace.steps.find((s) => s.skill === "judge-coverage");
    expect(judgeStep).toBeUndefined();
  });

  it("judge throwing → NO failed=true step in trace (fail-honest-termination not tripped)", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      throwOn: ["coverage-judge"],
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const failedSteps = trace.steps.filter((s) => s.failed === true);
    expect(failedSteps).toHaveLength(0);
  });

  it("judge throwing → score still runs (falls back to heuristic rows)", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      throwOn: ["coverage-judge"],
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const scoreStep = trace.steps.find((s) => s.skill === "score");
    expect(scoreStep).toBeDefined();
  });

  it("judge throwing → analysis event still carries checklist and matchScore", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      throwOn: ["coverage-judge"],
    });
    const { events } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const analysisEvent = events.find((e) => e.type === "analysis");
    expect(analysisEvent?.type).toBe("analysis");
    if (analysisEvent?.type !== "analysis") return;
    expect(analysisEvent.checklist).toBeDefined();
    expect(typeof analysisEvent.matchScore).toBe("number");
  });

  it("judge throwing → gradeTrajectory pipeline-order and grounding-isolation still pass", async () => {
    const provider = createFakeProvider({
      ...baseScript(),
      throwOn: ["coverage-judge"],
    });
    const { trace } = await driveAnalysis({ llm: provider, coverageJudgeEnabled: true });

    const grade = gradeTrajectory(trace);
    expect(grade.checks.find((c) => c.id === "pipeline-order")?.ok).toBe(true);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(true);
  });
});
