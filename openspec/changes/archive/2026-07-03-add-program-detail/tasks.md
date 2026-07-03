## 1. Domain glue (selectors, no UI)

- [x] 1.1 Confirm `scoreBreakdown(program, scores, benefits, elective)` in `app/lib/recommend.ts` returns one row per weighted subject as `label ×weight` + `score × weight` value, and appends a benefit row `Пільга ×(1+bonus)` only when the bonus > 0
- [x] 1.2 Confirm `evaluate()` in `app/lib/scoring.ts` returns `competitive`, `chance`, `band [lo,hi]`, and `category`, and that the breakdown rows sum to `competitive`
- [x] 1.3 Confirm `adviceFor(program, evaluation)` and `categoryLabel(evaluation)` produce Safe/Realistic/Reach copy from the §6 thresholds and the Ukrainian category label

## 2. Detail modal component

- [x] 2.1 Build `app/components/planner/DetailModal.tsx` taking `{ programId, profile, onClose }` and resolving the program via `getProgram`
- [x] 2.2 Render the header (university, specialty · city · budget) and the chance ring + category label + advice using `.pk-card` / design-system components
- [x] 2.3 Render the breakdown block: one row per `scoreBreakdown` entry plus the "Конкурсний бал" total, all `uk-UA`-formatted via `app/lib/format.ts`
- [x] 2.4 Render the 3-year cutoff bars (2022/2023/2024) with `.pk-bars`, labelling each bar with year + value and highlighting 2024
- [x] 2.5 Render the uncertainty-band + disclaimer sentence (`Шанс … — це оцінка з діапазоном lo–hi % …, а не гарантія`)
- [x] 2.6 Render the footer actions (⇄ compare toggle, ★ save toggle) reflecting `profile.inCompare` / `profile.isSaved` via `aria-pressed`

## 3. Accessibility and dialog behavior

- [x] 3.1 Set `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at the title element on the modal container
- [x] 3.2 Move focus to the close button on mount; give the close button `aria-label="Закрити"`
- [x] 3.3 Close on Escape (keydown listener) and on overlay click, while stopping propagation on inner-content clicks
- [x] 3.4 Ensure the risk-category color is always paired with its text label (no color-only signal), per NFR-A11Y-01

## 4. Tests

- [x] 4.1 Unit test: `scoreBreakdown` contributions (+ benefit row when active) sum to `evaluate().competitive` for a fitting program
- [x] 4.2 Unit test: `adviceFor` / `categoryLabel` return the correct Safe/Realistic/Reach copy at the 75 % and 40 % boundaries
- [x] 4.3 Component test: modal exposes `role="dialog"` + `aria-modal`, focuses the close button on open, and closes on Escape and overlay click but not on inner clicks
- [x] 4.4 Component test: band + disclaimer sentence render for both a low and a high (90 %+) chance program

## 5. Validation, docs, and archive prep

- [x] 5.1 Run lint (`npm run lint`) and fix any issues in the touched files
- [x] 5.2 Run unit + component tests and confirm the new tests pass
- [x] 5.3 Run `next build` and confirm it succeeds with no type errors
- [x] 5.4 Run `openspec validate add-program-detail --strict` and confirm it passes
- [x] 5.5 Run `openspec validate --all --strict` and confirm the whole spec set still passes
- [x] 5.6 Update `README` (if capability list is documented there) and append a `docs/current-state.md` entry for the program-detail slice
- [x] 5.7 Manual smoke test: from a recommendation card, open the detail modal for a fitting program; verify (a) the breakdown rows sum to the "Конкурсний бал" total, (b) three cutoff bars show with 2024 highlighted, (c) the advice matches the category, (d) the band + not-a-guarantee sentence appear, (e) focus lands on the close button and Escape + overlay click close it while inner clicks do not
- [x] 5.8 Run `npx openspec archive add-program-detail --yes` only after the smoke test in 5.7 passes
