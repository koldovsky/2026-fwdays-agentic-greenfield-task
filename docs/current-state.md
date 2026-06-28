# Current state

A running handoff log of what the agent did, most recent entry first. See the
"Current state log" section in `AGENTS.md` for the rules governing this file.

---

## 2026-06-28T18:00Z — Archived `layout-search-rain-fixes` (FR-SHELL-01, FR-SHELL-02, FR-SEARCH-01, FR-RAIN-01)

- **What was done:** Completed the `layout-search-rain-fixes` change set and archived it to `openspec/changes/archive/2026-06-28-layout-search-rain-fixes/`. Changes included:
  1. **Container widened** from `max-w-[1240px]` to `max-w-screen-2xl`.
  2. **Two-row layout on info page:** row 1 = full-width search bar; row 2 = 65/35 grid (forecast | map) filling viewport height with no scroll.
  3. **Map fills full height:** `h-80` replaced with `h-full` in `MapClient.tsx`, `MapSkeleton.tsx`, and `Map/index.tsx`.
  4. **Search input cleared after city selection** (zero-to-zero flow) on both home and info pages.
  5. **Rain animation fixed:** replaced diagonal-banding `173deg` gradient with `95deg` nearly-vertical streaks animated in both X and Y.
  6. **DayCard temperatures stacked** (each on its own line, no `/` separator).
  7. **Compare button disabled** when fewer than 2 cities are pinned.
  8. Delta specs synced: `app-shell/spec.md`, `city-search/spec.md`, `animated-bg/spec.md`.
- **Why / context:** User-reported layout, UX, and visual bugs. Relates to FR-SHELL-01, FR-SHELL-02, FR-SEARCH-01, and animated-bg requirements.
- **Current state:** All 18 tasks complete. `tsc`, ESLint, Prettier, Vitest (56/56) all pass. Change archived; specs up to date.
- **Next steps:** No immediate follow-up required. Next session can pick up any new user request.

---

## 2026-06-28T13:45Z — Implemented `map-city-sync-and-queue` (FR-MAP-01, FR-MAP-03, FR-COMPARE-01)

- **What was done:** Four interconnected UX improvements to synchronize the map and pinned-cities list:
  1. **Map auto-pan on active city change:** Added `MapViewSyncer` child component inside `MapClient` that uses `useMap()` + `useEffect` to call `map.flyTo()` (or `map.setView()` when `prefers-reduced-motion` is set) whenever `lat`/`lon` props change after initial mount. The initial pan is skipped via a `mountedRef` flag.
  2. **Map click auto-pins:** `MapClient` now accepts an optional `onPin` prop. After a successful reverse-geocode it calls `onPin?.(resolvedCity)`. `Map/index.tsx` (already a client component) wires `onPin={pin}` from `usePinnedCitiesContext()`.
  3. **FIFO queue (max 5):** `PinnedCitiesContext.pin()` now uses queue eviction — if at capacity, the oldest pin is removed before appending the new one. Duplicate pins are a no-op (the city stays in its current position and navigation happens from the caller). A `pinsRef` mirrors the `pins` state for synchronous reads in `unpin()`.
  4. **Active fallback on unpin + hide × when 1 city:** `unpin()` now returns `PinnedCity | null` (the fallback city). `ForecastRegionClient` wraps unpin in `handleUnpin` which navigates to the fallback if the removed city was the active one. `PinnedChipRow` hides the × button when `pins.length === 1`.
- **Why / context:** User-reported UX: map not panning on chip switch; map clicks not pinning; no queue on add; no fallback on remove; × always shown. Relates to FR-MAP-01 (map viewport follows active location), FR-MAP-03 (map click → active location + now also pins), FR-COMPARE-01 (pinned cities cap and behavior).
- **Current state:** All 18 implementation tasks complete. `tsc --noEmit`, ESLint, Prettier all pass. 56/56 Vitest tests pass (test for old "6th pin is ignored" behavior updated to match new FIFO queue spec).
- **Next steps:** Manual smoke test (task 7.5) to be done in the browser. Run `/opsx:archive` when done.

---

## 2026-06-28T12:30Z — Implemented `fix-city-info-page-ux` (FR-SEARCH-03, FR-FORECAST-01, NFR-A11Y-01, NFR-OBS-01)

- **What was done:** Fixed 4 UX issues on the active-location (city info) page:
  1. **Search bar cleared on load:** Removed `searchParams.get("name")` initialiser from `CitySearch.tsx` (was pre-filling input from URL on page load and triggering an unwanted geocode dropdown). Also removed unused `useSearchParams` import from that component.
  2. **Search bar in own row:** Rewrote `RegionGrid` in `Shell.tsx` to `flex flex-col gap-6` layout — search is a full-width row at the top; forecast + map share a `md:grid-cols-2` grid below. Forecast panel now fills its column rather than being squeezed into a narrow third of the page.
  3. **City name in forecast panel:** `ForecastPanel.tsx` now reads `name` from `useSearchParams` and renders an `<h2>` heading as the first element of the panel (and a skeleton placeholder during loading).
  4. **Chart tooltip/dot fix:** `HourlyChart.tsx` — replaced buggy built-in `activeDot` with a custom `CustomCursor` SVG component (draws vertical line + brand-coloured circle at the correct cursor position); replaced multi-line `Tooltip` format with `CustomTooltip` that renders a single-line "HH:MM – TT°C" label; added `isAnimationActive={false}` to eliminate sweep jitter.
- **Why / context:** User-reported UX regressions on the info page. Relates to FR-SEARCH-03, FR-FORECAST-01, NFR-A11Y-01 (heading landmark), NFR-OBS-01 (no console errors).
- **Current state:** All implementation tasks complete. `tsc --noEmit`, ESLint, Prettier all pass. 56/56 Vitest tests pass.
- **Next steps:** Archived 2026-06-28. All changes shipped.

---

## 2026-06-28T11:45Z — Implemented `add-dark-theme` (NFR-A11Y-02, BC-BRAND-01)

- **What was done:** Implemented fully working dark theme toggle:
  1. **i18n:** Added `theme.toggle` string to `lib/i18n/uk.ts` ("Перемкнути тему") and `lib/i18n/en.ts` ("Toggle theme"); updated `Strings` interface.
  2. **FOWT prevention:** Added inline blocking `<script>` as first child of `<head>` in `app/layout.tsx` — reads `localStorage["nadvori-theme"]`, falls back to `prefers-color-scheme`, sets `html[data-theme]` before first paint. Added `suppressHydrationWarning` to `<html>`.
  3. **ThemeToggle component:** Created `app/components/ThemeToggle.tsx` as `"use client"` — reads `html[data-theme]` on mount, toggles attribute + localStorage on click, shows Moon/Sun SVG icons (16 px, 1.75 stroke), fully accessible (`aria-label`, `aria-pressed`).
  4. **TopBar wiring:** Removed static `ThemeIndicator` placeholder (+ its inline SVG helpers), replaced with `<ThemeToggle />`. `TopBar.tsx` remains a Server Component.
- **Why / context:** `NFR-A11Y-02` requires WCAG AA in both themes; `BC-BRAND-01` / DESIGN.md specified dark theme via `[data-theme="dark"]`. Color tokens were already complete — only the toggle UI was missing.
- **Current state:** All 9 tasks complete. `next build` passes cleanly (TypeScript + Turbopack). Dark theme tokens were pre-existing in `app/design-system/tokens/colors.css`; no token changes needed.
- **Next steps:** Archived 2026-06-28. All tasks verified and complete.

---

## 2026-06-27T12:37Z — Playwright end-to-end validation of `weekend-compare` (FR-COMPARE-01..03)

- **What was done:** Full UI test session via Playwright browser automation. Verified every user-facing flow of the weekend-compare feature.
- **Why / context:** Task 10.4 (NFR-OBS-01 console silence) and 9.3 (NFR-A11Y-01 accessibility) were the two remaining open tasks. Full Playwright walkthrough was explicitly requested by the user.
- **Current state — all 30/30 tasks complete:**
  - Pin button in CitySearch dropdown: fills bookmark icon, aria-label toggles "Закріпити"/"Відкріпити" ✓
  - PinnedChipRow: appears above forecast when at least one city is pinned, hides when none ✓
  - "Порівняти вихідні" toggle: appears next to chips, aria-pressed reflects state ✓
  - CompareTable: renders Субота/Неділя rows with hi/lo, precip%, comfort badges (fair=amber, poor=red) per city ✓
  - "Зробити активним": navigates to pinned city URL and exits compare mode ✓
  - Unpin (×) chip: removes city, hides chip row and toggle when last pin removed ✓
  - Console: 0 errors, 0 warnings throughout the entire session (NFR-OBS-01) ✓
- **Next steps:** Run `/opsx:archive weekend-compare` to archive the completed change.

---

## 2026-06-27T12:15Z — Implemented `weekend-compare` capability (FR-COMPARE-01..03)

- **What was done:** Full pin-and-compare feature implemented across 14 new/modified files:
  1. **Types & i18n:** `PinnedCity` type added to `lib/forecast/types.ts`; `compare.*` keys added to `lib/i18n/uk.ts` + `en.ts` (toggle, pin, unpin, saturday, sunday, makeActive, noData, pinnedListLabel); `Strings` interface updated.
  2. **Weekend-day utility:** `lib/forecast/weekendDays.ts` — pure `getWeekendDays(days)` using UTC-safe date arithmetic; tested in `lib/forecast/weekendDays.test.ts` (5 scenarios).
  3. **Pinned cities state:** `app/components/PinnedCities/PinnedCitiesContext.tsx` — React Context with `PinnedCitiesProvider` (max-3 guard, dedup guard); `app/hooks/usePinnedCities.ts` — thin context consumer hook; tested in `app/hooks/usePinnedCities.test.tsx` (6 scenarios).
  4. **Shell wiring:** `app/components/Shell.tsx` — `PinnedCitiesProvider` wraps `RegionGrid`; `ForecastRegionClient` replaces `ForecastPanel` in the forecast section. Both `CitySearch` and `ForecastRegionClient` share the same context.
  5. **Pin button:** `app/components/CitySearch.tsx` — bookmark icon toggle on every suggestion row; filled when pinned, outline when not; `aria-label` from `uk.compare.pin` / `uk.compare.unpin`.
  6. **Chip row:** `app/components/PinnedCities/PinnedChipRow.tsx` — flex chip list with city name + dismiss button; hidden when empty; `aria-label="Відкріпити <name>"`.
  7. **ForecastRegionClient:** `app/components/forecast/ForecastRegionClient.tsx` — client wrapper that renders chip row + compare toggle above the forecast panel; `aria-pressed` toggle swaps `ForecastPanel` ↔ `CompareTable`; isComparing resets when pins empty.
  8. **Parallel fetch hook:** `app/hooks/useCompareForecasts.ts` — fetches `/api/forecast` for each pin in parallel via `Promise.all`; in-memory cache (`useRef<Map>`) avoids duplicate fetches across re-renders.
  9. **Compare table:** `app/components/WeekendCompare/CompareTable.tsx` — sticky city headers with "Зробити активним" button; Saturday + Sunday rows with hi/lo °C, precip %, comfort badge; per-column loading skeletons; "—" for out-of-window days; `overflow-x-auto` for mobile.
- **Why / context:** FR-COMPARE-01..03, NFR-I18N-01, NFR-A11Y-01, BC-BRAND-01, TC-PURE-01.
- **Current state:** 28/30 tasks complete. `npm run lint && tsc --noEmit && npm test && npm run build` all pass clean (56 tests, 5 test files). Remaining: task 9.3 (Lighthouse a11y ≥ 95) and 10.4 (console silence) require live browser verification in the next session.
- **Next steps:** Start dev server, open browser, run Lighthouse audit (task 9.3), verify console is silent in compare mode (task 10.4), then run `/opsx:archive weekend-compare`.

---

## 2026-06-27T11:40Z — Implemented `map` capability (FR-MAP-01..05, TC-MAP-01)

- **What was done:** Full interactive OSM map capability implemented and verified:
  1. **Dependencies:** `leaflet`, `react-leaflet`, `@types/leaflet` installed.
  2. **Reverse-geocode route handler:** `app/api/reverse-geocode/route.ts` — proxies to Nominatim (OSM) for coordinates→city-name (Open-Meteo geocoding has no reverse endpoint; Nominatim is keyless, OSM-aligned, server-side only per TC-DATA-01).
  3. **MapClient component:** `app/components/Map/MapClient.tsx` — client component with Leaflet CSS import, `MapContainer` + `TileLayer` (OSM tiles with attribution), `Marker` + `Popup` (city name), `useMapEvents` click handler → calls `/api/reverse-geocode` → `router.push` with new `?lat=&lon=&name=` params.
  4. **MapSkeleton:** `app/components/Map/MapSkeleton.tsx` — `h-80 rounded-xl bg-surface-sunken motion-safe:animate-pulse` skeleton matching map footprint; static under `prefers-reduced-motion`.
  5. **Dynamic wrapper:** `app/components/Map/index.tsx` — `"use client"` wrapper using `next/dynamic({ ssr: false })` with skeleton as loading fallback.
  6. **Shell integration:** Map mounted in `RegionGrid` as `md:col-span-2 xl:col-span-3` section beneath forecast; only rendered when active location is set. Page now extracts and passes `{ lat, lon, name }` to Shell.
  7. **i18n:** Added `map.ariaLabel` + `map.reverseError` to `lib/i18n/uk.ts` and `en.ts`; updated `Strings` interface with new `map` and `regions.map` keys.
- **Why / context:** FR-MAP-01..05, TC-MAP-01, NFR-PERF-03 (dynamic import keeps Leaflet out of initial bundle), TC-DATA-01 (reverse-geocode route server-side).
- **Current state:** All 25 tasks complete. Build clean (TypeScript + Turbopack). Playwright verified: map renders with OSM tiles, marker, popup, attribution; map click triggers reverse-geocode and moves marker + re-fetches forecast; empty state shows no map; zero console errors/warnings. Pre-existing finding: CitySearch search box does not sync to `name=` URL param when changed via map click (pre-existing limitation in CitySearch `useState` initializer — not introduced by this change).
- **Next steps:** Run `/opsx:archive map`. Optional: `weekend-compare` capability (Phase F, FR-COMPARE-01..03). MVP capabilities 0–7 are all now implemented.

---

## 2026-06-27T11:05Z — Fixed `animated-bg` visual visibility (follow-up)

- **What was done:** Two bugs were fixed after browser verification revealed the animated background was imperceptibly subtle:
  1. **Transition bug**: `transition: background` does not animate `linear-gradient` values (CSS limitation). Changed to `transition: opacity` on `.bg-anim-layer`. Neutral state now uses `opacity: 0` (body bg shows through); all weather states use `opacity: 1`, giving a smooth fade-in when a city is selected.
  2. **Gradient saturation**: `cloudy-day` used `--sky-100→--sky-50` (#d8e8f6→#eef5fb) which is nearly identical to the neutral body bg (#f8fafc) — invisible. Updated gradients: `clear-day` → `--sky-400→--sky-100` (vivid midday blue); `cloudy-day` → `--slate-400→--slate-200` (distinct medium grey-blue); `snow` → `--sky-200→--sky-50` (light icy blue). Night/rain states unchanged (already dark and dramatic). Cloud particle opacity increased from 0.18–0.28 to 0.38–0.55; rain streak opacity from 0.18 to 0.40.
  3. **Console clean**: Playwright verification confirms zero console errors/warnings on the Kyiv forecast page after a full session.
- **Why / context:** FR-ANIM-01..04. Initial implementation was functionally correct but too subtle to perceive. User reported no visible animation.
- **Current state:** All 20 tasks complete (6.4 and 6.5 verified). Background clearly transitions: home (white-grey neutral) → city selected (vivid state-specific gradient). Cloud drift animation visible as white blobs on the grey-blue overcast background. Console silent. Tests pass.
- **Next steps:** Run `/opsx:archive animated-bg`. Then `map` capability (Phase E, FR-MAP-01..05) or `weekend-compare`.

---

## 2026-06-27T10:45Z — Implemented `animated-bg` capability (FR-ANIM-01..04)

- **What was done:**
  - `lib/weather/conditions.ts` — pure `getWeatherState(code, sunrise, sunset, nowIso): WeatherState` function; maps WMO codes to 6 states: `clear-day`, `clear-night`, `cloudy-day`, `cloudy-night`, `rain`, `snow`. Day/night is derived from injected `sunrise`/`sunset` ISO strings (not the user's clock). No framework deps (TC-PURE-01).
  - `lib/weather/conditions.test.ts` — 30 Vitest unit tests covering all code buckets, clear/rain/snow/cloudy state transitions, sunrise/sunset boundaries (exact equality), unknown code fallbacks, and malformed date handling. All 45 suite tests pass.
  - `app/globals.css` — added z-index scale (`--z-bg: 0`, `--z-content: 1`, `--z-modal: 10`); CSS gradient classes for all 7 weather states (`.bg-anim-neutral`, `.bg-anim-clear-day`, `.bg-anim-clear-night`, `.bg-anim-cloudy-day`, `.bg-anim-cloudy-night`, `.bg-anim-rain`, `.bg-anim-snow`); `@keyframes` for rain streaks (`anim-rain`), snow drift (`anim-snow`), cloud drift (`anim-cloud-drift`); `@media (prefers-reduced-motion: reduce)` block disabling all three animations (FR-ANIM-03).
  - `app/components/animated-bg/ForecastBgContext.tsx` — React context + `ForecastBgProvider` + `useForecastBg()` hook that holds `{ weatherCode, sunrise, sunset }` for sharing between `ForecastPanel` (writer) and `AnimatedBackground` (reader).
  - `app/components/animated-bg/AnimatedBackground.tsx` — `'use client'` fixed-position layer; `aria-hidden="true"`, `pointer-events: none` (FR-ANIM-04); `useReducedMotion()` via `useSyncExternalStore` (React 19 pattern, avoids setState-in-effect lint error); particle sub-layers only rendered when reduced-motion is false (dual enforcement: CSS + JS).
  - `app/components/forecast/ForecastPanel.tsx` — added `useForecastBg()` to write weather state to context after each successful fetch; clears context when location is deselected.
  - `app/components/Shell.tsx` — wrapped content in `<ForecastBgProvider>`; mounted `<AnimatedBackground />`; added `position: relative; z-index: var(--z-content)` to shell div to layer it above the fixed background.
- **Why / context:** FR-ANIM-01..04, NFR-PERF-03 (no animation library added), NFR-A11Y-01 (aria-hidden), BC-BRAND-01 (calm design system tokens).
- **Current state:** All implemented. lint + tsc clean. 45/45 tests pass. Production build succeeds. The page renders `bg-anim-layer bg-anim-neutral` on initial load; after selecting a city the background updates via context. CSS animations compile correctly with `@media (prefers-reduced-motion: reduce)` wrapper confirmed in the compiled output. Forecast API verified returning `weatherCode`, `sunriseIso`, `sunsetIso` — the three fields needed by the context.
- **Pending:** Tasks 6.4 and 6.5 require manual browser verification: select a city, confirm background color changes; toggle OS reduced-motion, confirm animations stop; confirm clicks reach interactive elements.
- **Next steps:** `map` capability (Phase E, FR-MAP-01..05): Leaflet/react-leaflet OSM map, client-only via `dynamic({ ssr: false })`, click → reverse-geocode + set active location. Then optional `weekend-compare`.

---

## 2026-06-27T10:20Z — Implemented `comfort-score` capability (FR-COMFORT-01..05)

- **What was done:**
  - `lib/i18n/uk.ts` + `lib/i18n/en.ts` — added `comfort` key group: `good`, `cold`, `hot`, `rainy`, `windy` rationale strings (Ukrainian ≤ 80 chars, no emoji), plus `badgeLabel` and `weekendLabel`. Added `comfort` to the `Strings` interface.
  - `lib/scoring/comfort.ts` — pure `comfortScore(day: ForecastDay): { value: number; rationale: string }`. Algorithm: 50/50 blend of (a) weighted sub-score average and (b) worst single sub-score. Weights: feels-like 40%, precip 20%, UV 20%, wind 10%, cloud 10%. The blend ensures a single extreme factor (e.g. -5 °C or 80% rain) can drag the total well below its weighted share.
  - `lib/scoring/comfort.test.ts` — 7 Vitest tests covering all spec scenarios: comfortable → ≥ 70, cold/hot extremes → < 40, rainy/windy → rationale matches, boundary integer check, i18n string length/emoji constraints.
  - `app/components/forecast/DayCard.tsx` — added comfort badge at the bottom of each card using `--comfort-good-*` / `--comfort-fair-*` / `--comfort-poor-*` design tokens; badge has `aria-label="Комфорт: <value>"`.
  - `app/components/forecast/WeekendComfortBanner.tsx` — new component; finds Sat/Sun in `days[]` by `getDay()`, averages scores, renders nothing if either day is absent. Shows averaged score and rationale from the higher-scoring day.
  - `app/components/forecast/ForecastPanel.tsx` — mounts `WeekendComfortBanner` above the 7-day card row.
- **Why / context:** FR-COMFORT-01..05, TC-PURE-01, design system BC-BRAND-01.
- **Current state:** All working. 15/15 tests pass (7 new comfort tests + 8 pre-existing). Lint and tsc clean. Live browser check confirmed 7 badges with correct tier colors and weekend banner visible (Kyiv summer = fair/poor scores). Lighthouse accessibility 96.
- **Next steps:** `animated-bg` (Phase D, FR-ANIM-01..04) is the next parallelizable capability. Then `map` (Phase E), then optional `weekend-compare`.

---

## 2026-06-27T09:50Z — Implemented `forecast` capability (FR-FORECAST-01..05)

- **What was done:**
  - `lib/forecast/types.ts` — canonical `ForecastDay`, `HourlyPoint`, `ForecastResponse` interfaces; framework-free (TC-PURE-01). All downstream capabilities (`comfort-score`, `animated-bg`, `map`, `weekend-compare`) must import from here.
  - `lib/forecast/transform.ts` — converts raw Open-Meteo JSON into `ForecastResponse`; isolates the upstream API surface so only this file needs updating if Open-Meteo renames fields.
  - `lib/forecast/weatherIcon.ts` — maps WMO weather codes to 8 icon identifiers (`clear`, `partly-cloudy`, `overcast`, `fog`, `drizzle`, `rain`, `snow`, `thunderstorm`).
  - `lib/forecast/cache.ts` — LRU in-memory cache (max 5 entries, keyed by `lat,lon`), framework-free.
  - `lib/i18n/uk.ts` + `lib/i18n/en.ts` — added `forecast` key group: sunrise/sunset labels, chart aria-label, error message, precip/wind labels, hi/lo labels.
  - `app/api/forecast/route.ts` — `GET /api/forecast?lat=&lon=` Route Handler; validates params (400 on missing/non-numeric), calls Open-Meteo with `timezone=auto`, transforms response, returns JSON with `Cache-Control: s-maxage=600, stale-while-revalidate=300`; returns 502 on upstream failure (TC-DATA-01).
  - `app/components/forecast/WeatherIcon.tsx` — inline SVG weather icons (Lucide-style, 1.75 stroke) avoiding icon-library bundle weight.
  - `app/components/forecast/DayCard.tsx` — pure presentational server component; today's card highlighted with `border-brand bg-brand-soft`.
  - `app/components/forecast/SunriseSunset.tsx` — formats ISO timestamps to `HH:MM` via `Intl.DateTimeFormat` using location's timezone; falls back to UTC.
  - `app/components/forecast/HourlyChart.tsx` — `"use client"` Recharts `LineChart` with 48 data points; design-system tokens via CSS variables for chart colors.
  - `app/components/forecast/LazyHourlyChart.tsx` — `"use client"` wrapper using `next/dynamic({ ssr: false })` with skeleton placeholder; keeps Recharts out of SSR bundle (NFR-PERF-03).
  - `app/components/forecast/ForecastPanel.tsx` — `"use client"` orchestrating component; reads `lat`/`lon` from `useSearchParams()`, checks LRU cache before fetching, manages loading/error/ok states, renders day cards + chart + sunrise/sunset.
  - `app/components/Shell.tsx` — replaced `RegionPlaceholder` for the forecast slot with `<ForecastPanel />` wrapped in `<Suspense>`.
- **Why / context:** Capability 4 (`forecast`) per `docs/capabilities.md`. Satisfies FR-FORECAST-01..05, TC-DATA-01, TC-PURE-01, NFR-I18N-01, NFR-A11Y-01, NFR-OBS-01.
- **Current state:** Complete. Lint: 0 errors. TypeScript: 0 errors. Tests: 8/8 pass. Build: succeeds. Browser-verified: 7 day cards (Ukrainian weekday names, icons, hi/lo, precip %, wind speed), 48-hour Recharts line chart, sunrise (СХІД СОНЦЯ 05:48) and sunset (ЗАХІД СОНЦЯ 22:13) for Kyiv. Today's card visually highlighted. API error cases (400/502) return correct JSON. `recharts` added as runtime dependency.
- **Next steps:** Archive with `/opsx:archive forecast`, then proceed to Phase D: capability 5 (`comfort-score`, FR-COMFORT-01..05) and capability 6 (`animated-bg`, FR-ANIM-01..04) — both depend on the `ForecastResponse` shape locked here and can be built in parallel.

---

## 2026-06-27T09:15Z — Implemented `city-search` capability (FR-SEARCH-01..05)

- **What was done:**
  - `app/api/geocode/route.ts` — Route Handler (`GET /api/geocode?name=`) that proxies to the Open-Meteo geocoding API server-side (TC-DATA-01). Returns `[]` for empty/missing `name` param and on any upstream error. Maps results to `{ name, admin1, country, countryCode, latitude, longitude }`.
  - `lib/i18n/uk.ts` + `lib/i18n/en.ts` — extended `Strings.search` with `label` ("Пошук міста") and `nothingFound` ("Нічого не знайдено") keys.
  - `app/components/CitySearch.tsx` — `"use client"` combobox component: 300 ms debounced fetch via the Route Handler, ARIA combobox pattern (`role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-activedescendant`), suggestion list (`role="listbox"` / `role="option"`) with flag emoji, keyboard navigation (ArrowUp/Down, Enter auto-select, Escape), `onMouseDown + e.preventDefault()` for click-to-select without blur, `onBlur` with 150 ms delay for click-outside, country flag via Unicode Regional Indicator conversion, initializes from `useSearchParams().get("name")`.
  - `app/page.tsx` — upgraded to `async` server component reading `searchParams: Promise<...>` (Next.js 16 pattern); sets `hasActiveLocation = !!(lat && lon)`.
  - `app/components/Hero.tsx` — replaced static placeholder `<div>` with `<Suspense><CitySearch /></Suspense>` in the search slot.
  - `app/components/Shell.tsx` — replaced `RegionPlaceholder` for the search slot in `RegionGrid` with `<Suspense><CitySearch /></Suspense>` (keeps search accessible after location is selected).
- **Why / context:** Capability 3 (`city-search`) per `docs/capabilities.md`. Satisfies FR-SEARCH-01..05, TC-DATA-01, NFR-I18N-01, NFR-A11Y-01.
- **Current state:** Complete. Lint: 0 errors. TypeScript: 0 errors. Tests: 8/8 pass. Build: succeeds. All 24 tasks done. CDP browser verification confirmed: suggestions appear, `aria-expanded` toggles correctly, ArrowDown scrolls active item into view (`scrollTop` advances, `bg-brand-soft` active highlight visible), Escape closes list, no console errors. User manually confirmed 5.1–5.3; 5.4 fixed (scroll) and re-verified via Chrome CDP.
- **Next steps:** Archive this change with `/opsx:archive`, then capability 4 — `forecast` (FR-FORECAST-01..05) via `/opsx:propose forecast`.

---

## 2026-06-27T00:00Z — Implemented `bottom-jokes` capability (FR-JOKES-01, BC-BRAND-02)

- **What was done:**
  - `lib/i18n/uk.ts` — added `jokes: string[]` to the `Strings` interface and
    12 Ukrainian weather-themed joke strings (calm voice, no exclamation marks).
  - `lib/i18n/en.ts` — mirrored `jokes: string[]` to keep the Strings contract
    satisfied.
  - `app/components/BottomJokes.tsx` — new `"use client"` component; uses
    `useState(null)` + `useEffect` with `setTimeout(() => setJoke(pickJoke()), 0)`
    to avoid hydration mismatch; `pickJoke()` seeds on day-of-year so the same
    joke shows all day and changes at midnight; renders `<p>` with
    `text-sm text-text-secondary` and `aria-label` from `uk.regions.footer`.
  - `app/components/Footer.tsx` — replaced the empty `<div data-slot="footer">`
    placeholder with `<BottomJokes />`; attribution links (Open-Meteo,
    OpenStreetMap) unchanged.
- **Why / context:** Capability 2 (`bottom-jokes`) per `docs/capabilities.md`.
  Satisfies FR-JOKES-01, BC-BRAND-01, BC-BRAND-02, NFR-I18N-01, NFR-A11Y-01.
- **Current state:** Working. Lint: 0 errors. TypeScript: 0 errors. Build:
  succeeds. Joke renders client-side after hydration; no hydration mismatch;
  attribution links confirmed in SSR HTML. No exclamation marks in any joke
  string.
- **Next steps:** Capability 3 — `city-search` (FR-SEARCH-01..05); starts the
  core data path. Propose with `/opsx:propose`.

---

## 2026-06-26T12:00Z — Implemented `top-clock` capability (FR-CLOCK-01)

- **What was done:** Added a live local-time clock to the app-shell header.
  - `app/components/top-clock/TopClock.tsx` — `"use client"` component; uses
    `useState(null)` + `useEffect` with `setTimeout(tick, 0)` (initial) +
    `setInterval(tick, 1000)` (recurring); renders `null` until first tick
    (hydration-safe); `<time>` element with ISO-8601 `dateTime`, `aria-label`
    from `uk.regions.clock`, JetBrains Mono `font-mono` via `text-text-secondary`
    semantic token (FR-CLOCK-01, NFR-A11Y-01, NFR-I18N-01).
  - `app/components/TopBar.tsx` — imports and renders `<TopClock />` inside
    the existing `data-slot="header-clock"` div.
  - `vitest.config.mts` + `__tests__/TopClock.test.tsx` — Vitest set up from
    scratch (8 tests: timer lifecycle, null-before-tick, `<time>` after tick,
    dateTime format, aria-label, HH:MM:SS format, tick update).
  - `package.json` — added `"test": "vitest run"` script and Vitest dev deps.
- **Why / context:** Capability 1 (`top-clock`) per `docs/capabilities.md`.
  Satisfies FR-CLOCK-01, NFR-A11Y-01/02, NFR-I18N-01, NFR-PERF-03.
- **Current state:** Working. Clock ticks live at 1 Hz in the header.
  Lint: 0 errors. TypeScript: 0 errors. Tests: 8/8 pass. Build: succeeds;
  client JS ≈ 178 KB gz (budget: 200 KB). No console errors or hydration
  warnings observed in the browser.
- **Next steps:** Capability 2 — `bottom-jokes` (FR-JOKES-01, BC-BRAND-02);
  can be built in parallel with `top-clock` phase complete.

---

## 2026-06-25T20:30Z — Implemented `app-shell` capability (FR-SHELL-01..03)

- **What was done:** Built the application shell that every other capability
  mounts into. Replaced the `create-next-app` starter page with the Надворі
  shell:
  - `lib/i18n/uk.ts` + `lib/i18n/en.ts` — typed, framework-free string source
    (`Strings` interface); calm voice, no exclamation marks (NFR-I18N-01,
    BC-BRAND-01, TC-PURE-01).
  - `app/components/TopBar.tsx` — `banner` with token-built logo mark +
    wordmark, a `HeaderClock` slot, and a CSS-driven (zero-JS) theme indicator
    that reflects `html[data-theme]` (FR-SHELL-01).
  - `app/components/Shell.tsx` — `banner` + `main` + `contentinfo` structure
    with a responsive region grid: 1 col `<768px`, 2 cols `md:`(768px), 3 cols
    `xl:`(1280px) (FR-SHELL-02). Hero visibility gated on a single
    `hasActiveLocation` boolean (the seam `city-search` will flip via
    `?lat=&lon=&name=`).
  - `app/components/Hero.tsx` — centered hero/empty state with hero copy and a
    centered search slot placeholder (FR-SHELL-03).
  - `app/components/Footer.tsx` — `contentinfo` with a jokes slot and
    Open-Meteo / OpenStreetMap credits scaffold (BC-BRAND-02).
  - Added a `.theme-indicator__*` CSS block to `app/globals.css`; added
    `docs/**` to ESLint `globalIgnores` (vendored reference kit, not app
    source); removed unused starter SVGs from `public/`.
- **Why / context:** First capability in `docs/capabilities.md` (Phase A);
  unblocks `top-clock`, `bottom-jokes`, `city-search`. OpenSpec change
  `openspec/changes/app-shell/` — all 21 tasks complete.
- **Current state:** `npx tsc --noEmit`, `npm run lint`, and `npm run build`
  all green; `/` is statically prerendered with no client JS (all Server
  Components). All shell components use semantic tokens only (no raw ramps).
  Caveats: (1) no `npm test` script yet — Vitest arrives with `comfort-score`;
  (2) the populated 2/3-column region grid is not yet reachable at runtime (no
  location state exists), so it is verified by the Tailwind breakpoint mapping
  (`md`=768px, `xl`=1280px) rather than a live populated render — the live
  first-load surface is the centered hero/empty state.
- **Next steps:** Visually confirm the shell at the three breakpoints when
  `city-search` lands (it makes the populated grid reachable). Proceed to
  Phase B: `top-clock` (fills the header clock slot) and `bottom-jokes` (fills
  the footer slot). Optionally run `/opsx:archive app-shell`.

---

## 2026-06-25T18:55Z — Split requirements into capabilities & implementation order

- **What was done:** Created `docs/capabilities.md` decomposing
  `docs/requirements.md` into 9 OpenSpec-ready capabilities (`app-shell`,
  `top-clock`, `bottom-jokes`, `city-search`, `forecast`, `comfort-score`,
  `animated-bg`, `map`, `weekend-compare`), with a dependency-ordered phase
  plan (A–F), per-capability scope, and a cross-cutting constraints section.
- **Why / context:** Plan the build sequence ahead of using OpenSpec
  (`openspec/` is initialized but `specs/` and `changes/` are empty).
- **Current state:** Capability map + order documented. No OpenSpec changes
  created yet; no application code changed.
- **Next steps:** Run `openspec-propose` per capability in the documented
  order, starting with `app-shell`.

---

## 2026-06-25T00:00Z — Initialized current-state log

- **What was done:** Added project-docs and current-state-log rules to
  `AGENTS.md`; created this `docs/current-state.md` file.
- **Why / context:** Establish a documentation-first workflow and a per-session
  handoff note.
- **Current state:** `AGENTS.md` now points agents at `docs/`,
  `docs/product-brief.md`, and `docs/requirements.md`, and requires this log to
  be kept up to date. No application code changed.
- **Next steps:** Future sessions should read the docs before working and append
  a new entry here at the end of each session.
