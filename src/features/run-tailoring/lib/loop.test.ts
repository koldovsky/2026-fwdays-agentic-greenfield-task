// Behavioral + honesty tests for the tailoring loop, run against a fake provider
// (no ANTHROPIC_API_KEY, no network). These turn the loop's structural claims
// into green tests:
//   • end-to-end happy path (FR-TAILOR-01, FR-BULLETS-01)
//   • grounding context isolation — pass 2 never sees the JD / requirements /
//     generation transcript (BC-HONESTY-01 / FR-BULLETS-03), proven on BOTH the
//     provider calls and the recorded RunTrace, and via the existing
//     gradeTrajectory eval run over the REAL run (add-agent-loop task 4.1)
//   • overclaim-risk excluded from export by default (FR-BULLETS-02, BC-HONESTY-02)
//   • fail-honest: retries bounded, then a calm error, never a partial result
//     (FR-TAILOR-03, NFR-OBS-01)
//   • score is deterministic and calls no LLM (FR-CHECKLIST-01, TC-PURE-01)
import { exportBullets } from "@/entities/bullet";
import { gradeTrajectory, MAX_ATTEMPTS, type RunTrace } from "@/shared/lib/evals";
import {
  createFakeProvider,
  fakeExtraction,
  fakeGeneration,
  fakeGrounding,
  fakeSeniority,
} from "@/shared/lib/llm/testing/fake-provider";
import { describe, expect, it } from "vitest";

import type { TailorRunEvent, TailoringRunInput, TailoringRunResult } from "../model/types";
import {
  runGenerationPhase,
  runTailoringLoop,
  type GenerationEvent,
  type GenerationPhaseInput,
  type LoopDeps,
} from "./loop";

// --- Fixtures with unique sentinels so leaks are unambiguous ----------------
const CV_TEXT = [
  "Навички: React, TypeScript",
  "CVSENTINEL: побудував платіжну систему і масштабував команду до десяти інженерів",
].join("\n");
const JD_TEXT = "JDSENTINEL: шукаємо React інженера з досвідом платіжних систем";
const INPUT: TailoringRunInput = { cvText: CV_TEXT, jdText: JD_TEXT };

const CV_EVIDENCE =
  "CVSENTINEL: побудував платіжну систему і масштабував команду до десяти інженерів";

/** A fully-grounded single-bullet run — the default happy script. */
function groundedScript() {
  return {
    extraction: fakeExtraction([
      { id: "r1", text: "REQSENTINEL React досвід", importance: "must-have", keywords: ["react"] },
    ]),
    seniority: fakeSeniority("mid"),
    generation: fakeGeneration([
      { id: "b1", text: "Побудував платіжну систему на React.", sourceSentence: CV_EVIDENCE },
    ]),
    grounding: fakeGrounding([{ bulletId: "b1", label: "grounded", evidence: CV_EVIDENCE }]),
  };
}

async function drive(
  deps: LoopDeps,
  input: TailoringRunInput,
): Promise<{ events: TailorRunEvent[]; trace: RunTrace }> {
  const gen = runTailoringLoop(deps, input);
  const events: TailorRunEvent[] = [];
  let step = await gen.next();
  while (!step.done) {
    events.push(step.value);
    step = await gen.next();
  }
  return { events, trace: step.value };
}

function resultOf(events: readonly TailorRunEvent[]): TailoringRunResult | undefined {
  const event = events.find((e) => e.type === "result");
  return event?.type === "result" ? event.result : undefined;
}

describe("runTailoringLoop", () => {
  it("produces a grounded, scored result end to end (FR-TAILOR-01, FR-BULLETS-01)", async () => {
    const provider = createFakeProvider(groundedScript());
    const { events, trace } = await drive({ llm: provider }, INPUT);

    const skills = trace.steps.map((s) => s.skill);
    // Score (and deriving clarifying questions) now runs right after
    // extraction, ahead of generation/grounding (add-resume-wizard
    // design.md §1) — score never depended on generated bullets.
    // infer-seniority (add-tailoring-intelligence §3) runs after extraction as a
    // best-effort tone signal, ahead of the pure analysis steps.
    expect(skills).toEqual([
      "parse-cv",
      "extract-requirements",
      "infer-seniority",
      "score",
      "derive-clarifying-questions",
      "generate-bullet",
      "ground-bullet",
    ]);
    expect(trace.terminated).toBe("done");
    expect(events.at(-1)).toEqual({ type: "status", phase: "done" });

    const result = resultOf(events);
    expect(result).toBeDefined();
    expect(result?.checklist).toHaveLength(1);
    expect(result?.bullets[0]).toMatchObject({ grounding: "grounded", includedInExport: true });
    expect(result?.matchScore).toBeGreaterThanOrEqual(0);
    expect(result?.matchScore).toBeLessThanOrEqual(100);
  });

  it("withholds JD/requirements/generation from the grounding pass (BC-HONESTY-01)", async () => {
    const provider = createFakeProvider(groundedScript());
    const { trace } = await drive({ llm: provider }, INPUT);

    // (a) On the provider calls: the grounding prompt carries the CV evidence
    //     but neither the JD nor the requirement text.
    const groundingCalls = provider.calls.filter((c) => c.phase === "grounding");
    expect(groundingCalls).toHaveLength(1);
    for (const call of groundingCalls) {
      expect(call.payload).toContain("CVSENTINEL");
      expect(call.payload).not.toContain("JDSENTINEL");
      expect(call.payload).not.toContain("REQSENTINEL");
    }

    // (b) On the recorded trace: each ground-bullet step saw only {bullet,cvText}
    //     and its serialized payload never carried the JD/requirement sentinels.
    const groundSteps = trace.steps.filter((s) => s.skill === "ground-bullet");
    expect(groundSteps.length).toBeGreaterThan(0);
    for (const step of groundSteps) {
      expect([...step.contextKeys].sort()).toEqual(["bullet", "cvText"]);
      expect(step.llmPayload).not.toContain("JDSENTINEL");
      expect(step.llmPayload).not.toContain("REQSENTINEL");
    }

    // (c) The existing trajectory eval, run over the REAL run, passes its whole
    //     honesty contract (order, two-pass, isolation, bounds) — task 4.1.
    const grade = gradeTrajectory(trace);
    expect(grade.passed).toBe(true);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(true);
    expect(grade.checks.find((c) => c.id === "two-pass-grounding")?.ok).toBe(true);
  });

  it("threads the inferred career stage into generation but NEVER into grounding (§3.5/§3.6, BC-HONESTY-03)", async () => {
    const provider = createFakeProvider(groundedScript());
    const { events, trace } = await drive({ llm: provider }, INPUT);

    // The stage rides the result (tags the tailoring).
    expect(resultOf(events)?.careerStage).toBe("mid");

    // generate-bullet's recorded context names the stage; ground-bullet's never does.
    const genStep = trace.steps.find((s) => s.skill === "generate-bullet");
    const groundStep = trace.steps.find((s) => s.skill === "ground-bullet");
    expect(genStep?.contextKeys).toContain("careerStage");
    expect(groundStep?.contextKeys).not.toContain("careerStage");

    // On the wire: the grounding prompt never carries a stage label.
    for (const call of provider.calls.filter((c) => c.phase === "grounding")) {
      for (const label of ["джуніор", "мідл", "сеньйор", "Рівень кандидата"]) {
        expect(call.payload).not.toContain(label);
      }
    }

    // The whole honesty contract still holds on the real run.
    expect(gradeTrajectory(trace).passed).toBe(true);
  });

  it("stays honest when seniority inference fails: no stage, no failed step, run still completes (§3, NFR-OBS-01)", async () => {
    // Best-effort: seniority throws every attempt, but the tailoring completes.
    const provider = createFakeProvider({ ...groundedScript(), throwOn: ["seniority"] });
    const { events, trace } = await drive({ llm: provider }, INPUT);

    expect(events.at(-1)).toEqual({ type: "status", phase: "done" });
    expect(trace.terminated).toBe("done");
    // No infer-seniority step recorded (best-effort records nothing on failure),
    // so no `failed` step trips fail-honest-termination.
    expect(trace.steps.some((s) => s.skill === "infer-seniority")).toBe(false);
    expect(trace.steps.some((s) => s.failed === true)).toBe(false);
    // Stage absent → generation ran with no stage, and it's not on the result.
    expect(resultOf(events)?.careerStage).toBeUndefined();
    expect(gradeTrajectory(trace).passed).toBe(true);
  });

  it("excludes an overclaim-risk bullet from export by default (FR-BULLETS-02, BC-HONESTY-02)", async () => {
    const provider = createFakeProvider({
      extraction: fakeExtraction([
        { id: "r1", text: "Керував великою командою", importance: "must-have", keywords: ["лідерство"] },
      ]),
      seniority: fakeSeniority("senior"),
      generation: fakeGeneration([{ id: "b1", text: "Керував командою з 50 інженерів." }]),
      // No CV evidence for the claim → the verifier flags it.
      grounding: fakeGrounding([{ bulletId: "b1", label: "overclaim-risk" }]),
    });
    const { events } = await drive({ llm: provider }, INPUT);

    const result = resultOf(events);
    expect(result?.bullets[0]).toMatchObject({
      grounding: "overclaim-risk",
      includedInExport: false,
    });
    expect(result?.bullets[0].source).toBeUndefined();
    // Nothing overclaimed ends up in the export selection.
    expect(exportBullets(result?.bullets ?? [])).toHaveLength(0);
  });

  it("fails honest: bounded retries, calm error, no partial result (FR-TAILOR-03, NFR-OBS-01)", async () => {
    const provider = createFakeProvider({ throwOn: ["extraction"] });
    const { events, trace } = await drive({ llm: provider }, INPUT);

    // No result was rendered; the stream ends on a coded error + failed status.
    expect(resultOf(events)).toBeUndefined();
    expect(events).toContainEqual({ type: "error", code: "failed" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(trace.terminated).toBe("failed");

    // The failing skill retried up to the bound, then gave up (no infinite loop).
    const failed = trace.steps.find((s) => s.failed === true);
    expect(failed?.skill).toBe("extract-requirements");
    expect(failed?.attempts).toBe(MAX_ATTEMPTS);
    expect(provider.calls.filter((c) => c.phase === "extraction")).toHaveLength(MAX_ATTEMPTS);

    // gradeTrajectory agrees the failure was handled honestly.
    const grade = gradeTrajectory(trace);
    expect(grade.checks.find((c) => c.id === "fail-honest-termination")?.ok).toBe(true);
    expect(grade.checks.find((c) => c.id === "retries-bounded")?.ok).toBe(true);
  });

  it("scores deterministically and calls no LLM in the score/parse steps (FR-CHECKLIST-01, TC-PURE-01)", async () => {
    const first = createFakeProvider(groundedScript());
    const second = createFakeProvider(groundedScript());
    const runA = await drive({ llm: first }, INPUT);
    const runB = await drive({ llm: second }, INPUT);

    const a = resultOf(runA.events);
    const b = resultOf(runB.events);
    expect(a?.matchScore).toBe(b?.matchScore);
    expect(a?.checklist).toEqual(b?.checklist);

    // Exactly one LLM call per LLM skill (extract, seniority, generate, ground)
    // — parse-cv and score make zero calls, proving scoring is pure.
    const phases = first.calls.map((c) => c.phase);
    expect(phases).toEqual(["extraction", "seniority", "generation", "grounding"]);

    // At the trace level: the pure steps record no LLM payload at all (TC-PURE-01).
    const pureSteps = runA.trace.steps.filter(
      (s) => s.skill === "parse-cv" || s.skill === "score",
    );
    expect(pureSteps).toHaveLength(2);
    for (const step of pureSteps) expect(step.llmPayload).toBeUndefined();
  });

  it("never routes an out-of-band user id into an LLM payload (NFR-SEC-02)", async () => {
    // The loop's only input is { cvText, jdText } — there is no channel for an
    // authenticated user's id to reach a prompt. Prove it positively by scanning
    // every real payload (provider call + recorded trace step) for a caller-held
    // id sentinel deliberately absent from the inputs. gradeTrajectory's
    // no-user-id check is vacuous here (runTailoringLoop never sets trace.userId),
    // so a direct payload scan is the honest assertion, not trace.userId.
    const USER_ID = "user_a1b2c3_SECRET";
    expect(INPUT.cvText).not.toContain(USER_ID);
    expect(INPUT.jdText).not.toContain(USER_ID);

    const provider = createFakeProvider(groundedScript());
    const { trace } = await drive({ llm: provider }, INPUT);

    expect(provider.calls.length).toBeGreaterThan(0);
    for (const call of provider.calls) expect(call.payload).not.toContain(USER_ID);
    for (const step of trace.steps) {
      if (step.llmPayload !== undefined) expect(step.llmPayload).not.toContain(USER_ID);
    }
  });
});

async function driveGeneration(
  deps: LoopDeps,
  input: GenerationPhaseInput,
): Promise<{ events: GenerationEvent[]; trace: RunTrace }> {
  const gen = runGenerationPhase(deps, input);
  const events: GenerationEvent[] = [];
  let step = await gen.next();
  while (!step.done) {
    events.push(step.value);
    step = await gen.next();
  }
  return { events, trace: step.value };
}

describe("runGenerationPhase — confirmed-answer evidence (BC-HONESTY-03)", () => {
  it("tags a bullet grounded in a confirmed wizard answer, distinct from CV evidence", async () => {
    const QUESTION =
      "Вимога: REQSENTINEL React досвід. Чи є у вас практичний досвід з react? Розкажіть коротко про конкретний випадок";
    const ANSWER =
      "ANSWERSENTINEL: будував платіжний віджет на React для попереднього роботодавця";
    const confirmedAnswers = [{ question: QUESTION, answer: ANSWER }];

    const provider = createFakeProvider({
      generation: fakeGeneration([
        { id: "b1", text: "Розробив платіжний віджет на React." },
      ]),
      grounding: fakeGrounding([
        { bulletId: "b1", label: "grounded", evidence: ANSWER, evidenceKind: "user-confirmed" },
      ]),
    });

    const { events, trace } = await driveGeneration(
      { llm: provider },
      {
        cvProfile: { skills: [], sentences: [] },
        requirements: [],
        jobDescription: JD_TEXT,
        confirmedAnswers,
        checklist: [],
        matchScore: 0,
      },
    );

    const resultEvent = events.find((e) => e.type === "result");
    expect(resultEvent?.type).toBe("result");
    const bullet = resultEvent?.type === "result" ? resultEvent.result.bullets[0] : undefined;
    expect(bullet).toMatchObject({ grounding: "grounded", includedInExport: true });
    expect(bullet?.source).toEqual({ kind: "user-confirmed", question: QUESTION, answer: ANSWER });

    // The recorded trace names "confirmedAnswers" in the ground-bullet step's
    // contextKeys, and gradeTrajectory must recognize this as the legitimate
    // widened isolation lane (BC-HONESTY-03), not a leak.
    const groundStep = trace.steps.find((s) => s.skill === "ground-bullet");
    expect(groundStep?.contextKeys).toContain("confirmedAnswers");
    const grade = gradeTrajectory(trace);
    expect(grade.checks.find((c) => c.id === "grounding-isolation")).toMatchObject({ ok: true });
  });

  it("never mislabels an unverifiable user-confirmed claim as CV-sourced (BC-HONESTY-03 regression)", async () => {
    // Regression for loop.ts:283 — a "grounded"/"user-confirmed" verdict whose
    // evidence text is a paraphrase (not a byte-match) of the stored answer
    // must NOT fall back to `{ kind: "cv", sentence: evidence }`: that would
    // show fabricated "from your CV" text against an empty CV. It must fail
    // honest instead — downgraded to overclaim-risk, no source at all.
    const QUESTION = "Чи маєте ви досвід менторства?";
    const ANSWER = "Так, менторив трьох джуніорів протягом року.";
    const confirmedAnswers = [{ question: QUESTION, answer: ANSWER }];
    const PARAPHRASED_EVIDENCE = "Кандидат згадує досвід менторства кількох джуніорів.";

    const provider = createFakeProvider({
      generation: fakeGeneration([{ id: "b1", text: "Менторив джуніор-розробників." }]),
      grounding: fakeGrounding([
        {
          bulletId: "b1",
          label: "grounded",
          evidence: PARAPHRASED_EVIDENCE,
          evidenceKind: "user-confirmed",
        },
      ]),
    });

    const { events } = await driveGeneration(
      { llm: provider },
      {
        cvProfile: { skills: [], sentences: [] }, // empty CV — nothing to source from
        requirements: [],
        jobDescription: JD_TEXT,
        confirmedAnswers,
        checklist: [],
        matchScore: 0,
      },
    );

    const resultEvent = events.find((e) => e.type === "result");
    expect(resultEvent?.type).toBe("result");
    const bullet = resultEvent?.type === "result" ? resultEvent.result.bullets[0] : undefined;
    expect(bullet?.grounding).toBe("overclaim-risk");
    expect(bullet?.source).toBeUndefined();
  });
});
