## 1. Selectors and sorting (FR-SCORE-03)

- [x] 1.1 Use `selectPrograms` in `app/lib/recommend.ts` to score every program and sort fitting-first by descending chance
- [x] 1.2 Ensure non-fitting programs (chosen elective not accepted) rank last via the `fits ? chance : -1` sort key
- [x] 1.3 Expose `categoryLabel(evaluation)` so cards render the Ukrainian category word or the "Інший предмет НМТ" note

## 2. Recommendation cards — chance, band, category (FR-SCORE-02, NFR-A11Y-01, BC-HONESTY-01)

- [x] 2.1 Render one `ProgramCard` per visible program with university, program·city, and quick facts
- [x] 2.2 Render the `.pk-ring` `ChanceRing` with the point chance and an `aria-label` stating chance + category
- [x] 2.3 Render the `lo–hi %` band label next to the ring (never a bare chance number)
- [x] 2.4 Render the `.pk-pill` `CategoryPill` with a colored dot AND a text label (not color-only)
- [x] 2.5 Add a `.pk-sr-only` summary repeating chance, band, and category in text

## 3. Non-fitting programs (BC-HONESTY-01)

- [x] 3.1 For `fits === false`, render a muted "—" ring and a neutral category pill (no traffic-light color)
- [x] 3.2 Show the "Інший предмет НМТ" marker and an accessible label; render no invented chance percentage

## 4. Empty state and honesty framing (FR-UX-01, BC-HONESTY-01)

- [x] 4.1 Render a `.pk-empty` panel with a title and a hint (change filter / adjust scores) when the visible set is empty
- [x] 4.2 Confirm the shell disclaimer (chances are estimates, not guarantees) stays visible with results
- [x] 4.3 Surface the data-freshness label (`DATA_AS_OF`) so the admissions session is visible

## 5. Validation and handoff

- [x] 5.1 Run `openspec validate add-recommendations --strict` and confirm it passes
- [x] 5.2 Update `docs/current-state.md` with an entry for the recommendations spec backfill
