import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type Anthropic from '@anthropic-ai/sdk';
import type { FoodPer } from '@prisma/client';
import { loadEnv } from '../src/config/env.js';
import { estimateFood } from '../src/food/estimate.js';
import { scaleFactor, scaleMacros } from '../src/food/scale.js';
import type { MacroBase, ScaledMacros } from '../src/food/types.js';
import { createAnthropicClient } from '../src/llm/client.js';
import { classifyMessage } from '../src/router/router.js';
import { coachPersonaToneCases } from './cases/coach-persona-tone.eval.js';
import { accuracy, gradeAsk, gradeExact } from './grade.js';
import { gradeWithJudge, llmJudge, type JudgeCase } from './judge.js';

// Local-only eval runner (ADR-0013): issues the REAL operations (no temperature override — ADR-0017)
// over each suite and writes evals/results/latest.json (gitignored). Needs ANTHROPIC_API_KEY — it is
// never run in CI (CI only ratchets the committed scores via check:evals). Dataset suites are
// code-graded by accuracy; judge suites are LLM-graded 0–100 against a rubric (fresh judge call).

const TONE_THRESHOLD = 70;

interface IntentCase {
  input: string;
  expected: { intent: string };
}

const runRouterIntent = async (client: Anthropic, userTz: string): Promise<number> => {
  const lines = readFileSync('evals/datasets/router-intent.jsonl', 'utf8').trim().split('\n');

  const hits: boolean[] = [];
  for (const line of lines) {
    const testCase = JSON.parse(line) as IntentCase;
    const routed = await classifyMessage(client, testCase.input, { userTz });
    hits.push(gradeExact(testCase.expected.intent, routed.intent));
  }

  return accuracy(hits);
};

interface FoodScaleCase {
  base: MacroBase;
  per: FoodPer;
  qty: number;
  expected: ScaledMacros;
}

const macrosMatch = (a: ScaledMacros, b: ScaledMacros): boolean =>
  a.kcal === b.kcal && a.proteinG === b.proteinG && a.fatG === b.fatG && a.carbsG === b.carbsG;

/** Deterministic suite: scaling is pure code (invariant #2), so it grades without any model call. */
const runFoodScale = (): number => {
  const lines = readFileSync('evals/datasets/food-scale.jsonl', 'utf8').trim().split('\n');

  const hits = lines.map((line) => {
    const testCase = JSON.parse(line) as FoodScaleCase;
    const got = scaleMacros(testCase.base, scaleFactor(testCase.qty, testCase.per));
    return macrosMatch(got, testCase.expected);
  });

  return accuracy(hits);
};

interface DiscriminationCase {
  input: string;
  expected: { asks: boolean };
}

/**
 * Ask/log discrimination (ADR-0015, US-6): the estimate call's optional `clarify` field IS the ask
 * signal (design D1 — the semantic judgment rides that one call, no extra request). A case passes
 * when the model raises a question exactly when the label says it should. Multiple-Food-DB-match
 * disambiguation is code-detected (covered by test/clarify/decide.test.ts), so it is not graded here.
 */
const runClarifyDiscrimination = async (client: Anthropic): Promise<number> => {
  const lines = readFileSync('evals/datasets/clarify-discrimination.jsonl', 'utf8')
    .trim()
    .split('\n');

  const hits: boolean[] = [];
  for (const line of lines) {
    const testCase = JSON.parse(line) as DiscriminationCase;
    const estimate = await estimateFood(client, testCase.input);
    hits.push(gradeAsk(testCase.expected.asks, estimate.clarify != null));
  }

  return accuracy(hits);
};

/** Mean judge score (0–100) over a judge suite; each case re-judged when borderline (judge.ts). */
const runJudgeSuite = async (
  client: Anthropic,
  cases: JudgeCase[],
  threshold: number,
): Promise<number> => {
  const judge = llmJudge(client);
  const scores: number[] = [];
  for (const testCase of cases) {
    const produced = await testCase.produce(client);
    scores.push(await gradeWithJudge(judge, testCase.rubric, produced, threshold));
  }
  return scores.length === 0 ? 0 : scores.reduce((sum, s) => sum + s, 0) / scores.length;
};

const main = async (): Promise<void> => {
  const env = loadEnv();
  const client = createAnthropicClient(env.ANTHROPIC_API_KEY);

  const results = {
    'router-intent': { intent: await runRouterIntent(client, env.TZ) },
    'food-scale': { accuracy: runFoodScale() },
    'clarify-discrimination': { accuracy: await runClarifyDiscrimination(client) },
    'coach-persona-tone': {
      score: await runJudgeSuite(client, coachPersonaToneCases, TONE_THRESHOLD),
    },
  };

  mkdirSync('evals/results', { recursive: true });
  writeFileSync('evals/results/latest.json', `${JSON.stringify(results, null, 2)}\n`);
  console.log('evals written to evals/results/latest.json:', JSON.stringify(results));
};

void main();
