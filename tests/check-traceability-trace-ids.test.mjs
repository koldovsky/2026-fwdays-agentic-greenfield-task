// PD-9 red->green proof: check-traceability must recognize the very annotation
// it asks for.
//
// The checker demands a trace annotation naming a categorized id, then parses
// annotations with `[A-Z]+-\d+`, which cannot match one. The gate is therefore
// unsatisfiable by honest work, and the cheapest apparent fix — renumbering
// requirements.md to the plain `FR-12` form — would destroy the project's
// categorized ownership scheme.
//
// NOTE: this file must never contain a literal trace annotation. `PATHS.testDirs`
// in the checker includes `tests/`, so one would be scanned and would silently
// credit a real requirement — the fixtures live under `tests/.gate-fixtures/`
// because `walk()` skips dot-prefixed entries.
//
// Run: node tests/check-traceability-trace-ids.test.mjs
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve("scripts/check-traceability.mjs");
const FIXTURES = resolve("tests/.gate-fixtures/pd-9");

function runIn(fixture, args) {
  const dir = mkdtempSync(join(tmpdir(), `pd-9-${fixture}-`));
  try {
    cpSync(join(FIXTURES, fixture), dir, { recursive: true });
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const checks = [];
const check = (name, actual, expected) => {
  const ok = actual === expected;
  checks.push({ name, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
};

// RED — a categorized id IS annotated. --strict-tests must accept it.
const categorized = runIn("categorized", ["--strict-tests"]);
check("categorized: exit code", categorized.code, 0);
check("categorized: no test-trace failure", /FAIL\s+\[test-trace\]/.test(categorized.out), false);

// GUARD — the fix must not defang the check. An unannotated MVP FR still fails.
const untraced = runIn("untraced", ["--strict-tests"]);
check("untraced: exit code", untraced.code, 1);
check("untraced: reports the missing trace", /FR-CALC-01 has no test annotated/.test(untraced.out), true);

// REGRESSION — the legacy plain id form (FR-12) must keep working.
const plain = runIn("plain", ["--strict-tests"]);
check("plain FR-12: exit code", plain.code, 0);
check("plain FR-12: no test-trace failure", /FAIL\s+\[test-trace\]/.test(plain.out), false);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
