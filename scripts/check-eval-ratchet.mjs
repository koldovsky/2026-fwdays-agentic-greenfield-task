#!/usr/bin/env node
// Key-less eval ratchet (ADR-0013). Compares evals/results/latest.json to the committed baseline
// quality/eval-baseline.json per capability/field: scores may ratchet UP, never silently DOWN.
// No LLM call, no ANTHROPIC_API_KEY — CI-safe. Skips gracefully before the first local run.
//
// Usage:
//   node scripts/check-eval-ratchet.mjs
//   node scripts/check-eval-ratchet.mjs --latest <path> --baseline <path>   (for tests)

import { existsSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const latestPath = getArg('--latest', 'evals/results/latest.json');
const baselinePath = getArg('--baseline', 'quality/eval-baseline.json');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

if (!existsSync(latestPath)) {
  console.log(
    `check:evals: no ${latestPath} yet — skipping (run \`npm run evals\` locally first).`,
  );
  process.exit(0);
}

const latest = readJson(latestPath);
const baseline = existsSync(baselinePath) ? readJson(baselinePath) : {};

const regressions = [];
for (const [capability, fields] of Object.entries(baseline)) {
  for (const [field, base] of Object.entries(fields)) {
    const got = latest?.[capability]?.[field];
    if (typeof got !== 'number' || got < base) {
      regressions.push(`${capability}.${field}: ${got} < baseline ${base}`);
    }
  }
}

if (regressions.length > 0) {
  console.error(`check:evals: ${regressions.length} regression(s) vs baseline:`);
  for (const r of regressions) {
    console.error(`  - ${r}`);
  }
  process.exit(1);
}

console.log('check:evals: OK (no regressions vs baseline)');
process.exit(0);
