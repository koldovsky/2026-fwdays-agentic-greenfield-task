import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnv } from '../src/config/env.js';
import { createAnthropicClient } from '../src/llm/client.js';
import { classifyMessage } from '../src/router/router.js';
import { accuracy, gradeExact } from './grade.js';

// Local-only eval runner (ADR-0013): issues the REAL classify at temperature 0 over each labeled
// dataset and writes evals/results/latest.json (gitignored). Needs ANTHROPIC_API_KEY — it is never
// run in CI (CI only ratchets the committed scores via check:evals).

interface IntentCase {
  input: string;
  expected: { intent: string };
}

const runRouterIntent = async (): Promise<number> => {
  const env = loadEnv();
  const client = createAnthropicClient(env.ANTHROPIC_API_KEY);
  const lines = readFileSync('evals/datasets/router-intent.jsonl', 'utf8').trim().split('\n');

  const hits: boolean[] = [];
  for (const line of lines) {
    const testCase = JSON.parse(line) as IntentCase;
    const routed = await classifyMessage(client, testCase.input, { userTz: env.TZ });
    hits.push(gradeExact(testCase.expected.intent, routed.intent));
  }

  return accuracy(hits);
};

const main = async (): Promise<void> => {
  const results = { 'router-intent': { intent: await runRouterIntent() } };

  mkdirSync('evals/results', { recursive: true });
  writeFileSync('evals/results/latest.json', `${JSON.stringify(results, null, 2)}\n`);
  console.log('evals written to evals/results/latest.json:', JSON.stringify(results));
};

void main();
