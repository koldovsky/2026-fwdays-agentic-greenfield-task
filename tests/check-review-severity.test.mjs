// PD-18 red->green proof: a review with clean:false but ONLY minor confirmed
// findings is earned; a major/critical confirmed finding still blocks.
//
// A thorough adversarial review asymptotically always surfaces some minor/doc
// item, so "zero confirmed" (PD-8's original bar) is unreachable. The archive
// bar is now "no unresolved major+ confirmed defect".
//
// Run: node tests/check-review-severity.test.mjs
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve("scripts/check-trajectory.mjs");
const SLICE = "2026-01-01-add-thing";

function run(confirmed) {
  const dir = mkdtempSync(join(tmpdir(), "pd-18-"));
  const base = join(dir, `openspec/changes/archive/${SLICE}`);
  mkdirSync(base, { recursive: true });
  writeFileSync(join(base, "design.md"), "# d\n");
  writeFileSync(join(base, "tasks.md"), "# t\n");
  writeFileSync(
    join(base, "review-findings.json"),
    JSON.stringify({
      generatedBy: "review-gate", scope: "add-thing", change: "add-thing", headRef: "HEAD",
      baseRef: "base1", dimensions: { correctness: { confirmed: confirmed.length, contested: 0, rejected: 0 } },
      confirmedTitles: confirmed.map((f) => f.title),
      confirmed, clean: confirmed.length === 0, generatedAt: "2026-01-01T00:00:00Z",
    }, null, 2)
  );
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--release"], { cwd: dir, encoding: "utf8" });
    const traj = JSON.parse(readFileSync(join(dir, "trace/trajectory.json"), "utf8"));
    return { code: r.status, evidence: traj.slices.find((s) => s.slice === SLICE)?.reviewEvidence };
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

// RED before PD-18 — a clean:false review with only minor findings was "unclean"
// and failed --release. Now it is earned (clean-minor).
const minorOnly = run([
  { title: "tasks.md count stale", severity: "minor", dimension: "correctness" },
  { title: "doc drift in design", severity: "minor", dimension: "spec-compliance" },
]);
check("minor-only is clean-minor", minorOnly.evidence, "clean-minor");
check("minor-only passes --release", minorOnly.code, 0);

// GUARD — a major confirmed defect still blocks.
const withMajor = run([
  { title: "phantom record on failed write", severity: "major", dimension: "correctness" },
  { title: "doc drift", severity: "minor", dimension: "spec-compliance" },
]);
check("major present is unclean", withMajor.evidence, "unclean");
check("major present fails --release", withMajor.code, 1);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
