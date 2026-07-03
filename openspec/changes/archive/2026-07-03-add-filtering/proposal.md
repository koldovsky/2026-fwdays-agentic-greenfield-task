## Why

Eleven programs already crowd the recommendation list, and a real registry will hold
far more. Applicants and parents narrow by what they care about — field of study, city,
and how risky an option is — to turn the full list into a shortlist worth acting on
(FR-FILTER-01, FR-FILTER-02). This change backfills the spec for the already-implemented
`filtering` capability (`app/components/planner/{FilterPanel,CategoryTabs}.tsx` and the
selectors in `app/lib/recommend.ts`): multi-select field & city chips sourced from the
program registry, combinable and instant; risk-category tabs over the computed
categories; and a helpful empty-filter state so narrowing to nothing never yields a
blank screen (FR-UX-01).

## What Changes

- Add **multi-select field and city filters** as `.pk-chip` buttons, with the options
  sourced from the program registry (`FIELDS`, `CITIES`). Filters are **combinable** —
  a program must match a selected field AND a selected city to remain — and an empty
  selection in a group means "no narrowing" for that group (`FR-FILTER-01`).
- Add **risk-category tabs** (Усі / Надійно / Реально / Мрія) that filter the list over
  the categories computed by the scoring engine; "Усі" shows everything including
  non-fitting programs (`FR-FILTER-02`).
- Make every filter change **re-render instantly** with no submit step (`NFR-PERF-01`).
- Show a **helpful empty-filter state** with a hint to relax the filters whenever the
  combination matches nothing, never a blank screen (`FR-UX-01`).
- Keep the controls accessible (`NFR-A11Y-01`): each filter group is a `role="group"`
  with an `aria-label`, and chips/tabs expose `aria-pressed`.

## Capabilities

### New Capabilities
- `filtering`: multi-select field & city filters and risk-category tabs that narrow the
  recommendation list in place, combinable and instant, with a helpful empty-filter
  state instead of a blank screen.

### Modified Capabilities
<!-- None — filtering is a new capability; it refines the recommendations list in place and changes no existing requirement. -->

## Impact

- **Code:** `app/components/planner/FilterPanel.tsx` (field/city chips),
  `CategoryTabs.tsx` (risk tabs); selectors `selectPrograms` and `matchesCategory` in
  `app/lib/recommend.ts`; options from `FIELDS`/`CITIES` in `app/lib/programs.ts`; state
  via `app/hooks/useProfile.ts` (`toggleField`, `toggleCity`).
- **Requirements traced:** owns `FR-FILTER-01`, `FR-FILTER-02`; cites `FR-UX-01`; carries
  `NFR-PERF-01` and `NFR-A11Y-01`.
- **Downstream:** refines `recommendations` in place; no backend or network impact
  (name search, `program-search`, is Phase 3 and out of scope here).
