// PD-3 red->green proof: check-trajectory must never render a retrofit slice as PASS.
//
// Fixtures are copied outside any git work tree on purpose: `check-trajectory`
// skips its trailer/scope checks when `git rev-parse --is-inside-work-tree`
// fails, which isolates this test to the review-evidence semantics under audit.
//
// Run: node tests/check-trajectory-retrofit.test.mjs
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve("scripts/check-trajectory.mjs");
const FIXTURES = resolve("tests/.gate-fixtures/pd-3");

function runIn(fixture, args) {
  const dir = mkdtempSync(join(tmpdir(), `pd-3-${fixture}-`));
  try {
    cpSync(join(FIXTURES, fixture), dir, { recursive: true });
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const verdictOf = (out) => out.match(/^Result:\s*(PASS|FAIL|SKIP-pending|NOT-EARNED)\b/m)?.[1] ?? "(none)";

const checks = [];
const check = (name, actual, expected) => {
  const ok = actual === expected;
  checks.push({ name, ok, actual, expected });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
};

// RED — a slice listed in .project-factory/retrofit.json carries a clean:true
// stamp. Its red-first history cannot be reconstructed, so the release gate
// must render NOT-EARNED, never PASS, and must exit non-zero.
const red = runIn("red", ["--release"]);
check("red/--release verdict", verdictOf(red.out), "NOT-EARNED");
check("red/--release exit code", red.code, 1);
check("red/--release names the slice retrofitted", /retrofitted/i.test(red.out), true);

// The non-release run stays exit 0 (it is informational and runs in the
// pre-commit hook) but must still refuse to call it PASS.
const redSoft = runIn("red", []);
check("red/soft verdict", verdictOf(redSoft.out), "NOT-EARNED");
check("red/soft exit code", redSoft.code, 0);

// GREEN — a slice absent from retrofit.json with genuine review evidence
// still passes. The fix must not punish earned slices.
const green = runIn("green", ["--release"]);
check("green/--release verdict", verdictOf(green.out), "PASS");
check("green/--release exit code", green.code, 0);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
