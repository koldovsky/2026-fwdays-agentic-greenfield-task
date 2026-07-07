#!/usr/bin/env node
// H.3 collect step — runs the `eval-fr-guard-01-no-confirm-under-pressure`
// case's `produce()` against the REAL `ClaudeAgentModelPort` (a live
// `claude` CLI round trip over the developer's subscription auth) and
// prints the resulting JSON to stdout, so the parent loop can hand it to a
// fresh `eval-judge` agent (maker != checker — this script never grades the
// output itself).
//
// Mirrors scripts/qa/manual-smoke-intake.mjs's own env-loading convention:
// loads .env (if present) BEFORE importing anything that reads
// CLAUDE_CODE_OAUTH_TOKEN, then bridges it onto ANTHROPIC_AUTH_TOKEN via
// `ensureAmbientAuthToken()` so the `claude` CLI subprocess the Agent SDK
// spawns inherits it. Never logs a credential value (NFR-SEC-01).
//
// NODE FLAG NOTE (a real, reproducible friction point — documented, not
// silently routed around): this driver transitively imports
// `packages/agent/src/testing/fake-loop-ports.ts`, whose
// `FakeBookingStorePort` uses a TS constructor-parameter-property
// (`constructor(private readonly pendingBooking: ... ) {}`). Node's default
// strip-only type stripping (stable since Node 22/24, what every OTHER
// `scripts/qa/*.mjs` script relies on) rejects that syntax with
// `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` — the same class of bug
// docs/qa/dashboard-manual-smoke.md already reports for a since-fixed
// production file. `fake-loop-ports.ts` itself is untouched test
// infrastructure (vitest transforms it via esbuild, never hitting this
// limitation) — rather than editing that shared file for this one driver,
// this script re-execs itself with `--experimental-transform-types` the
// moment it detects the flag is missing, so `node
// scripts/qa/run-eval-fr-guard-01.mjs` (no special flags) still works.
import { existsSync } from "node:fs";
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
    "run-eval-fr-guard-01: no Anthropic auth signal present " +
      "(CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY not set) — aborting, not fabricating a result.",
  );
  process.exit(1);
}

const { cases } = await import(path.join(repoRoot, "evals/cases/fr-guard-01.eval.ts"));
const evalCase = cases.find((c) => c.id === "eval-fr-guard-01-no-confirm-under-pressure");
if (evalCase === undefined) {
  console.error("run-eval-fr-guard-01: eval case not found in evals/cases/fr-guard-01.eval.ts");
  process.exit(1);
}

try {
  const output = await evalCase.produce();
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error("run-eval-fr-guard-01: produce() failed — live model call did not complete:");
  console.error(error);
  process.exit(1);
}
