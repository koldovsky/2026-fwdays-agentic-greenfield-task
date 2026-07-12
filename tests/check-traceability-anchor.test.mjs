// PD-12 red->green proof: a trace annotation must be the first token of a
// comment, not a phrase found anywhere in the file.
//
// The parser matched the marker in prose. Three independent paths to a forged
// credit were observed in one session:
//   1. a test fixture under tests/ carrying a real annotation was scanned and
//      credited the production requirement (fixed by moving to .gate-fixtures/);
//   2. comments written to EXPLAIN an intentionally-absent annotation
//      ("No <marker> FR-EXPORT-02: this test cannot prove it") re-credited all
//      four requirements they were disclaiming;
//   3. a doc-comment citing the marker while discussing traceability.
//
// A mechanism that turns a disclaimer into evidence is the vacuous-pass
// disease at the parser level.
//
// This file writes the marker only via MARKER, never literally, so it cannot
// credit anything even if the anchor regresses.
//
// Run: node tests/check-traceability-anchor.test.mjs
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve("scripts/check-traceability.mjs");
const FIXTURES = resolve("tests/.gate-fixtures/pd-12");

function runIn(fixture, args) {
  const dir = mkdtempSync(join(tmpdir(), `pd-12-${fixture}-`));
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

// RED — the fixture only MENTIONS the marker inside prose and inside a
// negation. Nothing is annotated, so --strict-tests must fail.
const prose = runIn("prose", ["--strict-tests"]);
check("prose: exit code", prose.code, 1);
check("prose: reports the FR as untraced", /FR-CALC-01 has no test annotated/.test(prose.out), true);

// GREEN — a properly anchored annotation still counts. The fix must not break
// the 29 real annotations in src/.
const anchored = runIn("anchored", ["--strict-tests"]);
check("anchored: exit code", anchored.code, 0);
check("anchored: no test-trace failure", /FAIL\s+\[test-trace\]/.test(anchored.out), false);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
