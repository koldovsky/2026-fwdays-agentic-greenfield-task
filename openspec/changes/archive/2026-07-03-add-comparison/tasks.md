## 1. Selection state and domain glue

- [x] 1.1 Confirm the profile store exposes `compare` (id array), `toggleCompare`, and `MAX_COMPARE = 3`, and that `toggleCompare` refuses to add beyond 3
- [x] 1.2 Confirm `compareAdvice(scored)` in `app/lib/recommend.ts` returns "" for < 2 and otherwise names the highest-chance option as priority 1
- [x] 1.3 Add/confirm a selector that resolves the `compare` ids to `{ program, evaluation }` pairs against the current profile via `evaluate`

## 2. Comparison view

- [x] 2.1 Build `app/components/planner/Comparison.tsx` reading `profile.compare` and evaluating each selected program
- [x] 2.2 Compute `ready = selected.length >= 2`; render the empty state when not ready and the table when ready
- [x] 2.3 Render the `.pk-table`: a column per selected program (headed by university + specialty) and rows for chance (+ band + category), last year's cutoff (2024), the applicant's competitive score, budget seats, tuition, city, and dormitory ("так"/"ні")
- [x] 2.4 Format all numeric/percentage values with `app/lib/format.ts` (`uk-UA`)
- [x] 2.5 Render the `compareAdvice` recommendation text below the table in a `.pk-card` / callout

## 3. Accessibility

- [x] 3.1 Ensure the chance category color is paired with its text label (no color-only signal) per NFR-A11Y-01
- [x] 3.2 Ensure the table uses proper header semantics and remains readable/scrollable at phone width without horizontal clipping

## 4. Empty state

- [x] 4.1 Render a `.pk-empty` state for < 2 selections prompting "Додай 2–3 варіанти кнопкою ⇄ …"
- [x] 4.2 Verify de-selecting back below 2 returns to the empty state

## 5. Tests

- [x] 5.1 Unit test: `compareAdvice` returns "" for < 2 and names the max-chance program for 2 and 3 selections
- [x] 5.2 Unit test: `toggleCompare` caps the set at 3 and toggles membership correctly
- [x] 5.3 Component test: with 2 selections the table renders every required row and column; with 1 selection the empty state renders instead
- [x] 5.4 Component test: the highest-chance option is named as priority 1 in the recommendation

## 6. Validation, docs, and archive prep

- [x] 6.1 Run lint (`npm run lint`) and fix issues in touched files
- [x] 6.2 Run unit + component tests and confirm the new tests pass
- [x] 6.3 Run `next build` and confirm it succeeds with no type errors
- [x] 6.4 Run `openspec validate add-comparison --strict` and confirm it passes
- [x] 6.5 Run `openspec validate --all --strict` and confirm the whole spec set still passes
- [x] 6.6 Update `README` (if capability list is documented there) and append a `docs/current-state.md` entry for the comparison slice
- [x] 6.7 Manual smoke test: mark 2 programs with ⇄, open the comparison view, and verify (a) both appear as columns, (b) every required row shows with `uk-UA` values and "так"/"ні" for dormitory, (c) the recommendation names the higher-chance option as priority 1; add a 3rd (third column appears) and confirm a 4th is refused; de-select down to 1 and confirm the empty state prompts the ⇄ button
- [x] 6.8 Run `npx openspec archive add-comparison --yes` only after the smoke test in 6.7 passes
