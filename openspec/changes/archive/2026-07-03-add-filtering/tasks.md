## 1. Filter options from the registry (FR-FILTER-01)

- [x] 1.1 Source field options from `FIELDS` and city options from `CITIES` in `app/lib/programs.ts`
- [x] 1.2 Read/write the selected fields and cities via `useProfile` (`toggleField`, `toggleCity`)

## 2. Field and city filter panel (FR-FILTER-01, NFR-A11Y-01)

- [x] 2.1 Render field chips as `.pk-chip` buttons inside a `role="group"` labelled "Фільтр за напрямом"
- [x] 2.2 Render city chips as `.pk-chip` buttons inside a `role="group"` labelled "Фільтр за містом"
- [x] 2.3 Reflect each chip's selected state via `aria-pressed`; empty selection = no narrowing for that group
- [x] 2.4 Apply the field/city predicate (match a selected field AND a selected city) in `selectPrograms`

## 3. Risk-category tabs (FR-FILTER-02)

- [x] 3.1 Render `CategoryTabs` (Усі / Надійно / Реально / Мрія) inside a `role="group"` labelled "Фільтр за категорією шансу"
- [x] 3.2 Apply `matchesCategory`: "Усі" shows all (including non-fitting); a specific tab shows only matching fitting programs
- [x] 3.3 Mark the active tab via `aria-pressed`

## 4. Instant re-render and empty state (NFR-PERF-01, FR-UX-01)

- [x] 4.1 Ensure every filter toggle re-renders the list instantly with no submit step, filters combining
- [x] 4.2 Render the `.pk-empty` hint when the filter combination matches nothing (never a blank screen)

## 5. Validation and handoff

- [x] 5.1 Run `openspec validate add-filtering --strict` and confirm it passes
- [x] 5.2 Update `docs/current-state.md` with an entry for the filtering spec backfill
