// REFERENCE IMPLEMENTATION — deterministic trajectory validator.
//
// Sibling to check-traceability.mjs. Where check-traceability proves the
// REQUIREMENT chain, this proves the PROCESS each archived slice took — the
// part of "trajectory evaluation" that git/artifacts can prove, with exit
// codes (no LLM judgment):
//   - review evidence exists and is clean (review ran before archive);
//   - the slice's commits carry the `Slice:` trailer;
//   - module scope: which lib/<domain>/ each slice touched (cross-slice
//     overlaps flagged for drift review);
//   - the archived change folder has design.md + tasks.md.
//
// HONESTY BOUNDARY: it does NOT verify test-first ordering or "no test was
// weakened". Those are not derivable from one-commit-per-slice history — they
// are graded by the `trajectory-eval` workflow (a fresh LLM judge reading the
// diff). This script never claims what it cannot prove.
//
// Usage:
//   node scripts/check-trajectory.mjs                 # report + exit code
//   node scripts/check-trajectory.mjs --release       # missing evidence/trailer = FAIL
//   node scripts/check-trajectory.mjs --strict-scope  # cross-slice module overlap = FAIL
//   node scripts/check-trajectory.mjs --check-fresh   # committed report must match
//
// Outputs (deterministic, ASCII, no timestamps — safe to diff in CI):
//   docs/qa/trajectory-report.md   (generated — do not hand-edit)
//   trace/trajectory.json          (machine-readable)
//
// Wire as: "check:trajectory": "node scripts/check-trajectory.mjs"
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const flags = new Set(process.argv.slice(2));
const PATHS = {
  archiveDir: "openspec/changes/archive",
  reportOut: "docs/qa/trajectory-report.md",
  jsonOut: "trace/trajectory.json",
  retrofit: ".project-factory/retrofit.json",
};
// lib/<domain>/ dirs that are conventionally shared — never flagged as a
// cross-slice overlap.
const SHARED_DOMAINS = new Set(["auth", "db", "shared", "ui", "utils", "common", "email"]);

// PD-10: a `Slice:` trailer counts only if the commit touched the slice's own
// implementation — source, components, or tests. A docs / openspec-only commit
// touches none of these, so it can no longer claim a slice it never built.
const isImplPath = (f) => /^(?:src|app|lib|db|components|tests)\//.test(f);

const failures = [];
const warnings = [];
const fail = (check, msg) => failures.push({ check, msg });
const warn = (check, msg) => warnings.push({ check, msg });
// A finding that is a hard FAIL only under a strictness flag, else a warning.
const gated = (on, check, msg) => (on ? fail(check, msg) : warn(check, msg));

const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : null);
function git(args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout || "").trim() };
}
const isRepo = git(["rev-parse", "--is-inside-work-tree"]).ok;
if (!isRepo) warn("git", "not a git work tree — trailer/scope checks skipped");

// ---------- discover archived slices ----------
const archiveAbs = join(root, PATHS.archiveDir);
const slices = existsSync(archiveAbs)
  ? readdirSync(archiveAbs).filter((e) => statSync(join(archiveAbs, e)).isDirectory())
  : [];

// Retrofit honesty: slices onboarded from pre-Factory code have no
// reconstructible red-first history. They are declared once in
// `.project-factory/retrofit.json` and from then on render RETROFITTED — never
// `clean`, never PASS. Without this, a back-stamped `{"clean": true}` file in
// an archive folder is indistinguishable from a review that actually ran.
const retrofitSlices = new Set();
{
  const raw = read(PATHS.retrofit);
  if (raw) {
    try {
      for (const s of JSON.parse(raw).slices ?? []) retrofitSlices.add(s);
    } catch {
      warn("retrofit", `${PATHS.retrofit} is not valid JSON — treating every slice as earned-or-missing`);
    }
  }
}

// slice -> { reviewEvidence, trailerCommits, libDomains[], processComplete, retrofitted }
const rows = [];
const domainToSlices = new Map(); // lib domain -> [slices]

for (const slice of slices) {
  const dir = join(PATHS.archiveDir, slice);
  // OpenSpec archives as `YYYY-MM-DD-add-<cap>`, but the commit trailer is the
  // bare `Slice: add-<cap>` — strip the date prefix so trailer matching works.
  const trailerName = slice.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const retrofitted = retrofitSlices.has(trailerName);

  // 1. review evidence
  //
  // PD-8: `clean:true` alone is not proof — a hand-written stamp is trivial to
  // forge. Trust it only when the review-gate workflow demonstrably produced it:
  // `generatedBy: "review-gate"` plus a populated `dimensions` object (the
  // structural fingerprint of the dimension pipeline). Anything else that claims
  // clean — a bare `{clean:true}`, a `generatedBy:"retrofit"` shape — is an
  // unverified stamp and is treated like a missing review.
  let reviewEvidence = "missing";
  const rf = read(join(dir, "review-findings.json"));
  if (rf) {
    try {
      const parsed = JSON.parse(rf);
      const fromReviewGate =
        parsed.generatedBy === "review-gate" &&
        parsed.dimensions &&
        typeof parsed.dimensions === "object" &&
        Object.keys(parsed.dimensions).length > 0;
      // PD-18: "zero confirmed findings" is an unreachable bar — a thorough
      // adversarial review asymptotically always surfaces some minor/doc item.
      // A real review-gate run whose confirmed findings are ALL minor/low (none
      // major/critical/high) is earned; major+ still blocks. Needs the
      // per-finding `confirmed:[{severity}]` the review-gate now records.
      const confirmed = Array.isArray(parsed.confirmed) ? parsed.confirmed : null;
      const noMajor =
        confirmed !== null &&
        confirmed.every((f) => !/^(major|critical|high)$/i.test(String(f?.severity ?? "")));
      if (parsed.clean === true && fromReviewGate) reviewEvidence = "clean";
      else if (fromReviewGate && confirmed && confirmed.length > 0 && noMajor)
        reviewEvidence = "clean-minor";
      else if (parsed.clean === true) reviewEvidence = "unverified-stamp";
      else reviewEvidence = "unclean";
    } catch {
      reviewEvidence = "unparseable";
    }
  }
  if (retrofitted) {
    // A `clean:true` stamp on a retrofit slice proves nothing: the review it
    // claims predates the Factory. Downgrade it and say so out loud.
    const stamped = reviewEvidence === "clean" || reviewEvidence === "clean-minor" ? ` (a "clean" stamp is present but predates the loop — ignored)` : "";
    reviewEvidence = "retrofitted";
    warn("retrofit", `${slice}: RETROFITTED — red-first history unreconstructible, review evidence not earned${stamped}`);
  } else if (reviewEvidence === "clean-minor") {
    warn("review-evidence", `${slice}: review earned with MINOR-only confirmed findings (PD-18) — no major/critical open; verify they are documented`);
  } else if (reviewEvidence !== "clean") {
    gated(flags.has("--release"), "review-evidence", `${slice}: review-findings.json is ${reviewEvidence} (review must have run clean before archive)`);
  }

  // 2. process completeness
  const processComplete = existsSync(join(root, dir, "design.md")) && existsSync(join(root, dir, "tasks.md"));
  if (!processComplete) gated(flags.has("--release"), "process", `${slice}: archived change is missing design.md and/or tasks.md`);

  // 3 + 4. trailer presence + module scope (git)
  let trailerCommits = 0;
  let libDomains = [];
  if (isRepo) {
    // Candidate commits whose message mentions the trailer. Each is then
    // validated on its own so one commit cannot claim a slice it never built.
    const cand = git(["log", "--all", `--grep=Slice: ${trailerName}`, "--format=%H"]);
    const shas = cand.ok ? cand.out.split("\n").map((s) => s.trim()).filter(Boolean) : [];
    for (const sha of shas) {
      // PD-10a: `Slice: <name>` must be a REAL trailer, not a prose mention.
      const tr = git(["show", "-s", "--format=%(trailers:key=Slice,valueonly)", sha]);
      const trailered = tr.ok && tr.out.split("\n").map((s) => s.trim()).includes(trailerName);
      if (!trailered) continue;
      // PD-10b: the commit must have touched the slice's own IMPLEMENTATION,
      // not just docs. A docs-only commit (5bcbfe9 claimed ten slices while
      // touching zero source files) no longer counts as process evidence.
      const nf = git(["show", "--name-only", "--format=", sha]);
      const changed = nf.ok ? nf.out.split("\n").map((s) => s.trim()).filter(Boolean) : [];
      if (!changed.some(isImplPath)) continue;
      trailerCommits += 1;
      for (const f of changed) {
        const m = f.match(/^(?:src\/)?lib\/([^/]+)\//);
        if (m) libDomains.push(m[1]);
      }
    }
    libDomains = [...new Set(libDomains)];
    for (const d of libDomains) {
      if (!domainToSlices.has(d)) domainToSlices.set(d, []);
      domainToSlices.get(d).push(slice);
    }
    // A retrofit slice predates the commit-msg hook, so a missing trailer is
    // expected, not a defect. It stays a warning even under --release; the
    // NOT-EARNED verdict below is what keeps the gate honest.
    if (trailerCommits === 0)
      gated(flags.has("--release") && !retrofitted, "trailer", `${slice}: no commit carries a real "Slice: ${trailerName}" trailer that also touched the slice's implementation`);
  }

  rows.push({ slice, reviewEvidence, trailerCommits, libDomains, processComplete, retrofitted });
}

// cross-slice module overlap (after all slices seen)
const overlaps = [];
for (const [domain, owners] of domainToSlices) {
  const uniq = [...new Set(owners)];
  if (uniq.length > 1 && !SHARED_DOMAINS.has(domain)) {
    overlaps.push({ domain, slices: uniq });
    gated(flags.has("--strict-scope"), "in-scope", `lib/${domain}/ modified by ${uniq.length} slices (${uniq.join(", ")}) — review for scope drift`);
  }
}

if (slices.length === 0) warn("slices", "no archived slices found under openspec/changes/archive/ (nothing to audit yet)");

// ---------- three-valued verdict (vacuous-pass-not-earned) ----------
// A retrofit slice is never evidence. When every archived slice is retrofitted,
// the trajectory gate has been earned by nothing and must not print PASS.
const retrofitCount = rows.filter((r) => r.retrofitted).length;
const isEarnedReview = (e) => e === "clean" || e === "clean-minor";
const earnedCount = rows.filter((r) => !r.retrofitted && isEarnedReview(r.reviewEvidence)).length;
const notEarned = retrofitCount > 0 && earnedCount === 0;

let verdict;
let exitCode;
if (failures.length) {
  verdict = "FAIL";
  exitCode = 1;
} else if (notEarned) {
  verdict = "NOT-EARNED";
  // Hard only where the gate actually is (G7 / CI release). The unflagged run
  // is informational — it backs the pre-commit hook, where a non-zero exit
  // would block every commit in a repo whose history predates the loop. The
  // verdict string still reads NOT-EARNED, so gate-status and qa-verify (which
  // classify on `Result:`, not exit code) correctly refuse to fold it into PASS.
  exitCode = flags.has("--release") ? 1 : 0;
} else {
  verdict = "PASS";
  exitCode = 0;
}

// ---------- outputs ----------
const ok = (b) => (b ? "yes" : "**no**");
const report = `# Trajectory Report (generated - do not hand-edit)

Generated by \`node scripts/check-trajectory.mjs\`. Audits the PROCESS each
archived slice took: review evidence, \`Slice:\` trailers, and module scope.
It does NOT verify test-first ordering or test integrity (not derivable from
one-commit-per-slice history) — those are graded by the trajectory-eval workflow.

Scope: ${slices.length} archived slice(s)${retrofitCount ? ` (${retrofitCount} RETROFITTED, ${earnedCount} earned)` : ""}.
Result: ${verdict}${failures.length ? ` (${failures.length} failure${failures.length === 1 ? "" : "s"})` : ""}${warnings.length ? `, ${warnings.length} warning(s)` : ""}

| Slice | Review evidence | Trailer commits | design+tasks | lib domains touched |
|---|---|---|---|---|
${rows
  .map((r) => `| ${r.slice} | ${r.reviewEvidence === "clean" ? "clean" : `**${r.reviewEvidence}**`} | ${r.retrofitted ? "n/a (retrofit)" : r.trailerCommits || "**0**"} | ${ok(r.processComplete)} | ${r.libDomains.join(", ") || "-"} |`)
  .join("\n")}

## Cross-slice module overlap

${overlaps.length ? overlaps.map((o) => `- \`lib/${o.domain}/\` touched by: ${o.slices.join(", ")}`).join("\n") : "None."}

## Failures

${failures.length ? failures.map((f) => `- **${f.check}**: ${f.msg}`).join("\n") : "None."}

## Warnings

${warnings.length ? warnings.map((w) => `- **${w.check}**: ${w.msg}`).join("\n") : "None."}
`;

const trajectory = {
  generatedBy: "scripts/check-trajectory.mjs",
  verdict,
  retrofitCount,
  earnedCount,
  slices: rows,
  overlaps,
  failures,
  warnings,
};

if (flags.has("--check-fresh")) {
  const committed = read(PATHS.reportOut);
  if (committed === null) fail("freshness", `${PATHS.reportOut} does not exist — run the validator and commit it`);
  else if (committed.replace(/\r\n/g, "\n") !== report.replace(/\r\n/g, "\n")) fail("freshness", `${PATHS.reportOut} is stale — regenerate and commit`);
} else {
  mkdirSync(join(root, "trace"), { recursive: true });
  mkdirSync(join(root, "docs", "qa"), { recursive: true });
  writeFileSync(join(root, PATHS.reportOut), report);
  writeFileSync(join(root, PATHS.jsonOut), `${JSON.stringify(trajectory, null, 2)}\n`);
}

for (const w of warnings) console.warn(`WARN  [${w.check}] ${w.msg}`);
for (const f of failures) console.error(`FAIL  [${f.check}] ${f.msg}`);
if (notEarned)
  console.error(
    `NOT-EARNED  [trajectory] ${retrofitCount} of ${slices.length} archived slice(s) are RETROFITTED and ${earnedCount} were earned red-first — the trajectory gate has been earned by nothing. A back-stamped "clean" review file is not a review.`,
  );
console.log(`\nScope: ${slices.length} archived slice(s)${retrofitCount ? ` (${retrofitCount} RETROFITTED, ${earnedCount} earned)` : ""}`);
if (!flags.has("--check-fresh")) console.log(`wrote ${PATHS.reportOut} and ${PATHS.jsonOut}`);
console.log(`Result: ${verdict}${warnings.length ? `, ${warnings.length} warning(s)` : ""}`);
process.exit(exitCode);
