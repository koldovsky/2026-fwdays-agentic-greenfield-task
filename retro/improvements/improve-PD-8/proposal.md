# Improvement Proposal: improve-PD-8

- **Defect:** PD-8 — `check-trajectory` reduced review evidence to `JSON.parse(rf).clean === true`, ignoring `generatedBy`, `dimensions`, and `baseRef`. A future earned slice could ship a hand-written `{ "clean": true }` file that no review produced.
- **Class / severity:** check-too-weak / P1 (the sibling of PD-3/PD-10; those closed the realized forgery, this closes the predicate for future slices)
- **Status:** approved

## Fix

A `clean:true` review-findings.json is trusted only when it is a real review-gate output: `generatedBy === "review-gate"` AND `dimensions` is a populated object (the fingerprint of the dimension pipeline in `.claude/workflows/review-gate.js`). A bare `{clean:true}` or a `generatedBy:"retrofit"` shape is an `unverified-stamp`, treated like a missing review (fails under `--release`).

## EXECUTED red->green proof

`tests/check-review-evidence.test.mjs` (non-git temp fixtures):

```text
before: 3/6 (hand-stamped clean:true trusted, passed --release)
after:  6/6
```
- hand-stamped `{clean:true}` -> not clean, fails --release
- `generatedBy:"retrofit"` shape -> not clean
- real review-gate output -> clean, passes
- review-gate `clean:false` -> still fails (guard: not defanged)

Cross-checks unchanged: pd-1 5/5, pd-3 7/7, pd-9 6/6, pd-10 2/2, pd-12 4/4.

## Rollback

Single commit; `git revert <sha>`. Experimental ladder.

## Approval

Serhii, 2026-07-10 (in-session: "закрити PD-8/PD-10"). Trailer: `Refs: PD-8`.
