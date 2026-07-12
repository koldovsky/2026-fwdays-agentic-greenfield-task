# Improvement Proposal: improve-PD-9

- **Defect:** PD-9 (`docs/qa/process-defects.json`) — `check-traceability.mjs` demands a `@trace` annotation naming a categorized requirement id, then parses annotations with a pattern that can never match one. The gate is unsatisfiable by honest work.
- **Class / severity:** check-too-weak (over-strict variant: false negatives on valid evidence) / P1
- **Status:** approved

## Scope

**Changes:** one regex in `scripts/check-traceability.mjs`. The `@trace` parser now shares its id vocabulary with the file's own `idsIn` helper.

**Deliberately does NOT change:**
- `docs/requirements.md`. Renumbering `FR-CALC-01` → `FR-12` would make the check pass and is the laundering trap this defect creates: the categorized scheme encodes capability ownership that `capability-map.yaml` and the whole `openspec/specs/<capability>/` layout depend on.
- `check-acceptance-methods.mjs`. Its `trace-test` artifactCheck already builds its own correct pattern (`@trace\s+[^\n]*\bFR-CALC-01\b`, line 436) and was never broken. The two scripts disagreed about identical evidence; this makes them agree.
- The strictness of the check. An unannotated MVP FR must still fail under `--strict-tests`; a guard fixture asserts exactly that.

## Target file

`scripts/check-traceability.mjs`

## Exact diff

```diff
--- a/scripts/check-traceability.mjs
+++ b/scripts/check-traceability.mjs
@@ helpers @@
 // Ids may be plain (FR-12) or categorized (FR-SHELL-01, NFR-A11Y-02).
-const idsIn = (text) => [...new Set(text.match(/\b(?:FR|NFR|TC|BC|BUG)-(?:[A-Z0-9]+-)?\d+\b/g) ?? [])];
+const ID_PATTERN = "(?:FR|NFR|TC|BC|BUG)-(?:[A-Z0-9]+-)?\\d+";
+const idsIn = (text) => [...new Set(text.match(new RegExp(`\\b${ID_PATTERN}\\b`, "g")) ?? [])];
+// `@trace FR-CALC-01` / `@trace FR-12, BUG-3`. Shares ID_PATTERN with idsIn on
+// purpose: a narrower pattern here would demand an annotation (see the
+// test-trace report below) that this parser could never recognize.
+const TRACE_ANNOTATION_RE = new RegExp(`@trace\\s+(${ID_PATTERN}(?:\\s*,\\s*${ID_PATTERN})*)`, "g");

@@ 4. test traces @@
     const text = read(file) ?? "";
-    for (const m of text.matchAll(/@trace\s+([A-Z]+-\d+(?:\s*,\s*[A-Z]+-\d+)*)/g)) {
+    for (const m of text.matchAll(TRACE_ANNOTATION_RE)) {
       for (const id of m[1].split(/\s*,\s*/)) {
```

## A trap found while proving this fix

The first version of the fixtures lived at `tests/gate-fixtures/pd-9/…/money.test.ts` and contained a real `// @trace FR-CALC-01`. `PATHS.testDirs` includes `tests/`, so the checker scanned the fixture and **credited the real `FR-CALC-01`** — the traceability report silently dropped from 34 test-trace warnings to 33 with zero annotations in `src/`. The proof harness had begun manufacturing the evidence it was meant to test.

Fixtures now live under `tests/.gate-fixtures/`; `walk()` skips dot-prefixed entries (`check-traceability.mjs:56`). The test file itself carries a comment forbidding a literal annotation in its own prose, because that too was scanned.

This is recorded here rather than quietly fixed: it is the same class as PD-3 (evidence manufactured by the thing that checks evidence), and the next person to add a gate fixture will hit it.

## Expected metric movement

- **Metric:** clearable `test-trace` warnings (`docs/qa/traceability-report.md`)
- **Current:** 34 warnings, of which **0** can be cleared by writing a correct annotation.
- **Expected after fix:** 34 warnings, of which **34** are clearable by annotating the corresponding tests. `check-traceability --release --strict-tests` (the G7 command, wired at `gate-status.mjs:74`) becomes satisfiable.
- **Verified by:** the next retro — and immediately, by the real-repo demonstration below.

## EXECUTED red→green proof

- **`categorized` fixture:** an MVP FR with a correct `@trace FR-CALC-01` annotation. `--strict-tests` must exit 0.
- **`untraced` fixture (guard):** the same FR, annotation absent. `--strict-tests` must still exit 1 — the fix must not defang the check.
- **`plain` fixture (regression):** the legacy `FR-12` form must keep working.
- **Test:** `node tests/check-traceability-trace-ids.test.mjs`

### BEFORE the fix

```text
FAIL categorized: exit code: got 1, want 0
FAIL categorized: no test-trace failure: got true, want false
ok   untraced: exit code: got 1, want 1
ok   untraced: reports the missing trace: got true, want true
ok   plain FR-12: exit code: got 0, want 0
ok   plain FR-12: no test-trace failure: got false, want false

4/6 checks passed
[exit 1]
```

The two passing `plain FR-12` checks localize the defect precisely: the annotation mechanism works, the categorized vocabulary does not.

### AFTER the fix

```text
ok   categorized: exit code: got 0, want 0
ok   categorized: no test-trace failure: got false, want false
ok   untraced: exit code: got 1, want 1
ok   untraced: reports the missing trace: got true, want true
ok   plain FR-12: exit code: got 0, want 0
ok   plain FR-12: no test-trace failure: got false, want false

6/6 checks passed
[exit 0]
```

`tests/check-trajectory-retrofit.test.mjs` (improve-PD-3) re-run: **7/7**, no cross-damage.

### On the real repository

Appending `// @trace FR-CALC-01` to `src/lib/invoice-calc/__tests__/purpose.test.ts`, then reverting:

```text
  test-trace warnings without annotation: 34
  test-trace warnings with    annotation: 33   <- the annotation now REGISTERS
  delta: 1
```

Before this fix the same experiment produced a delta of **0**.

## Rollback (one revert)

- **Single commit:** yes. `git revert <sha>`.
- **State to clean up on revert:** none. `docs/qa/traceability-report.md` + `trace/trace.json` regenerate on the next run.
- **Ladder position:** experimental. This tightens a check that was inert; it cannot produce a false PASS, only stop a false FAIL.

## Approval & trailer convention

- Human approver: Serhii · Date: 2026-07-10 (approved in-session: "PD-9 — полагодити @trace regex")
- Commit message ends with: `Refs: PD-9`
