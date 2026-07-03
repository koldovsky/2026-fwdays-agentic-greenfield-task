## Why

Deciding *where to apply* is a comparison problem, not a single-program lookup.
US-4 is explicit: parents and applicants want to weigh 2–3 options side by side
across the factors that actually drive the decision — chance, last year's
cutoff, the applicant's own competitive score, budget seats, tuition cost, city,
and whether there's a dormitory — and then get a plain-language nudge about which
to prioritize. Today that lives in a spreadsheet; Prokhidnyi should put it in one
honest table with a text recommendation (`FR-COMPARE-01`).

This slice adds the `comparison` capability: a leaf view that reads the ids the
user marked for comparison (via the ⇄ button on recommendation cards and in the
detail modal), scores each against the current profile, and renders the
side-by-side `.pk-table` plus a recommendation. It depends on `scoring-engine`,
`program-data`, and `app-shell`; selection state is shared with those entry
points and persisted by `state-persistence`.

## What Changes

- Add a comparison view (`Comparison`) that reads the selected program ids (2–3)
  and evaluates each against the current profile.
- Render a side-by-side `.pk-table`: a column per selected program and a row per
  compared attribute — chance %/band + category, last year's cutoff (2024), the
  applicant's competitive score, budget seats, tuition, city, and dormitory
  (`FR-COMPARE-01`).
- Render a text recommendation reasoning across the compared options: the
  highest-chance option is framed as priority 1 (`FR-COMPARE-01`).
- Render an empty state when fewer than 2 programs are selected, prompting the
  user to add options with the ⇄ button.
- Enforce the 2–3 range: comparison is "ready" only with ≥ 2 selections, and
  selection is capped at 3 by the shared store.

## Capabilities

### New Capabilities
- `comparison`: the side-by-side comparison table for 2–3 programs across
  chance/band + category, cutoff, competitive score, seats, tuition, city, and
  dormitory, with a highest-chance-first text recommendation and an empty state
  below the minimum.

### Modified Capabilities
<!-- None — new leaf capability; the ⇄ selection state it reads is owned by the
shared profile store and surfaced by recommendations / program-detail. -->

## Impact

- **Code:** `app/components/planner/Comparison.tsx`; consumes
  `app/lib/recommend.ts` (`selectPrograms`/`compareAdvice`, `categoryLabel`),
  `app/lib/scoring.ts` (`evaluate`), `app/lib/programs.ts`,
  `app/lib/profileStore.ts` (`compare`, `MAX_COMPARE`, `toggleCompare`), and
  `app/lib/format.ts`.
- **Requirements traced:** `FR-COMPARE-01`; plus `NFR-A11Y-01` (non-color-only
  category, table semantics) and `BC-LANG-01` (Ukrainian copy, `uk-UA` formatting)
  inherited from `app-shell`, and the passive band display of `BC-HONESTY-01`.
- **Downstream:** none — leaf view. No new persistence or backend; selection uses
  the existing `compare` array in the profile store.
