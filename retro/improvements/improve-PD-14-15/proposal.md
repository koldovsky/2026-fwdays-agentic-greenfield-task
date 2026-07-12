# Improvement Proposal: improve-PD-14-15

- **Defects:** PD-14, PD-15 — both in `.claude/workflows/review-gate.js`, both surfaced while running the first earned slice's review.
- **Class / severity:** PD-14 missing-check / P1 (the workflow was broken); PD-15 check-too-weak / P1 (a slice review cannot reach clean:true).
- **Status:** approved

## PD-14 — bare agent-type names do not resolve

The workflow referenced `agentType: 'security-reviewer'` and `'spec-compliance-auditor'`, which are only registered as `project-factory:`-prefixed. The first S5 review lost 2 of its 4 dimensions to `agent type not found` and reviewed the whole tree instead of the slice. All specialist agent types are now `project-factory:`-prefixed. (All six installed workflows share this bug; this fixes review-gate; the others are noted for follow-up.)

## PD-15 — a slice review's dependency audit was whole-tree

The security dimension ran `npm audit` over the entire tree, so a pre-existing MODERATE transitive advisory (postcss bundled in `next` 16.2.9, unfixable without downgrading next) was confirmed on EVERY slice — making `clean:true` unreachable for any slice while that advisory exists, even one that changed no dependencies. Since `check-trajectory` (PD-8) requires `clean:true` to archive, this blocked every earned slice.

Fix: for a slice review (baseRef set) the dependency audit is scoped to deps the slice changed (`git diff baseRef -- package.json`). A pre-existing advisory in an untouched dependency is out of scope. Whole-tree/global reviews (no baseRef) still audit everything.

## Enhancement (folded in) — lighter reviews for logic slices

Verifier lenses are now configurable: `args.thorough` (or a global review) uses both the correctness and exploitability lenses; the default is the single correctness lens — enough to refute a wrong finding at ~half the verify cost, which fits small logic slices. The verdict logic generalizes to any lens count (`refutes >= lenses.length ? rejected : refutes > 0 ? contested : confirmed`).

## Target file

`.claude/workflows/review-gate.js` (gate-bearing; in factory-lock).

## Proof

- `node --check .claude/workflows/review-gate.js` — syntax ok.
- The first S5 review (bare agentType) lost the security + spec-compliance dimensions; after the prefix fix, the second review ran all four. That is the executed before/after for PD-14.
- PD-15 + lighter verified by the re-run of the S5 review from the fixed workflow: the transitive npm advisory is no longer reported for a slice that changed no deps, and the review reaches clean over the (already code-clean) slice.

## Rollback

Single commit; `git revert <sha>`. Experimental ladder.

## Approval

Serhii, 2026-07-10 (in-session: "PD-15 scoped-audit" + "легша рецензія"). Trailer: `Refs: PD-14, PD-15`.
