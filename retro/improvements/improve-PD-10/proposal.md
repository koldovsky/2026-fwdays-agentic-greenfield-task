# Improvement Proposal: improve-PD-10

- **Defect:** PD-10 — `check-trajectory`'s `Slice:` trailer predicate used a free-text `git log --grep=Slice: <name>` and never checked what the commit changed. One docs-only commit (`5bcbfe9`) carried ten `Slice:` trailers and satisfied the predicate for ten slices while touching zero source files.
- **Class / severity:** vacuous-pass / P0
- **Status:** approved

## Fix

A commit counts as a trailer commit for a slice only if it (a) carries `Slice: <name>` as a REAL trailer (`git show %(trailers:key=Slice)`, not a prose match) AND (b) touched the slice's own implementation (`^(src|app|lib|db|components|tests)/`). A docs / openspec-only commit touches none of these and no longer counts.

Only earned (non-retrofit) slices are affected; retrofit slices already render RETROFITTED via improve-PD-3.

## EXECUTED red->green proof

`tests/check-slice-trailer.test.mjs` builds real git repos in a temp dir:
- a docs-only commit carrying `Slice: add-thing` (the forgery shape)
- an impl commit touching `src/lib/thing/` carrying the same trailer

```text
before: 1/2 (docs-only commit counted, trailerCommits=1)
after:  2/2 (docs-only 0, impl commit >=1)
```

Cross-checks unchanged: pd-3 7/7, pd-9 6/6, pd-12 4/4, pd-1 5/5.
Real repo: the forgery no longer inflates the retrofit slices' trailer counts
(trajectory warnings 10 -> 20, all on retrofit slices, verdict still NOT-EARNED).

## Rollback

Single commit; `git revert <sha>`. Experimental ladder.

## Approval

Serhii, 2026-07-10 (in-session: "закрити PD-8/PD-10"). Trailer: `Refs: PD-10`.
