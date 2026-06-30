import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from '../src/config/env.js';
import { createAnthropicClient } from '../src/llm/client.js';
import { classifyMessage } from '../src/router/router.js';
import { coachPersonaToneCases } from './cases/coach-persona-tone.eval.js';
import { accuracy, gradeExact } from './grade.js';
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
    'coach-persona-tone': {
      score: await runJudgeSuite(client, coachPersonaToneCases, TONE_THRESHOLD),
    },
  };

  mkdirSync('evals/results', { recursive: true });
  writeFileSync('evals/results/latest.json', `${JSON.stringify(results, null, 2)}\n`);
  console.log('evals written to evals/results/latest.json:', JSON.stringify(results));
};

void main();
