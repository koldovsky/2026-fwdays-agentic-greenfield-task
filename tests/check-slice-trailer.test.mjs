// PD-10 red->green proof: a `Slice:` trailer only counts as process evidence
// when the commit that carries it actually touched the slice's implementation.
//
// check-trajectory counted any commit whose message matched `Slice: <name>`,
// never checking what it changed. One docs-only commit (5bcbfe9) carried ten
// `Slice:` trailers and satisfied the trailer predicate for ten slices while
// touching zero source files.
//
// This test builds real git repos in a temp dir (the trailer check is
// git-dependent) and asserts trailerCommits via trace/trajectory.json.
//
// Run: node tests/check-slice-trailer.test.mjs
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

const SCRIPT = resolve("scripts/check-trajectory.mjs");
const SLICE = "2026-01-01-add-thing";
const TRAILER = "add-thing";

const write = (dir, rel, body) => {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
};

const git = (dir, args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });

// A PD-8-compliant review stamp so review-evidence is never the failing factor.
const REVIEW = JSON.stringify({
  generatedBy: "review-gate", scope: TRAILER, change: TRAILER, headRef: "HEAD",
  baseRef: "base123", dimensions: { correctness: { confirmed: 0, contested: 0, rejected: 0 } },
  confirmedTitles: [], clean: true, generatedAt: "2026-01-01T00:00:00Z",
}, null, 2);

function buildRepo({ implCommit }) {
  const dir = mkdtempSync(join(tmpdir(), "pd-10-"));
  const base = `openspec/changes/archive/${SLICE}`;
  write(dir, `${base}/design.md`, "# design\n");
  write(dir, `${base}/tasks.md`, "# tasks\n");
  write(dir, `${base}/review-findings.json`, REVIEW);
  write(dir, "docs/note.md", "docs only\n");
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.email", "t@t"]);
  git(dir, ["config", "user.name", "t"]);
  git(dir, ["add", "-A"]);
  // The docs-only commit that CLAIMS the slice via a real trailer.
  git(dir, ["commit", "-q", "-m", `docs: sync\n\nSlice: ${TRAILER}`]);
  if (implCommit) {
    write(dir, "src/lib/thing/impl.ts", "export const x = 1;\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", `feat(thing): implement\n\nSlice: ${TRAILER}`]);
  }
  return dir;
}

function trailerCountFor(dir) {
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
  const traj = JSON.parse(readFileSync(join(dir, "trace/trajectory.json"), "utf8"));
  const row = traj.slices.find((s) => s.slice === SLICE);
  return { trailerCommits: row?.trailerCommits ?? null, out: `${r.stdout}${r.stderr}` };
}

const checks = [];
const check = (name, actual, expected) => {
  const ok = actual === expected;
  checks.push({ name, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
};

// RED — only a docs-only commit carries the trailer. It must NOT count.
const docsOnly = buildRepo({ implCommit: false });
try {
  const { trailerCommits } = trailerCountFor(docsOnly);
  check("docs-only trailer commit does not count", trailerCommits, 0);
} finally {
  rmSync(docsOnly, { recursive: true, force: true });
}

// GREEN — a commit that touched src/ and carries the trailer counts.
const withImpl = buildRepo({ implCommit: true });
try {
  const { trailerCommits } = trailerCountFor(withImpl);
  check("impl commit with trailer counts", trailerCommits >= 1, true);
} finally {
  rmSync(withImpl, { recursive: true, force: true });
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
