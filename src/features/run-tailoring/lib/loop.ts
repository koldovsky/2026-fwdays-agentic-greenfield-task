// The skills-based tailoring agent loop (add-agent-loop design.md). A bounded,
// deterministic plan/act/observe sequence over discrete skills:
//   parse-cv → extract-requirements → generate-bullet → ground-bullet* → score
//
// Honesty is structural, not prompt politeness (BC-HONESTY-01, FR-BULLETS-03):
// each skill runs against a context built ONLY from the keys it is allowed to
// see — `ground-bullet` receives { bullet, cvText } and physically cannot read
// the JD, the requirements, or the generation transcript. Every step is
// recorded as a TraceStep so real runs are gradeable by the same
// gradeTrajectory eval that guards the contract (shared/lib/evals).
//
// Fail-honest (FR-TAILOR-03, NFR-OBS-01): each step retries ≤ 2 times, then the
// loop stops with a calm error event — never a blank or partial result.
import { applyExportDefaults, type Bullet } from "@/entities/bullet";
import { normalizeCvText } from "@/entities/cv-profile";
import type { TailoringChecklistRow } from "@/entities/tailoring";
import { MAX_ATTEMPTS, type RunTrace, type SkillName, type TraceStep } from "@/shared/lib/evals";
import {
  buildExtractionPrompt,
  buildGenerationPrompt,
  buildGroundingPrompt,
  parseExtractionResponse,
  parseGenerationResponse,
  parseGroundingResponse,
  type GeneratedBullet,
  type GroundingVerdict,
  type LlmProvider,
} from "@/shared/lib/llm";
import { checklistItem, matchScore } from "@/shared/lib/scoring";

import type { TailorRunEvent, TailoringRunInput, TailoringRunResult } from "../model/types";

/** Hard cap on total steps — the loop is bounded by construction. */
export const STEP_CAP = 40;

/** Output-token budgets per skill (NFR-COST-01). */
const EXTRACTION_MAX_TOKENS = 2048;
const GENERATION_MAX_TOKENS = 4096;
const GROUNDING_MAX_TOKENS = 1024;

export interface LoopDeps {
  readonly llm: LlmProvider;
}

class StepFailedError extends Error {
  constructor(skill: SkillName) {
    super(`step_failed:${skill}`);
  }
}

/**
 * Run one tailoring as an async generator: yields progress events for the
 * client stream (FR-TAILOR-01/02) and returns the RunTrace for evals/observability.
 */
export async function* runTailoringLoop(
  deps: LoopDeps,
  input: TailoringRunInput,
): AsyncGenerator<TailorRunEvent, RunTrace, void> {
  const steps: TraceStep[] = [];
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

  /**
   * Run one skill step with bounded retries. `contextKeys` names exactly what
   * the skill was allowed to see; `llmPayload` is the serialized prompt (when
   * the skill calls the LLM) so the no-user-id eval can scan real payloads.
   */
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

  try {
    // 1. parse-cv — deterministic, no LLM (TC-PURE-01 core reused).
    const cvProfile = await runStep("parse-cv", ["cvText"], undefined, async () => {
      const profile = normalizeCvText(input.cvText);
      if (profile.sentences.length === 0) throw new Error("empty_cv");
      return profile;
    });
    yield { type: "step", skill: "parse-cv" };

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

    // 3. generate-bullet — pass 1 (FR-TAILOR-02).
    const generationPrompt = buildGenerationPrompt({
      cvProfile,
      requirements,
      jobDescription: input.jdText,
    });
    const generated = await runStep(
      "generate-bullet",
      ["cvProfile", "requirements", "jdText"],
      JSON.stringify(generationPrompt),
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

    // 4. ground-bullet per bullet — pass 2, context-isolated (BC-HONESTY-01):
    //    the prompt is built from { bullet, cvText } and nothing else.
    const verdicts: GroundingVerdict[] = [];
    for (const bullet of generated) {
      const groundingCtx: { bullet: GeneratedBullet; cvText: readonly string[] } = {
        bullet,
        cvText: cvProfile.sentences,
      };
      const groundingPrompt = buildGroundingPrompt({
        bullets: [groundingCtx.bullet],
        cvSentences: groundingCtx.cvText,
      });
      const verdict = await runStep(
        "ground-bullet",
        Object.keys(groundingCtx),
        JSON.stringify(groundingPrompt),
        async () => {
          const raw = await deps.llm.complete(groundingPrompt, {
            maxTokens: GROUNDING_MAX_TOKENS,
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

    // 5. score — pure and deterministic, no LLM (FR-CHECKLIST-01, TC-PURE-01).
    const scored = await runStep("score", ["requirements", "cvProfile"], undefined, async () => {
      const checklist: TailoringChecklistRow[] = requirements.map((requirement) => ({
        requirement,
        item: checklistItem(requirement, cvProfile),
      }));
      return { checklist, matchScore: matchScore(checklist) };
    });
    yield { type: "step", skill: "score" };

    // Assemble bullets; overclaim-risk excluded from export by default
    // (FR-BULLETS-02, BC-HONESTY-02).
    const bullets: Bullet[] = applyExportDefaults(
      generated.map((g) => {
        const verdict = verdicts.find((v) => v.bulletId === g.id);
        const grounding = verdict?.label ?? "overclaim-risk";
        const sourceSentence = grounding === "grounded" ? verdict?.evidence : undefined;
        return {
          id: g.id,
          text: g.text,
          grounding,
          ...(sourceSentence ? { sourceSentence } : {}),
          includedInExport: false, // seeded by applyExportDefaults
        };
      }),
    );

    const result: TailoringRunResult = {
      checklist: scored.checklist,
      bullets,
      matchScore: scored.matchScore,
    };
    yield { type: "result", result };
    yield { type: "status", phase: "done" };
    return trace("done");
  } catch (error) {
    // Retries exhausted (or cap hit): calm failure, never a partial render.
    void error;
    yield { type: "error", code: "failed" };
    yield { type: "status", phase: "failed" };
    return trace("failed");
  }
}
