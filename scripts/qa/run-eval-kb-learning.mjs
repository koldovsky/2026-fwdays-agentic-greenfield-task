#!/usr/bin/env node
// H.4 collect step (kb-learning) — runs EVERY case in `evals/cases/
// fr-guard-02.eval.ts`, `evals/cases/fr-faq-01.eval.ts`, and
// `evals/cases/fr-faq-02.eval.ts` against the REAL `ClaudeAgentModelPort` (a
// live `claude` CLI round trip over the developer's subscription auth — NEVER
// an Anthropic API key, per AGENTS.md) and writes the captured outputs to
// `evals/results/kb-learning-probes.json` for a fresh `eval-judge` agent to
// grade afterward (maker != checker — this script never grades anything
// itself, mirroring `run-eval-fr-guard-01.mjs`'s own discipline).
//
// Reproduces each probe TWICE (`--reps 2`, default 1) so the run can be
// re-executed to sanity-check stability before grading, same as
// `run-eval-fr-guard-01.mjs`'s own manually-reproduced-twice convention —
// here scripted rather than manual, since there are 12 cases across 3 files
// instead of 1.
//
// NODE FLAG NOTE (same real, reproducible friction point
// `run-eval-fr-guard-01.mjs` already documents): this driver transitively
// imports `packages/agent/src/testing/fake-loop-ports.ts`, whose
// `FakeBookingStorePort`/`FakeSlotsPort`/`FakeHoldStorePort`/
// `FakeQuestionsPort` use TS constructor-parameter-properties. Node's default
// strip-only type stripping rejects that syntax with
// `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` — this script re-execs itself with
// `--experimental-transform-types` the moment it detects the flag is
// missing, so `node scripts/qa/run-eval-kb-learning.mjs` (no special flags)
// still works.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

if (!process.execArgv.includes("--experimental-transform-types") && !process.env.KAMERTON_EVAL_REEXEC) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-transform-types", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, KAMERTON_EVAL_REEXEC: "1" } },
  );
  process.exit(result.status ?? 1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const { ensureAmbientAuthToken } = await import(
  path.join(repoRoot, "packages/agent/src/ambient-auth.ts")
);
const hasAuth = ensureAmbientAuthToken();
if (!hasAuth) {
  console.error(
    "run-eval-kb-learning: no Anthropic auth signal present " +
      "(CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY not set) — aborting, not fabricating a result.",
  );
  process.exit(1);
}

const CASE_FILES = ["fr-guard-02.eval.ts", "fr-faq-01.eval.ts", "fr-faq-02.eval.ts"];

const repsArgIdx = process.argv.indexOf("--reps");
const reps = repsArgIdx !== -1 ? Number(process.argv[repsArgIdx + 1]) : 1;
if (!Number.isInteger(reps) || reps < 1) {
  console.error(`run-eval-kb-learning: --reps must be a positive integer, got ${process.argv[repsArgIdx + 1]}`);
  process.exit(1);
}

/** @type {Array<{ file: string, id: string, trace: string[], dimension: string, capability: string, scenario: string, rubric: string[], runs: Array<{ rep: number, output: unknown } | { rep: number, error: string }> }>} */
const results = [];
let anyFailure = false;

for (const fileName of CASE_FILES) {
  const filePath = path.join(repoRoot, "evals/cases", fileName);
  const { cases } = await import(filePath);
  console.error(`run-eval-kb-learning: loaded ${cases.length} case(s) from ${fileName}`);

  for (const evalCase of cases) {
    console.error(`run-eval-kb-learning: running ${evalCase.id} (${reps} rep(s))...`);
    const runs = [];
    for (let rep = 1; rep <= reps; rep++) {
      try {
        const output = await evalCase.produce();
        runs.push({ rep, output });
        console.error(`  rep ${rep}/${reps}: ok`);
      } catch (error) {
        anyFailure = true;
        const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        runs.push({ rep, error: message });
        console.error(`  rep ${rep}/${reps}: FAILED — ${message}`);
      }
    }
    results.push({
      file: fileName,
      id: evalCase.id,
      trace: evalCase.trace,
      dimension: evalCase.dimension,
      capability: evalCase.capability,
      scenario: evalCase.scenario,
      rubric: evalCase.rubric,
      runs,
    });
  }
}

const outDir = path.join(repoRoot, "evals/results");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "kb-learning-probes.json");
const payload = {
  generatedAt: new Date().toISOString(),
  model: "claude-sonnet-5",
  authMode: "subscription (CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_AUTH_TOKEN bridge, never an API key)",
  reps,
  cases: results,
};
writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.error(`run-eval-kb-learning: wrote ${outPath}`);

if (anyFailure) {
  console.error("run-eval-kb-learning: at least one probe rep FAILED — see above and the written file. Not fabricating a passing result.");
  process.exit(1);
}
