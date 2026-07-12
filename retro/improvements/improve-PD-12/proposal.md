# Improvement Proposal: improve-PD-12

- **Defect:** PD-12 — `check-traceability.mjs` matched a `@trace` annotation **anywhere in a file**, so a mention inside prose, a disclaimer, or a test fixture became evidence.
- **Class / severity:** vacuous-pass / P0 — it manufactures a green gate over a comment that explicitly denies the evidence exists.
- **Status:** approved

## Why P0, not P1

PD-9 (the sibling defect in the same file) rendered FAIL over honest evidence — annoying, never false-green. PD-12 is the inverse and worse: it renders **PASS over a disclaimer**. Three independent paths to a forged credit were observed in a single session:

1. A gate fixture at `tests/gate-fixtures/pd-9/…/money.test.ts` carried a real annotation. `PATHS.testDirs` includes `tests/`, so the checker scanned it and credited the production `FR-CALC-01`. The traceability report silently fell from 34 test-trace warnings to 33 with **zero annotations in `src/`**. Fixed by moving fixtures to `tests/.gate-fixtures/` (`walk()` skips dot-prefixed entries).
2. While removing five adversarially-refuted annotations, the replacement comments read `// No @trace FR-EXPORT-02: this test cannot prove it`. All four disclaimed requirements were **re-credited immediately**.
3. Any doc comment discussing traceability and naming the marker would do the same.

Three paths to one defect means the mechanism invites the mistake. That is a mechanism defect, not carelessness.

## Target file

`scripts/check-traceability.mjs` (gate-bearing) and `.github/workflows/ci.yml` (gate-bearing) — the new proof must run in CI or it is a decorative check.

## Exact diff

```diff
--- a/scripts/check-traceability.mjs
+++ b/scripts/check-traceability.mjs
-const TRACE_ANNOTATION_RE = new RegExp(`@trace\\s+(${ID_PATTERN}(?:\\s*,\\s*${ID_PATTERN})*)`, "g");
+const TRACE_ANNOTATION_RE = new RegExp(
+  `^[ \\t]*(?://+|\\*|#)[ \\t]*@trace[ \\t]+(${ID_PATTERN}(?:[ \\t]*,[ \\t]*${ID_PATTERN})*)`,
+  "gm",
+);

--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
       - name: Gate self-tests
         run: |
           node tests/check-trajectory-retrofit.test.mjs
           node tests/check-traceability-trace-ids.test.mjs
+          node tests/check-traceability-anchor.test.mjs
```

The annotation must now be the first token of a line comment (`//`), a block-comment continuation (`*`), or a `#` comment. All 29 existing annotations already satisfy this — verified before landing, so the fix loses none.

## Expected metric movement

- **Metric:** requirements credited by a non-annotation mention.
- **Current:** 4 (`FR-CALC-01`, `FR-INPUT-01`, `FR-EXPORT-02`, `FR-EXPORT-03` — all credited by comments denying the evidence).
- **Expected after fix:** 0.
- **Guard:** traced count must stay at exactly 20 of 34 MVP FRs.

## EXECUTED red→green proof

`tests/check-traceability-anchor.test.mjs`. The `prose` fixture contains only a negation and a mid-sentence mention; the `anchored` fixture contains a real annotation.

The test file writes the marker only through a variable, never literally — otherwise it would credit a requirement from its own source, which is the very defect.

### BEFORE

```text
FAIL prose: exit code: got 0, want 1
FAIL prose: reports the FR as untraced: got false, want true
ok   anchored: exit code: got 0, want 0
ok   anchored: no test-trace failure: got false, want false

2/4 checks passed
```

`exit 0` over a comment reading *"No `@trace` FR-CALC-01"*. The gate passed on a disclaimer.

### AFTER

```text
4/4 checks passed
```

Cross-checks, same commit:

```text
pd-9: 6/6 checks passed
pd-3: 7/7 checks passed
traced: 20   untraced: 14   (unchanged — no annotation lost)
Tests  220 passed (220)
```

## Rollback (one revert)

- **Single commit:** yes. `git revert <sha>`.
- **State to clean up:** none; reports regenerate.
- **Ladder position:** experimental. It can only stop a false PASS, never create one.

## Approval & trailer convention

- Human approver: Serhii · Date: 2026-07-10 (approved in-session: "Виправити зараз")
- Commit trailer: `Refs: PD-12`
