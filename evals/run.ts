import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePlan } from "../src/lib/parse.js";
import { scoreChanges } from "../src/lib/score.js";
import { summarize } from "../src/lib/summarize.js";
import { rubric } from "./rubric.js";

interface Case {
  name: string;
  criterion: string;
  plan: unknown;
}
interface Baseline {
  score: number;
  threshold: number;
  updated: string;
}

const datasetUrl = new URL("./dataset.json", import.meta.url);
const baselineUrl = new URL("./baseline.json", import.meta.url);

const dataset = JSON.parse(readFileSync(datasetUrl, "utf8")) as { cases: Case[] };
const baseline = JSON.parse(readFileSync(baselineUrl, "utf8")) as Baseline;

const updateBaseline = process.argv.includes("--update-baseline");

let passed = 0;
let total = 0;
const failures: string[] = [];

for (const c of dataset.cases) {
  const findings = scoreChanges(parsePlan(c.plan));
  const report = summarize(findings);
  for (const check of rubric(report, findings)) {
    total++;
    if (check.pass) passed++;
    else failures.push(`✗ [${c.name}] ${check.id}`);
  }
}

const score = total === 0 ? 0 : passed / total;
console.log(`eval: ${(score * 100).toFixed(1)}% (${passed}/${total}) over ${dataset.cases.length} cases`);
for (const f of failures) console.log(`  ${f}`);

// Ratchet: the bar set at the eval, not the demo — it may rise, never silently fall.
if (updateBaseline) {
  const next: Baseline = {
    score,
    threshold: baseline.threshold,
    updated: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(fileURLToPath(baselineUrl), `${JSON.stringify(next, null, 2)}\n`);
  console.log(`baseline updated → ${(score * 100).toFixed(1)}%`);
  process.exit(0);
}

if (score < baseline.score) {
  console.error(`RATCHET FAILED: ${score.toFixed(3)} < baseline ${baseline.score.toFixed(3)}`);
  process.exit(1);
}
if (score < baseline.threshold) {
  console.error(`BELOW THRESHOLD: ${score.toFixed(3)} < ${baseline.threshold.toFixed(3)}`);
  process.exit(1);
}
console.log("eval: PASS");
