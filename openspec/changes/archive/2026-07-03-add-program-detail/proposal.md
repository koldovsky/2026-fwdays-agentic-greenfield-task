## Why

An applicant (and especially a parent co-user) needs to understand *where the
number comes from* before they trust it. A recommendation card shows a chance %
and a category, but it does not explain how the competitive score was assembled,
how volatile the program's cutoff has been, or what the applicant should
actually do with the estimate. Prokhidnyi replaces manual Excel analysis, so the
"show your work" moment is the trust anchor of the whole product: the breakdown
must visibly sum to the competitive score, and the estimate must be framed
honestly as a range, never a guarantee (`FR-DETAIL-01`, `BC-HONESTY-01`).

This slice adds the `program-detail` capability: a focused modal that explains a
single program end to end. It is a leaf view linked from `recommendations`,
`comparison`, and `shortlist`; it depends on `scoring-engine`, `program-data`,
and `app-shell` and introduces no new data or persistence.

## What Changes

- Add a program-detail modal (`DetailModal`) opened for one program id against
  the current profile.
- Render a per-subject competitive-score breakdown: for each weighted subject a
  `score × weight → contribution` row, plus a benefit-multiplier row when a
  benefit is active, whose rows sum to the competitive score shown as the total
  (`FR-DETAIL-01`).
- Render a 3-year cutoff history (2022–2024) as a bar chart with the latest year
  highlighted (`FR-DETAIL-01`).
- Render category-appropriate advice text (Safe / Realistic / Reach per §6),
  derived from the point chance.
- Render the uncertainty band `lo–hi %` and a plain-language disclaimer sentence
  in context, stating the chance is an estimate with a range, not a guarantee
  (`BC-HONESTY-01`).
- Make the modal an accessible dialog: `role="dialog"`, `aria-modal="true"`,
  labelled by the program title, closable via Escape and overlay click, with
  focus moved to the close button on open.
- Provide add-to-compare and save actions from the modal footer, reflecting the
  current compare/saved state (state owned by `comparison` / `shortlist`).

## Capabilities

### New Capabilities
- `program-detail`: the single-program explanation modal — score breakdown that
  sums to the competitive score, 3-year cutoff history bar chart,
  category-appropriate advice, and the in-context uncertainty band + disclaimer,
  presented as an accessible dialog.

### Modified Capabilities
<!-- None — this slice introduces a new leaf capability; it consumes existing
scoring-engine / program-data / app-shell surfaces without changing them. -->

## Impact

- **Code:** `app/components/planner/DetailModal.tsx`; consumes
  `app/lib/recommend.ts` (`scoreBreakdown`, `adviceFor`, `categoryLabel`),
  `app/lib/scoring.ts` (`evaluate`), `app/lib/programs.ts` (`getProgram`), and
  `app/lib/format.ts`.
- **Requirements traced:** `FR-DETAIL-01`, `BC-HONESTY-01`; plus
  `NFR-A11Y-01` (dialog semantics, non-color-only signals) and `BC-LANG-01`
  (Ukrainian copy, `uk-UA` number formatting) inherited from `app-shell`.
- **Downstream:** none — leaf view. No new persistence, data, or backend.
