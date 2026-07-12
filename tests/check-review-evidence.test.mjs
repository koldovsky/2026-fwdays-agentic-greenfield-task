// PD-8 red->green proof: a `clean:true` review-findings.json is trusted as
// earned review evidence only when it is a real review-gate output.
//
// check-trajectory reduced review evidence to `JSON.parse(rf).clean === true`,
// so a future earned slice could ship a hand-written `{ "clean": true }` file
// that no review ever produced and satisfy the review-evidence predicate. The
// only trustworthy marker is that the review-gate workflow wrote it:
// `generatedBy: "review-gate"` plus a populated `dimensions` object.
//
// Fixtures are non-git temp dirs (review evidence is not git-dependent); the
// slice is NOT listed in retrofit.json, so the review-evidence predicate is
// active under --release.
//
// Run: node tests/check-review-evidence.test.mjs
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

const SCRIPT = resolve("scripts/check-trajectory.mjs");
const SLICE = "2026-01-01-add-thing";

function run(reviewFindings) {
  const dir = mkdtempSync(join(tmpdir(), "pd-8-"));
  const base = join(dir, `openspec/changes/archive/${SLICE}`);
  mkdirSync(base, { recursive: true });
  writeFileSync(join(base, "design.md"), "# design\n");
  writeFileSync(join(base, "tasks.md"), "# tasks\n");
  writeFileSync(join(base, "review-findings.json"), JSON.stringify(reviewFindings, null, 2));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--release"], { cwd: dir, encoding: "utf8" });
    const traj = JSON.parse(readFileSync(join(dir, "trace/trajectory.json"), "utf8"));
    const row = traj.slices.find((s) => s.slice === SLICE);
    return { code: r.status, evidence: row?.reviewEvidence, out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const REAL = {
  generatedBy: "review-gate", scope: "add-thing", change: "add-thing", headRef: "HEAD",
  baseRef: "base123", dimensions: { correctness: { confirmed: 0, contested: 0, rejected: 0 } },
  confirmedTitles: [], clean: true, generatedAt: "2026-01-01T00:00:00Z",
};

const checks = [];
const check = (name, actual, expected) => {
  const ok = actual === expected;
  checks.push({ name, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
};

// RED — a hand-written clean:true stamp with no review-gate provenance must NOT
// be trusted. Under --release it fails.
const handStamp = run({ clean: true });
check("hand-stamped clean is not 'clean'", handStamp.evidence === "clean", false);
check("hand-stamped clean fails --release", handStamp.code, 1);

// RED — the retrofit-shaped stamp (generatedBy: retrofit) is likewise untrusted
// even outside retrofit.json.
const retroShape = run({ clean: true, generatedBy: "retrofit", dimensions: {} });
check("retrofit-shaped stamp is not 'clean'", retroShape.evidence === "clean", false);

// GREEN — a genuine review-gate output is trusted.
const real = run(REAL);
check("real review-gate output is 'clean'", real.evidence, "clean");
check("real review-gate output passes --release", real.code, 0);

// GUARD — a real review-gate run that found issues (clean:false) still fails.
const unclean = run({ ...REAL, clean: false });
check("review-gate clean:false still fails --release", unclean.code, 1);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
