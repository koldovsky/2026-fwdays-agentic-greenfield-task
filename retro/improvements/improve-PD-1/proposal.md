# Improvement Proposal: improve-PD-1

- **Defect:** PD-1 — `check-traceability.mjs` and `check-acceptance-methods.mjs` detect only `| Future |` as non-MVP, so a `dropped` requirement is counted as an MVP obligation and demanded tests, recordings, and a verification tag.
- **Class / severity:** check-too-weak / P1
- **Status:** approved

## Scope

Both checkers learn that a `| dropped |` status cell is non-MVP, exactly like `| Future |`. `FR-NACE-06` ("SHALL NOT print a NACE code") and `FR-INPUT-03` ("SHALL NOT expose chat/LLM input") are dropped negative requirements — satisfied by omission, with no honest test or recording to point at. They leave the MVP obligation set in both scripts.

Two gate-bearing files change together because they share the identical phase-detection bug and must stay consistent; the integrity lock expects exactly these two to drift under `Refs: PD-1`.

## Exact diff

Both files, same edit:

```diff
-const phase = /\|\s*Future\s*\|/i.test(line) ? "Future" : "MVP";
+const nonMvp = line.match(/\|\s*(Future|dropped)\s*\|/i);
+const phase = nonMvp ? nonMvp[1].toLowerCase() : "MVP";
```

## Expected metric movement

- **Metric:** MVP FRs counted by `check-traceability`.
- **Current:** 38 (includes 2 dropped).
- **After:** 36. Warnings 53 -> 49 (the dropped rows no longer demand test + recording evidence).

## EXECUTED red->green proof

`tests/check-dropped-status.test.mjs` runs BOTH checkers against a fixture with one shipped MVP FR and one dropped FR.

BEFORE: 2/5 (the dropped FR was demanded a test by traceability and flagged untagged by acceptance).
AFTER:  5/5.
Cross-checks unchanged: pd-3 7/7, pd-9 6/6, pd-12 4/4.

## Rollback

Single commit; `git revert <sha>`. Reports regenerate. Experimental ladder.

## Approval

Human approver: Serhii, 2026-07-10 (in-session: "Improvement proposal (Recommended)"). Commit trailer: `Refs: PD-1`.
