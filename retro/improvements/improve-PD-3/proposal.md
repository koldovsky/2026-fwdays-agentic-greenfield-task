# Improvement Proposal: improve-PD-3

- **Defect:** PD-3 (`docs/qa/process-defects.json`) — `check-trajectory --release` flips FAIL→PASS over ten back-stamped `{"clean": true}` review-findings files; CI consumes it banner-blind.
- **Class / severity:** vacuous-pass / P0
- **Status:** approved

## Scope

**Changes:** `scripts/check-trajectory.mjs` learns about `.project-factory/retrofit.json`. A slice declared there renders `RETROFITTED` — never `clean`, never folded into `PASS`. When every archived slice is retrofitted and none was earned red-first, the script's verdict becomes `NOT-EARNED` and `--release` exits non-zero.

**Also removes:** the ten `openspec/changes/archive/*/review-findings.json` files written by commit `5bcbfe9`. They are forged evidence, not merely unearned: the `add-form-input` stamp asserts `clean:true, confirmed:0` while that slice's real review (`docs/qa/loop-add-form-input.md:39`) recorded **"PASS WITH NOTES"** with seven findings (C1–C7). They must not survive the fix, or the checker would simply ignore files that still lie.

**Deliberately does NOT change:**
- `scripts/gate-status.mjs` — its `⚠ RETROFIT MODE` banner already tells the truth. PD-7 (adding `gate-status` to CI) is a separate proposal.
- The `Slice:` trailer predicate — commit `5bcbfe9` also forged trailers for all ten slices in one docs commit. That is PD-10, filed separately. This fix only stops retrofit slices from being *judged* on trailers they cannot have.
- The unflagged (non-`--release`) exit code. See "Deliberate narrowing" below.

## Target file

`scripts/check-trajectory.mjs`

Plus deletion of `openspec/changes/archive/*/review-findings.json` (10 files, no logic).
Plus new `tests/check-trajectory-retrofit.test.mjs` + `tests/gate-fixtures/pd-3/**` (proof, not gate logic).

## Exact diff

```diff
--- a/scripts/check-trajectory.mjs
+++ b/scripts/check-trajectory.mjs
@@ PATHS @@
   jsonOut: "trace/trajectory.json",
+  retrofit: ".project-factory/retrofit.json",
 };

@@ before the slice loop @@
+const retrofitSlices = new Set();
+{
+  const raw = read(PATHS.retrofit);
+  if (raw) {
+    try { for (const s of JSON.parse(raw).slices ?? []) retrofitSlices.add(s); }
+    catch { warn("retrofit", `${PATHS.retrofit} is not valid JSON — treating every slice as earned-or-missing`); }
+  }
+}

@@ inside the slice loop @@
+  const retrofitted = retrofitSlices.has(trailerName);
   ...
-  if (reviewEvidence !== "clean") {
+  if (retrofitted) {
+    const stamped = reviewEvidence === "clean" ? ` (a "clean" stamp is present but predates the loop — ignored)` : "";
+    reviewEvidence = "retrofitted";
+    warn("retrofit", `${slice}: RETROFITTED — red-first history unreconstructible, review evidence not earned${stamped}`);
+  } else if (reviewEvidence !== "clean") {
     gated(flags.has("--release"), "review-evidence", ...);
   }
-  if (trailerCommits === 0) gated(flags.has("--release"), "trailer", ...);
+  if (trailerCommits === 0) gated(flags.has("--release") && !retrofitted, "trailer", ...);
-  rows.push({ slice, reviewEvidence, trailerCommits, libDomains, processComplete });
+  rows.push({ slice, reviewEvidence, trailerCommits, libDomains, processComplete, retrofitted });

@@ three-valued verdict @@
+const retrofitCount = rows.filter((r) => r.retrofitted).length;
+const earnedCount = rows.filter((r) => !r.retrofitted && r.reviewEvidence === "clean").length;
+const notEarned = retrofitCount > 0 && earnedCount === 0;
+let verdict, exitCode;
+if (failures.length)      { verdict = "FAIL";       exitCode = 1; }
+else if (notEarned)       { verdict = "NOT-EARNED"; exitCode = flags.has("--release") ? 1 : 0; }
+else                      { verdict = "PASS";       exitCode = 0; }

@@ tail @@
-console.log(`Result: ${failures.length ? "FAIL" : "PASS"}...`);
-process.exit(failures.length ? 1 : 0);
+if (notEarned) console.error(`NOT-EARNED  [trajectory] ...`);
+console.log(`Result: ${verdict}...`);
+process.exit(exitCode);
```

## Deliberate narrowing (and its risk)

The installed lesson `vacuous-pass-not-earned` says: *"Render it NOT-EARNED and exit non-zero."* This fix exits non-zero **only under `--release`**.

**Why:** the unflagged run backs the `pre-commit` hook (`scripts/hooks-pre-commit.mjs`). A non-zero exit there would block every commit in a repo whose ten archived slices all predate the loop — including the commits that would earn the first real evidence. The gate would be unpassable by construction, which is the PD-9 disease, not its cure.

**Why this is still honest:** the `Result:` line reads `NOT-EARNED` in **both** modes. `gate-status.mjs:159` and `qa-verify.mjs` classify on that string, not on the exit code, and `worst()` never folds `NOT-EARNED` into `PASS`. So G4+ render red everywhere the verdict is consumed. Only the developer's local commit is permitted to proceed.

**Residual risk:** a tool that classifies `check-trajectory` on exit code alone, without `--release`, would read a false green. Only `.githooks/pre-commit` does this today, and it is dormant. Recorded here so the next retro can revisit.

**Ladder position:** experimental (per `RULES-CHANGELOG.md`).

## Expected metric movement

- **Metric:** `vacuousPasses` (`trace/process-health.json`)
- **Current:** `0` — and that zero is itself the bug: `ledger-report` counted no vacuous pass because `check-trajectory` was reporting an honest-looking `PASS`.
- **Expected after fix:** the trajectory gate stops contributing a false `PASS`; `trajectoryRelease` in `gate-status` moves `PASS → NOT-EARNED`.
- **Directly observable:** `node scripts/check-trajectory.mjs --release` exit code `0 → 1`; `docs/qa/trajectory-report.md` header `Result: PASS → Result: NOT-EARNED`, scope line gains `(10 RETROFITTED, 0 earned)`.
- **Verified by:** the next retro. No movement = auto-flag for revert.

## EXECUTED red→green proof

- **Red fixture:** `tests/gate-fixtures/pd-3/red/` — one archived slice listed in `.project-factory/retrofit.json`, carrying the exact `{"clean": true, "generatedBy": "retrofit"}` shape found in this repo.
- **Green fixture:** `tests/gate-fixtures/pd-3/green/` — one archived slice absent from `retrofit.json` with genuine review evidence. Guards against the fix punishing earned slices.
- **Test:** `node tests/check-trajectory-retrofit.test.mjs` (plain Node; copies each fixture outside any git work tree so the trailer/scope checks self-skip and only the review-evidence semantics are under test).

### BEFORE the fix (executed against unmodified `check-trajectory.mjs`)

```text
FAIL red/--release verdict: got "PASS", want "NOT-EARNED"
FAIL red/--release exit code: got 0, want 1
FAIL red/--release names the slice retrofitted: got false, want true
FAIL red/soft verdict: got "PASS", want "NOT-EARNED"
ok   red/soft exit code: got 0, want 0
ok   green/--release verdict: got "PASS", want "PASS"
ok   green/--release exit code: got 0, want 0

3/7 checks passed
[exit 1]
```

### AFTER the fix (same test, same fixtures)

```text
ok   red/--release verdict: got "NOT-EARNED", want "NOT-EARNED"
ok   red/--release exit code: got 1, want 1
ok   red/--release names the slice retrofitted: got true, want true
ok   red/soft verdict: got "NOT-EARNED", want "NOT-EARNED"
ok   red/soft exit code: got 0, want 0
ok   green/--release verdict: got "PASS", want "PASS"
ok   green/--release exit code: got 0, want 0

7/7 checks passed
[exit 0]
```

### On the real repository, after removing the ten forged stamps

```text
NOT-EARNED  [trajectory] 10 of 10 archived slice(s) are RETROFITTED and 0 were earned
red-first — the trajectory gate has been earned by nothing. A back-stamped "clean"
review file is not a review.

Scope: 10 archived slice(s) (10 RETROFITTED, 0 earned)
Result: NOT-EARNED, 10 warning(s)

  soft      exit=0
  --release exit=1     <- was 0 (PASS) before this improvement
```

## Rollback (one revert)

- **Single commit:** yes. Rollback is exactly `git revert <sha>`.
- **State to clean up on revert:** `docs/qa/trajectory-report.md` and `trace/trajectory.json` are regenerated on the next run; the revert restores the ten `review-findings.json` files, which would re-open PD-3/PD-4/PD-5. Prefer forward-fixing.
- **Lock:** `factory-lock.json` is resealed inside this same commit (`--init-lock`), as `check-factory-integrity` requires for gate-bearing drift.

## Approval & trailer convention

- Human approver: Serhii · Date: 2026-07-10 (approved in-session: "Видалити + PD-3 fix")
- Commit message ends with: `Refs: PD-3`
