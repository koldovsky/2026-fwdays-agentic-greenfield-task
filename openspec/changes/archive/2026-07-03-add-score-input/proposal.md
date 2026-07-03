## Why

The whole product flow starts with the applicant describing themselves: their NMT
results, which 4th subject they took, and any admissions benefits they hold. Without
a validated, always-recomputing input surface there is nothing to score and nothing
to recommend — `scoring-engine` and `recommendations` have no source of truth. This
change backfills the spec for the `score-input` capability that is already
implemented in `app/components/planner/ScorePanel.tsx`: the elective picker, four NMT
score sliders, and the benefit toggles, all wired into the profile store so every
change flows into recomputation instantly (`NFR-PERF-01`) and persists across sessions
(`FR-STATE-01`). It exists on the design-system shell established by Wave 0
`app-shell`, so it inherits Ukrainian locale, fonts, and the global honesty surfaces.

## What Changes

- Add the **four NMT score inputs** — three required subjects (Українська мова,
  Математика, Історія України) plus one elective slot — each constrained to the valid
  NMT range 100–200 via a design-system `.pk-range` slider (`FR-INPUT-01`).
- Add the **elective (4th-subject) picker** as `.pk-chip` buttons over the six
  supported subjects (Англійська / Біологія / Фізика / Хімія / Географія / Німецька);
  the chosen elective relabels the 4th score row and changes the set of programs
  considered eligible downstream (`FR-INPUT-02`).
- Add the **benefit toggles** (rural coefficient, preferential quota, special
  conditions) as `.pk-toggle-row` controls; each active benefit adds its bonus
  fraction to the competitive score (`FR-INPUT-03`).
- Wire every control into the profile store so a change **recomputes instantly**
  (`NFR-PERF-01`) and **persists** across reloads (`FR-STATE-01`).
- Meet accessibility expectations (`NFR-A11Y-01`): each slider has a `<label>` and
  `aria-valuetext`; chips and toggles expose `aria-pressed`; the picker and benefit
  groups carry `role="group"` with an `aria-label`.

## Capabilities

### New Capabilities
- `score-input`: the applicant-facing input surface — four validated NMT scores, the
  elective picker that gates program eligibility, and the benefit toggles — emitting
  the current profile to the scoring engine and persisting it between sessions.

### Modified Capabilities
<!-- None — score-input is a new capability; it consumes app-shell but changes no existing requirement. -->

## Impact

- **Code:** `app/components/planner/ScorePanel.tsx` (the input UI); relies on
  `app/hooks/useProfile.ts` + `app/lib/profileStore.ts` for state/persistence,
  `app/lib/scoring.ts` for `SCORE_MIN`/`SCORE_MAX`/`clampScore`, `app/lib/programs.ts`
  for the `BENEFITS` catalog, and `app/lib/types.ts` for subjects/electives.
- **Requirements traced:** `FR-INPUT-01`, `FR-INPUT-02`, `FR-INPUT-03`, plus
  `NFR-PERF-01`, `NFR-A11Y-01`, `FR-STATE-01` that travel with the inputs.
- **Downstream:** feeds `scoring-engine`, `recommendations`, and `filtering`; no
  backend or network impact (client-side state only, per `TC-STORAGE-01`).
