## 1. Types & i18n

- [x] 1.1 Add `PinnedCity` type (`{ lat: number; lon: number; name: string }`) to `lib/forecast/types.ts`
- [x] 1.2 Add weekend-compare i18n keys to `lib/i18n/uk.ts`: `compare.toggle`, `compare.saturday`, `compare.sunday`, `compare.makeActive`, `compare.unpin`, `compare.noData`
- [x] 1.3 Add matching English keys to `lib/i18n/en.ts`

## 2. Pinned cities state

- [x] 2.1 Create `hooks/usePinnedCities.ts` — returns `{ pins, pin, unpin }` with max-3 and duplicate-guard logic
- [x] 2.2 Wire `usePinnedCities` into the page/layout component that owns the active location state

## 3. Pin button

- [x] 3.1 Add a pin toggle button to the active location chip / search result row; reflect pinned/unpinned visual state
- [x] 3.2 Ensure pin button has an accessible `aria-label` in Ukrainian ("Закріпити <CityName>" / "Відкріпити <CityName>")

## 4. Pinned city chip row

- [x] 4.1 Create `components/PinnedCities/PinnedChipRow.tsx` — renders a flex chip list; hidden when `pins` is empty
- [x] 4.2 Each chip shows city name + dismiss (×) button with `aria-label="Відкріпити <CityName>"`
- [x] 4.3 Integrate `PinnedChipRow` above the forecast panel in the page layout

## 5. Compare toggle

- [x] 5.1 Add `isComparing` boolean state (defaults to `false`) to the page component; reset to `false` when `pins` becomes empty
- [x] 5.2 Render "Порівняти вихідні" toggle button in the forecast header when `pins.length > 0`; set `aria-pressed` correctly
- [x] 5.3 Clicking the toggle flips `isComparing`; the forecast panel swaps with the compare table accordingly

## 6. Parallel forecast fetching for pinned cities

- [x] 6.1 Create `hooks/useCompareForecasts.ts` — accepts `pins: PinnedCity[]`; calls `GET /api/forecast?lat=&lon=` for each in parallel via `Promise.all`; returns `{ data: (ForecastResponse | null)[]; loading: boolean[] }`
- [x] 6.2 Ensure fetches are re-triggered when `pins` changes; avoid duplicate fetches for unchanged lat+lon pairs (use a cache keyed by `${lat},${lon}`)

## 7. Weekend compare table

- [x] 7.1 Create `components/WeekendCompare/CompareTable.tsx` — renders a table with one column per pinned city
- [x] 7.2 Extract Saturday and Sunday entries from each `ForecastResponse.days` array; show "—" for missing days
- [x] 7.3 Each data row shows: hi °C, lo °C, precip %, comfort score badge (reuse `ComfortBadge` component from `comfort-score`)
- [x] 7.4 Show per-column skeleton placeholders while `loading[i]` is true
- [x] 7.5 Add horizontal scroll to the table container for viewports < 768 px

## 8. Sticky column headers

- [x] 8.1 Each column header renders city name + "Зробити активним" button with `aria-label="Зробити <CityName> активним"`
- [x] 8.2 Column headers use `position: sticky; top: 0` so they stay visible on vertical scroll
- [x] 8.3 Clicking "Зробити активним" updates `?lat=&lon=&name=` URL params, sets the city as active, and sets `isComparing` to `false`

## 9. Accessibility & design system

- [x] 9.1 Verify all interactive elements (pin button, chip dismiss, toggle, make-active button) have visible focus rings using design-system tokens
- [x] 9.2 Verify comfort badges in the compare table use `--comfort-good-*`, `--comfort-fair-*`, `--comfort-poor-*` tokens and have correct `aria-label`
- [x] 9.3 Run Lighthouse accessibility audit; score must remain ≥ 95 (NFR-A11Y-01)

## 10. Tests & quality

- [x] 10.1 Unit test `usePinnedCities` hook: pin, unpin, max-3 guard, duplicate no-op
- [x] 10.2 Unit test weekend-day extraction utility: correct Sat/Sun detection, "—" for out-of-window days
- [x] 10.3 Run `npm run lint && tsc --noEmit && npm test && npm run build`; all pass in < 60 s (NFR-DX-01)
- [x] 10.4 Verify console is silent at runtime on a healthy compare session (NFR-OBS-01)
