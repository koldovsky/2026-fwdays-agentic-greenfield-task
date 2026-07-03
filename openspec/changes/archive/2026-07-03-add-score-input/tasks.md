## 1. Domain and data wiring (FR-INPUT-01/02/03)

- [x] 1.1 Reuse `SCORE_MIN`/`SCORE_MAX` and `clampScore` from `app/lib/scoring.ts` for the valid NMT range (100–200)
- [x] 1.2 Source the elective options from `ELECTIVE_SUBJECTS` and required-subject labels from `REQUIRED_SUBJECTS` in `app/lib/types.ts`
- [x] 1.3 Source the benefit catalog (key, label, description, bonus) from `BENEFITS` in `app/lib/programs.ts`

## 2. Score inputs (FR-INPUT-01)

- [x] 2.1 Render four `.pk-range` sliders — ukr, math, hist, and the elective slot — each with `min={SCORE_MIN}` and `max={SCORE_MAX}`
- [x] 2.2 Show each subject's current value next to its label, formatted via `formatNumber` (uk-UA)
- [x] 2.3 On change, write the value into the profile store via `profile.setScore(key, value)`

## 3. Elective picker (FR-INPUT-02)

- [x] 3.1 Render the six elective subjects as `.pk-chip` buttons in a `role="group"` labelled "Четвертий предмет НМТ"
- [x] 3.2 Mark the chosen chip with `aria-pressed`; on click call `profile.setElective(subject)`
- [x] 3.3 Relabel the 4th score row to the chosen elective so it stays consistent with eligibility downstream

## 4. Benefit toggles (FR-INPUT-03)

- [x] 4.1 Render each benefit as a `.pk-toggle-row` button showing its label and description
- [x] 4.2 Reflect on/off state with `aria-pressed` and the `--on` modifier; on click call `profile.toggleBenefit(key)`

## 5. Recompute + persistence + a11y (NFR-PERF-01, FR-STATE-01, NFR-A11Y-01)

- [x] 5.1 Route all mutations through `useProfile` so changes recompute instantly and persist via the profile store (localStorage)
- [x] 5.2 Give each slider a `<label htmlFor>` and an `aria-valuetext` ("N балів")
- [x] 5.3 Confirm no control conveys state by color alone (chips/toggles use `aria-pressed`, not color only)

## 6. Validation and handoff

- [x] 6.1 Run `openspec validate add-score-input --strict` and confirm it passes
- [x] 6.2 Update `docs/current-state.md` with an entry for the score-input spec backfill
