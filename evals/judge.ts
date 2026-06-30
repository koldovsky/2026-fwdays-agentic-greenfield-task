import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MODEL } from '../src/llm/client.js';

// LLM judge eval (ADR-0013): for behavior with NO ground truth (coaching tone, language mirror,
// honest-estimate surfacing). The judge is a FRESH call distinct from the producer (maker ≠ checker)
// — its system prompt is the rubric, NOT the coaching persona prefix. Local-only; never runs in CI.
// The pure scoring helpers below carry no LLM call so they are unit-testable in the vitest gate.

/** Score at/below which a case fails. A CRITICAL rubric miss caps the case here. */
export const FAIL_CEILING = 49;

export interface JudgeVerdict {
  score: number; // 0–100
  criticalMiss: boolean;
  reasoning: string;
}

const verdictSchema = z.object({
  score: z.number().min(0).max(100),
  criticalMiss: z.boolean(),
  reasoning: z.string(),
});

/** A single judge grading. Stubbed in tests; backed by `llmJudge` in the real run. */
export type JudgeFn = (rubric: string, produced: string) => Promise<JudgeVerdict>;

/** One judge-eval case: a scenario, a producer that issues the real output, and the grading rubric. */
export interface JudgeCase {
  scenario: string;
  produce: (client: Anthropic) => Promise<string>;
  rubric: string;
}

/** CRITICAL gating: any critical miss caps the score at the fail ceiling (≤ 49). */
export const capForCritical = (verdict: JudgeVerdict): number =>
  verdict.criticalMiss ? Math.min(verdict.score, FAIL_CEILING) : verdict.score;

/** A score within `band` of the threshold is borderline → gets a second judge. */
export const isBorderline = (score: number, threshold: number, band: number): boolean =>
  Math.abs(score - threshold) <= band;

/** Combine double-judge scores conservatively (min) — counters the too-nice-judge failure mode. */
export const combine = (scores: number[]): number => Math.min(...scores);

/**
 * Grade one produced output: judge once, cap on CRITICAL miss, and on a borderline result re-judge
 * and combine via min. Pure orchestration over an injected `JudgeFn` — no LLM call here.
 */
export const gradeWithJudge = async (
  judge: JudgeFn,
  rubric: string,
  produced: string,
  threshold: number,
  band = 5,
): Promise<number> => {
  const first = capForCritical(await judge(rubric, produced));
  if (!isBorderline(first, threshold, band)) return first;
  const second = capForCritical(await judge(rubric, produced));
  return combine([first, second]);
};

/** The real judge: one structured `messages.create` with the rubric as system (no coaching prefix). */
export const llmJudge =
  (client: Anthropic): JudgeFn =>
  async (rubric, produced) => {
    const jsonSchema = zodToJsonSchema(verdictSchema, { $refStrategy: 'none' }) as Record<
      string,
      unknown
    >;
    delete jsonSchema.$schema;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: [{ type: 'text', text: rubric }],
      output_config: { format: { type: 'json_schema', schema: jsonSchema } },
      messages: [{ role: 'user', content: produced }],
    });

    const block = message.content.find((b) => b.type === 'text');
    if (block?.type !== 'text' || block.text.trim() === '') {
      throw new Error(
        `judge returned no text output (stop_reason: ${message.stop_reason ?? 'unknown'})`,
      );
    }

    return verdictSchema.parse(JSON.parse(block.text) as unknown);
  };
