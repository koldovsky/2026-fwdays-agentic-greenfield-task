// The skills-based tailoring agent loop (add-agent-loop design.md), split into
// two independently-capped phases (add-resume-wizard design.md §1) so a
// wizard pause can sit between analysis and generation without either phase
// starving the other's retry budget:
//   runAnalysisPhase:   parse-cv → extract-requirements → score →
//                       derive-clarifying-questions
//   runGenerationPhase: generate-bullet → ground-bullet*
// runTailoringLoop composes both back-to-back for the one-shot /api/tailor
// path (empty confirmedAnswers) — its externally observable stream stays
// wire-compatible with the pre-wizard contract: the phases' own "analysis"
// terminal event never reaches that wire (see runTailoringLoop below).
//
// Honesty is structural, not prompt politeness (BC-HONESTY-01, FR-BULLETS-03):
// each skill runs against a context built ONLY from the keys it is allowed to
// see — `ground-bullet` receives { bullet, cvText[, confirmedAnswers] } and
// physically cannot read the JD, the requirements, or the generation
// transcript. Every step is recorded as a TraceStep so real runs are gradeable
// by the same gradeTrajectory eval that guards the contract (shared/lib/evals).
//
// Fail-honest (FR-TAILOR-03, NFR-OBS-01): each step retries ≤ 2 times, then the
// owning phase stops with a calm error event — never a blank or partial result.
import { applyExportDefaults, type Bullet, type EvidenceSource } from "@/entities/bullet";
import { deriveClarifyingQuestions, type ClarifyingQuestion } from "@/entities/clarifying-question";
import { normalizeCvText, parseCvDocument, tenureYears, absMonthOf } from "@/entities/cv-profile";
import type { TailoringChecklistRow } from "@/entities/tailoring";
import { isCoverageJudgeEnabled } from "@/shared/config";
import { MAX_ATTEMPTS, type RunTrace, type SkillName, type TraceStep } from "@/shared/lib/evals";
import {
  buildCoverageJudgePrompt,
  buildExtractionPrompt,
  buildGenerationPrompt,
  buildGroundingPrompt,
  buildSeniorityPrompt,
  parseCoverageJudgeResponse,
  parseExtractionResponse,
  parseGenerationResponse,
  parseGroundingResponse,
  parseSeniorityResponse,
  type CareerStage,
  type ConfirmedAnswerEvidence,
  type DocumentAttachment,
  type GeneratedBullet,
  type GroundingVerdict,
  type LlmProvider,
} from "@/shared/lib/llm";
import {
  applyCoverageJudge,
  checklistItem,
  matchScore,
  type CoverageVerdict,
  type CvProfile,
  type Requirement,
  type ScoredRow,
} from "@/shared/lib/scoring";

import type {
  TailorErrorCode,
  TailorRunEvent,
  TailorRunPhase,
  TailoringRunInput,
  TailoringRunResult,
} from "../model/types";

/**
 * Hard cap on total steps PER PHASE — each phase is bounded by construction.
 * Two independently-capped phases is strictly safer than one shared cap
 * (neither phase can starve the other's retry budget, design.md §1). Kept as
 * one exported constant reused by both phases and shown to callers for
 * display purposes even though enforcement is now per-phase.
 */
export const STEP_CAP = 40;

/** Output-token budgets per skill (NFR-COST-01). */
const EXTRACTION_MAX_TOKENS = 2048;
// Seniority is a tiny JSON verdict ({stage, rationale}) — a small budget suffices.
const SENIORITY_MAX_TOKENS = 512;
// The coverage judge returns one small verdict per requirement in a single
// batched call (NFR-COST-01); a modest budget covers a full checklist.
const COVERAGE_JUDGE_MAX_TOKENS = 2048;
const GENERATION_MAX_TOKENS = 4096;
// Grounding runs at `high` effort (see below) whose adaptive-thinking tokens
// share this budget; 2048 leaves headroom so deliberation can't starve the
// (small) verdict JSON and emit empty text. The verdict payload itself is tiny.
const GROUNDING_MAX_TOKENS = 2048;

/**
 * Grounding is the honesty-critical second pass (FR-BULLETS-03, BC-HONESTY-01):
 * its job is to catch overclaims, so it keeps full reasoning depth. The adapter
 * default effort is `low` (fast, for the mechanical extract/generate passes),
 * but grounding is pinned to `high` here so lowering pipeline latency never
 * silently weakens overclaim detection.
 */
const GROUNDING_EFFORT = "high" as const;

export interface LoopDeps {
  readonly llm: LlmProvider;
  /**
   * Whether the coverage judge runs (improve-tailoring-quality T5).
   * Defaults to {@link isCoverageJudgeEnabled} (env `COVERAGE_JUDGE`, default
   * ON when `ANTHROPIC_API_KEY` is set, explicit `0`/`false`/`off` opts out,
   * degrades to OFF without the key). Overridable so tests exercise both paths
   * deterministically. When OFF the analysis phase makes NO judge LLM call and
   * records NO `judge-coverage` step — the trace is byte-identical to the pure
   * heuristic path (FR-CHECKLIST-01).
   */
  readonly coverageJudgeEnabled?: boolean;
}

class StepFailedError extends Error {
  constructor(skill: SkillName) {
    super(`step_failed:${skill}`);
  }
}

/**
 * Build a bounded-retry step runner scoped to one phase's own `steps` array,
 * so each phase's STEP_CAP check is independent of the other's (design.md
 * §1). `contextKeys` names exactly what the skill was allowed to see;
 * `llmPayload` is the serialized prompt (when the skill calls the LLM) so the
 * no-user-id eval can scan real payloads.
 */
function makeStepRunner(steps: TraceStep[]) {
  async function runStep<T>(
    skill: SkillName,
    contextKeys: readonly string[],
    llmPayload: string | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (steps.length >= STEP_CAP) throw new StepFailedError(skill);
    let attempts = 0;
    for (;;) {
      attempts += 1;
      try {
        const value = await fn();
        steps.push({ skill, attempts, contextKeys, ...(llmPayload ? { llmPayload } : {}) });
        return value;
      } catch (error) {
        if (attempts >= MAX_ATTEMPTS) {
          steps.push({
            skill,
            attempts,
            failed: true,
            contextKeys,
            ...(llmPayload ? { llmPayload } : {}),
          });
          throw new StepFailedError(skill);
        }
        void error; // retried — the final failure is what surfaces (NFR-OBS-01)
      }
    }
  }

  /**
   * A best-effort variant for a NON-essential auxiliary step (§3 seniority): it
   * retries up to the same bound but, on exhaustion, records NO step and
   * resolves to `undefined` instead of throwing. Recording nothing on failure
   * keeps the trace honest — a failed auxiliary must not leave a `failed` step
   * that would trip `fail-honest-termination` on an otherwise-clean run, and a
   * flaky tone signal must never sink an honest tailoring (NFR-OBS-01). A
   * successful call records a normal traced step exactly like {@link runStep}.
   */
  async function runOptional<T>(
    skill: SkillName,
    contextKeys: readonly string[],
    llmPayload: string | undefined,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    if (steps.length >= STEP_CAP) return undefined;
    let attempts = 0;
    for (;;) {
      attempts += 1;
      try {
        const value = await fn();
        steps.push({ skill, attempts, contextKeys, ...(llmPayload ? { llmPayload } : {}) });
        return value;
      } catch (error) {
        void error;
        if (attempts >= MAX_ATTEMPTS) return undefined; // best-effort: no step recorded
      }
    }
  }

  return { runStep, runOptional };
}

// --- Analysis phase: parse-cv → extract-requirements → score →
//     derive-clarifying-questions -------------------------------------------

/** One NDJSON-shaped event from {@link runAnalysisPhase}. */
export type AnalysisEvent =
  | { readonly type: "status"; readonly phase: TailorRunPhase }
  | { readonly type: "step"; readonly skill: SkillName }
  | {
      readonly type: "analysis";
      readonly checklist: readonly TailoringChecklistRow[];
      readonly matchScore: number;
      readonly cvProfile: CvProfile;
      readonly requirements: readonly Requirement[];
      /** Derived from weak checklist rows for the wizard's clarify step (FR-WIZARD-02). */
      readonly clarifyingQuestions: readonly ClarifyingQuestion[];
      /**
       * Best-effort inferred career stage (§3), a generation-tone signal only.
       * Optional: absent when the inference could not be produced this run.
       */
      readonly careerStage?: CareerStage;
    }
  | { readonly type: "error"; readonly code: TailorErrorCode };

/**
 * The payload of the terminal `analysis` event, without its `type` tag — what
 * the wizard's analyze step hands to the view, and (minus clarifyingQuestions)
 * what the view echoes back to /api/tailor/generate. Kept in sync with the
 * `analysis` AnalysisEvent member by construction.
 */
export type AnalysisResult = Omit<Extract<AnalysisEvent, { type: "analysis" }>, "type">;

/**
 * Run the analysis half of a tailoring: parse the CV, extract JD
 * requirements, score the checklist, and derive clarifying questions. Yields
 * progress events ending in a single terminal `analysis` event — that event
 * IS the phase's terminus, no trailing status follows it, so a composing
 * caller (runTailoringLoop below) can swallow just the one event type without
 * also swallowing a `status: "done"` that would otherwise land before
 * generation even starts. A failure ends the phase on the same
 * `error` + `status: "failed"` pair the rest of this file uses. Independently
 * STEP_CAP-bounded (design.md §1).
 */
export async function* runAnalysisPhase(
  deps: LoopDeps,
  input: TailoringRunInput,
): AsyncGenerator<AnalysisEvent, RunTrace, void> {
  const steps: TraceStep[] = [];
  const { runStep, runOptional } = makeStepRunner(steps);
  const trace = (terminated: RunTrace["terminated"]): RunTrace => ({
    steps,
    stepCap: STEP_CAP,
    terminated,
  });

  yield { type: "status", phase: "queued" };

  if (input.cvText.trim() === "" || input.jdText.trim() === "") {
    yield { type: "error", code: "empty_input" };
    yield { type: "status", phase: "failed" };
    return trace("failed");
  }

  yield { type: "status", phase: "processing" };

  try {
    // 1. parse-cv — deterministic, no LLM (TC-PURE-01 core reused).
    const cvProfile = await runStep("parse-cv", ["cvText"], undefined, async () => {
      const profile = normalizeCvText(input.cvText);
      if (profile.sentences.length === 0) throw new Error("empty_cv");
      return profile;
    });
    yield { type: "step", skill: "parse-cv" };

    // Tenure (§1.3): parse the CV's own role dates into total years so a
    // duration requirement ("N+ years of X") can be satisfied by real dates
    // rather than a verbatim substring. Pure + deterministic; unparseable dates
    // yield zero tenure (no false credit, BC-HONESTY-01). The parse itself
    // consumes only the CV text (contextKeys `["cvText"]`, NFR-SEC-02) and the
    // clock; contact PII from parseCvDocument is discarded here and NEVER used
    // in scoring or any LLM payload.
    const candidateTenureYears = tenureYears(parseCvDocument(input.cvText), absMonthOf(new Date()));

    // 2. extract-requirements — sees ONLY the JD (FR-JD-01/02).
    const extractionPrompt = buildExtractionPrompt({ jobDescription: input.jdText });
    const requirements = await runStep(
      "extract-requirements",
      ["jdText"],
      JSON.stringify(extractionPrompt),
      async () => {
        const raw = await deps.llm.complete(extractionPrompt, {
          maxTokens: EXTRACTION_MAX_TOKENS,
        });
        const parsed = parseExtractionResponse(raw);
        if (!parsed.ok) throw new Error(parsed.error);
        return parsed.value.requirements;
      },
    );
    yield { type: "step", skill: "extract-requirements" };

    // 2b. infer-seniority — best-effort tone signal, sees ONLY the raw CV text
    //     (§3, BC-HONESTY-01). NON-fatal: a failed tone inference must never
    //     sink an otherwise-honest tailoring (NFR-OBS-01), so runOptional
    //     records a step on success and nothing on exhaustion. The stage is
    //     NEVER threaded into grounding (BC-HONESTY-03 — see runGenerationPhase).
    const seniorityPrompt = buildSeniorityPrompt({ cvText: input.cvText });
    const careerStage = await runOptional(
      "infer-seniority",
      ["cvText"],
      JSON.stringify(seniorityPrompt),
      async () => {
        const raw = await deps.llm.complete(seniorityPrompt, {
          maxTokens: SENIORITY_MAX_TOKENS,
        });
        const parsed = parseSeniorityResponse(raw);
        if (!parsed.ok) throw new Error(parsed.error);
        return parsed.value.stage;
      },
    );
    if (careerStage !== undefined) yield { type: "step", skill: "infer-seniority" };

    // 2c. judge-coverage — FLAGGED, OPTIONAL LLM coverage judge (T5 §2.2/§2.4).
    //     Runs ONLY when the COVERAGE_JUDGE flag is on; when off, NO call is
    //     made and NO step is recorded, so a flag-off run's trace is identical
    //     to the pure heuristic path (Group 1). Sees CV text + requirements
    //     ONLY (contextKeys `["cvText", "requirements"]`, NFR-SEC-02); NEVER the
    //     JD prose beyond requirements, bullets, or a user id. Best-effort:
    //     runOptional records nothing on error/timeout, so a flaky judge
    //     fail-softs to the heuristic scorer (NFR-OBS-01). Its verdicts feed the
    //     score step below; they are NEVER threaded into grounding
    //     (BC-HONESTY-01/03 — GROUNDING_FORBIDDEN denies `requirements`/judge keys).
    const judgeEnabled = deps.coverageJudgeEnabled ?? isCoverageJudgeEnabled();
    let coverageVerdicts: readonly CoverageVerdict[] | undefined;
    if (judgeEnabled) {
      const judgePrompt = buildCoverageJudgePrompt({
        requirements,
        cvSentences: cvProfile.sentences,
      });
      coverageVerdicts = await runOptional(
        "judge-coverage",
        ["cvText", "requirements"],
        JSON.stringify(judgePrompt),
        async () => {
          const raw = await deps.llm.complete(judgePrompt, {
            maxTokens: COVERAGE_JUDGE_MAX_TOKENS,
          });
          const parsed = parseCoverageJudgeResponse(raw);
          if (!parsed.ok) throw new Error(parsed.error);
          // Map the llm-slice verdicts onto the scorer's local vocabulary at
          // the seam (scoring stays free of an llm import, TC-PURE-01).
          return parsed.value.verdicts.map((v) => ({
            requirementId: v.requirementId,
            label: v.label,
            ...(v.citation ? { citation: v.citation } : {}),
          }));
        },
      );
      if (coverageVerdicts !== undefined) yield { type: "step", skill: "judge-coverage" };
    }

    // 3. score — DETERMINISTIC (FR-CHECKLIST-01, TC-PURE-01). Reordered ahead of
    // generation (add-resume-wizard design.md §1): score only ever depended on
    // requirements + cvProfile, never on generated bullets, so the wizard can
    // show the checklist before any bullet exists. On the FLAGGED path the pure
    // heuristic rows are then re-scored over the judge's CITED evidence
    // (applyCoverageJudge, T5 §2.3): a verdict can only upgrade a `gap` when its
    // citation appears VERBATIM in the CV text AND overlaps the requirement, so
    // a fabricated or irrelevant citation buys nothing and the score can never
    // inflate from thin air (BC-HONESTY-01).
    //
    // TRACE HONESTY (NFR-OBS-01): the score step's recorded contextKeys name
    // every input it consumes. On the flag-OFF path it reads only
    // `["requirements", "cvProfile"]`, byte-identical to Group 1. On the flag-ON
    // path it ALSO consumes `coverageVerdicts` (a third, already-verified input),
    // so that dependency is recorded HONESTLY — the flag-ON trace is NOT
    // byte-identical to Group 1 and must not claim to be. The verdicts feed the
    // SCORE step only; they NEVER reach the bullet-grounding pass and no user id
    // is in scope here (NFR-SEC-02, BC-HONESTY-01/03).
    const scoreContextKeys =
      coverageVerdicts !== undefined
        ? ["requirements", "cvProfile", "coverageVerdicts"]
        : ["requirements", "cvProfile"];
    const scored = await runStep("score", scoreContextKeys, undefined, async () => {
      const heuristicRows: ScoredRow[] = requirements.map((requirement) => ({
        requirement,
        // Inferred seniority relaxes the claimed-skill rule for mid/senior
        // candidates (improve-tailoring-quality T5); undefined stays strict.
        // Parsed tenure satisfies the years side of a duration requirement whose
        // skill is already grounded (§1.3); it never credits an ungrounded skill.
        item: checklistItem(requirement, cvProfile, careerStage, candidateTenureYears),
      }));
      const rows =
        coverageVerdicts !== undefined
          ? applyCoverageJudge(heuristicRows, coverageVerdicts, cvProfile.sentences)
          : heuristicRows;
      const checklist: TailoringChecklistRow[] = rows.map((row) => ({
        requirement: row.requirement,
        item: row.item,
      }));
      return { checklist, matchScore: matchScore(checklist) };
    });
    yield { type: "step", skill: "score" };

    // 4. derive-clarifying-questions — pure, deterministic, no LLM
    // (FR-WIZARD-02). Input is narrowed to checklist rows by
    // deriveClarifyingQuestions itself (entities/clarifying-question) — this
    // phase never hands it the CV, the JD, or the match score.
    const clarifyingQuestions = await runStep(
      "derive-clarifying-questions",
      ["checklist"],
      undefined,
      async () =>
        deriveClarifyingQuestions(
          scored.checklist.map((row) => ({
            requirement: {
              text: row.requirement.text,
              keywords: row.requirement.keywords,
              importance: row.requirement.importance,
            },
            status: row.item.status,
          })),
        ),
    );
    yield { type: "step", skill: "derive-clarifying-questions" };

    yield {
      type: "analysis",
      checklist: scored.checklist,
      matchScore: scored.matchScore,
      cvProfile,
      requirements,
      clarifyingQuestions,
      ...(careerStage !== undefined ? { careerStage } : {}),
    };
    return trace("done");
  } catch (error) {
    // Retries exhausted (or cap hit): calm failure, never a partial render.
    void error;
    yield { type: "error", code: "failed" };
    yield { type: "status", phase: "failed" };
    return trace("failed");
  }
}

// --- Generation phase: generate-bullet → ground-bullet* ---------------------

export interface GenerationPhaseInput {
  readonly cvProfile: CvProfile;
  readonly requirements: readonly Requirement[];
  /**
   * buildGenerationPrompt (shared/lib/llm/prompts.ts) requires the raw JD
   * text alongside cvProfile/requirements — dropping it would silently
   * degrade tailored-bullet quality (FR-TAILOR-02). design.md's prose omits
   * this field from runGenerationPhase's signature; the one-shot
   * runTailoringLoop below costs nothing to supply it since it already holds
   * input.jdText.
   */
  readonly jobDescription: string;
  /** Second, distinctly-tagged evidence lane alongside the CV (BC-HONESTY-03). */
  readonly confirmedAnswers: readonly ConfirmedAnswerEvidence[];
  /**
   * Carried through unchanged from the analysis phase's `analysis` event so
   * this phase's own terminal `result` can be a complete TailoringRunResult
   * without recomputing (and re-tracing) the score step — design.md's prose
   * undercounts these two fields the same way it undercounts jobDescription.
   */
  readonly checklist: readonly TailoringChecklistRow[];
  readonly matchScore: number;
  /**
   * Inferred career stage from analysis (§3) — TONE calibration for generation
   * only, never threaded into the grounding pass (BC-HONESTY-03). Optional:
   * best-effort inference may be absent, leaving the baseline prompt unchanged.
   */
  readonly careerStage?: CareerStage;
  /**
   * The candidate's original CV PDF for the PAID multimodal generation pass
   * (add-premium-pdf-attach, T5). Fed to generate-bullet ONLY and NEVER to
   * ground-bullet (BC-HONESTY-01/02) — the route sets this only after a
   * server-side paid-entitlement check, never from a client flag. Absent leaves
   * the baseline text-only prompt byte-for-byte unchanged.
   */
  readonly attachments?: readonly DocumentAttachment[];
}

/** One NDJSON-shaped event from {@link runGenerationPhase}. */
export type GenerationEvent =
  | { readonly type: "status"; readonly phase: TailorRunPhase }
  | { readonly type: "step"; readonly skill: SkillName }
  | { readonly type: "result"; readonly result: TailoringRunResult }
  // Route-emitted (not produced by the pure phase generator): the persisted
  // pending-row id for the authenticated caller, so the client can pass it to the
  // export request for the server-side membership honesty gate
  // (server-side-export-gate, T5 #8, BC-HONESTY-02). The generator itself never
  // yields this — it is injected by the route after createPending.
  | { readonly type: "persisted"; readonly tailoringId: string }
  | { readonly type: "error"; readonly code: TailorErrorCode };

/**
 * Which evidence lane backs a grounded bullet, and its rendered
 * question/answer or sentence (BC-HONESTY-03). A `"user-confirmed"` verdict
 * whose evidence text doesn't match any confirmed answer in the pool is
 * unverifiable — it must NOT fall back to a `"cv"` source, since that would
 * show the user fabricated "from your CV" text that never appeared in their
 * résumé (BC-HONESTY-03 regression, loop.ts:283). Returns `undefined`
 * instead; the caller downgrades the whole bullet to `overclaim-risk`, the
 * same fail-honest direction `parseGroundingResponse` already takes for an
 * unrecognized label (NFR-OBS-01). Absent/unrecognized evidenceKind still
 * defaults to `"cv"`, matching GroundingVerdict's own tolerant contract.
 */
function buildEvidenceSource(
  evidence: string,
  evidenceKind: GroundingVerdict["evidenceKind"],
  confirmedAnswers: readonly ConfirmedAnswerEvidence[],
): EvidenceSource | undefined {
  if (evidenceKind === "user-confirmed") {
    const match = confirmedAnswers.find((c) => c.answer === evidence);
    return match !== undefined
      ? { kind: "user-confirmed", question: match.question, answer: match.answer }
      : undefined;
  }
  return { kind: "cv", sentence: evidence };
}

/**
 * Run the generation half of a tailoring: generate bullets, then
 * independently ground each one (BC-HONESTY-01). Yields progress events
 * ending in a terminal `result` + `status: "done"` pair (mirroring the
 * one-shot loop's original tail exactly), or a calm `error` +
 * `status: "failed"` pair. Independently STEP_CAP-bounded (design.md §1).
 */
export async function* runGenerationPhase(
  deps: LoopDeps,
  input: GenerationPhaseInput,
): AsyncGenerator<GenerationEvent, RunTrace, void> {
  const { cvProfile, requirements, jobDescription, confirmedAnswers, checklist, matchScore: score, careerStage, attachments } = input;
  const steps: TraceStep[] = [];
  const { runStep } = makeStepRunner(steps);
  const trace = (terminated: RunTrace["terminated"]): RunTrace => ({
    steps,
    stepCap: STEP_CAP,
    terminated,
  });
  // Only named in a step's contextKeys when actually supplied, so a
  // confirmedAnswers-free run (the one-shot path) records the exact same
  // contextKeys as before the wizard split.
  const confirmedAnswersKey: readonly string[] =
    confirmedAnswers.length > 0 ? ["confirmedAnswers"] : [];
  // Named in generate-bullet's contextKeys only when a stage is actually
  // supplied, so a stage-free run traces identically to before §3. It is
  // deliberately NEVER added to any ground-bullet step (BC-HONESTY-03).
  const careerStageKey: readonly string[] =
    careerStage !== undefined ? ["careerStage"] : [];
  // Named in generate-bullet's contextKeys only when the paid PDF is actually
  // attached, so a text-only run traces identically to before T5. It is
  // deliberately NEVER added to any ground-bullet step, and it is on the
  // grounding-forbidden denylist (BC-HONESTY-01/02, evals/trajectory.ts).
  const hasAttachment = attachments !== undefined && attachments.length > 0;
  const attachmentKey: readonly string[] = hasAttachment ? ["attachment"] : [];

  try {
    // 1. generate-bullet — pass 1 (FR-TAILOR-02).
    const generationPrompt = buildGenerationPrompt({
      cvProfile,
      requirements,
      jobDescription,
      confirmedAnswers,
      ...(careerStage !== undefined ? { careerStage } : {}),
      ...(hasAttachment ? { attachments } : {}),
    });
    // The traced payload NEVER carries the base64 PDF bytes (NFR-SEC-01): it
    // records only that an attachment of N bytes was present, so the honesty /
    // no-user-id evals still scan the real text payload without a document
    // dump ever reaching a trace, log, or persisted record.
    const tracedGenerationPayload = JSON.stringify({
      messages: generationPrompt.messages.map((m) =>
        m.attachments && m.attachments.length > 0
          ? {
              role: m.role,
              content: m.content,
              attachments: m.attachments.map((a) => ({
                kind: a.kind,
                mediaType: a.mediaType,
                base64Length: a.dataBase64.length,
              })),
            }
          : m,
      ),
    });
    const generated = await runStep(
      "generate-bullet",
      ["cvProfile", "requirements", "jdText", ...confirmedAnswersKey, ...careerStageKey, ...attachmentKey],
      tracedGenerationPayload,
      async () => {
        const raw = await deps.llm.complete(generationPrompt, {
          maxTokens: GENERATION_MAX_TOKENS,
        });
        const parsed = parseGenerationResponse(raw);
        if (!parsed.ok) throw new Error(parsed.error);
        if (parsed.value.bullets.length === 0) throw new Error("no_bullets");
        return parsed.value.bullets;
      },
    );
    yield { type: "step", skill: "generate-bullet" };

    // 2. ground-bullet per bullet — pass 2, context-isolated (BC-HONESTY-01):
    //    the prompt is built from { bullet, cvText[, confirmedAnswers] } and
    //    nothing else — never the JD, the requirements, or the generation
    //    transcript.
    const verdicts: GroundingVerdict[] = [];
    for (const bullet of generated) {
      const groundingCtx: { bullet: GeneratedBullet; cvText: readonly string[] } = {
        bullet,
        cvText: cvProfile.sentences,
      };
      const groundingPrompt = buildGroundingPrompt({
        bullets: [groundingCtx.bullet],
        cvSentences: groundingCtx.cvText,
        confirmedAnswers,
      });
      const verdict = await runStep(
        "ground-bullet",
        [...Object.keys(groundingCtx), ...confirmedAnswersKey],
        JSON.stringify(groundingPrompt),
        async () => {
          const raw = await deps.llm.complete(groundingPrompt, {
            maxTokens: GROUNDING_MAX_TOKENS,
            effort: GROUNDING_EFFORT,
          });
          const parsed = parseGroundingResponse(raw);
          if (!parsed.ok) throw new Error(parsed.error);
          const found = parsed.value.verdicts.find((v) => v.bulletId === bullet.id);
          if (found === undefined) throw new Error("verdict_missing");
          return found;
        },
      );
      verdicts.push(verdict);
      yield { type: "step", skill: "ground-bullet" };
    }

    // Assemble bullets; overclaim-risk excluded from export by default
    // (FR-BULLETS-02, BC-HONESTY-02).
    const bullets: Bullet[] = applyExportDefaults(
      generated.map((g) => {
        const verdict = verdicts.find((v) => v.bulletId === g.id);
        const claimedGrounding = verdict?.label ?? "overclaim-risk";
        const source =
          claimedGrounding === "grounded" && verdict?.evidence !== undefined
            ? buildEvidenceSource(verdict.evidence, verdict.evidenceKind, confirmedAnswers)
            : undefined;
        // An unverifiable user-confirmed claim (buildEvidenceSource above
        // returned undefined) must not surface as "grounded" with no
        // source — fail honest by downgrading, never show a bare claim
        // (BC-HONESTY-03).
        const grounding =
          claimedGrounding === "grounded" && source === undefined
            ? "overclaim-risk"
            : claimedGrounding;
        return {
          id: g.id,
          text: g.text,
          grounding,
          ...(source ? { source } : {}),
          includedInExport: false, // seeded by applyExportDefaults
        };
      }),
    );

    const result: TailoringRunResult = {
      checklist,
      bullets,
      matchScore: score,
      ...(careerStage !== undefined ? { careerStage } : {}),
    };
    yield { type: "result", result };
    yield { type: "status", phase: "done" };
    return trace("done");
  } catch (error) {
    // Retries exhausted (or cap hit): calm failure, never a partial result.
    void error;
    yield { type: "error", code: "failed" };
    yield { type: "status", phase: "failed" };
    return trace("failed");
  }
}

// --- One-shot composition (existing add-agent-loop entry point) -------------

/**
 * Run one tailoring end to end as an async generator: composes
 * {@link runAnalysisPhase} and {@link runGenerationPhase} back-to-back with an
 * empty confirmed-answers pool (design.md §1) and streams events for the
 * client (FR-TAILOR-01/02). The analysis phase's own `analysis` terminal
 * event is internal bookkeeping only — it is swallowed here, never forwarded,
 * so /api/tailor's NDJSON wire contract stays exactly what it was before the
 * split (queued → processing → steps* → result → done, or a calm error);
 * only the new dedicated /api/tailor/analyze and /api/tailor/generate routes
 * (built on top of the two phases above) ever expose "analysis"/"result" as
 * their own stream terminal event. Returns the merged RunTrace (analysis
 * steps first) for evals/observability.
 */
export async function* runTailoringLoop(
  deps: LoopDeps,
  input: TailoringRunInput,
): AsyncGenerator<TailorRunEvent, RunTrace, void> {
  const analysis = runAnalysisPhase(deps, input);
  let analysisResult: Extract<AnalysisEvent, { type: "analysis" }> | undefined;

  let step = await analysis.next();
  while (!step.done) {
    const event = step.value;
    if (event.type === "analysis") {
      analysisResult = event; // swallowed — see the doc comment above.
    } else {
      yield event;
    }
    step = await analysis.next();
  }
  const analysisTrace = step.value;

  // analysisTrace.terminated === "failed" already implies this in practice —
  // narrowing on the event itself keeps this honest (NFR-OBS-01) rather than
  // asserting a value TS can't otherwise prove is present.
  if (analysisTrace.terminated === "failed" || analysisResult === undefined) {
    return { steps: analysisTrace.steps, stepCap: STEP_CAP, terminated: "failed" };
  }

  const generation = runGenerationPhase(deps, {
    cvProfile: analysisResult.cvProfile,
    requirements: analysisResult.requirements,
    jobDescription: input.jdText,
    confirmedAnswers: [],
    checklist: analysisResult.checklist,
    matchScore: analysisResult.matchScore,
    ...(analysisResult.careerStage !== undefined
      ? { careerStage: analysisResult.careerStage }
      : {}),
  });

  let genStep = await generation.next();
  while (!genStep.done) {
    yield genStep.value;
    genStep = await generation.next();
  }
  const generationTrace = genStep.value;

  return {
    steps: [...analysisTrace.steps, ...generationTrace.steps],
    stepCap: STEP_CAP,
    terminated: generationTrace.terminated,
  };
}
