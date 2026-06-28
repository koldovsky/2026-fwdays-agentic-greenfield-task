## 1. Route Handler — geocoding proxy

- [x] 1.1 Create `app/api/geocode/route.ts` that accepts `GET ?name=<query>` and proxies to Open-Meteo geocoding API
- [x] 1.2 Return an empty JSON array when `name` is missing or empty (no upstream call)
- [x] 1.3 Map Open-Meteo response to `{ name, admin1, country, countryCode, latitude, longitude }[]`
- [x] 1.4 Return the same empty-array shape on any non-2xx upstream response (no thrown errors to the client)

## 2. i18n strings

- [x] 2.1 Add `search` namespace keys to `lib/i18n/uk.ts`: placeholder text, "Нічого не знайдено" empty-state label, and accessible input label
- [x] 2.2 Add matching English keys to `lib/i18n/en.ts`

## 3. CitySearch client component

- [x] 3.1 Create `components/CitySearch.tsx` as a `"use client"` component with a controlled text input
- [x] 3.2 Implement 300 ms debounce on the input value before calling `/api/geocode`
- [x] 3.3 Render suggestion list as `<ul role="listbox">` with `<li role="option">` rows showing city name, admin region, country, and flag emoji
- [x] 3.4 Implement click-to-select: call `router.push` with `?lat=&lon=&name=` and dismiss the list
- [x] 3.5 Implement Enter auto-select: when exactly one suggestion is present, pressing Enter selects it
- [x] 3.6 Implement ArrowUp / ArrowDown keyboard navigation between suggestion rows with wrap-around
- [x] 3.7 Implement Escape key: dismiss list and return focus to the input
- [x] 3.8 Track `aria-activedescendant` on the input pointing to the focused option `id`; set `aria-expanded` and `aria-haspopup="listbox"`
- [x] 3.9 Show inline "Nothing found" message (from `lib/i18n/uk.ts`) when suggestions array is empty and query is non-empty
- [x] 3.10 Apply always-visible focus ring to the input and each suggestion row (design-system token, WCAG AA)

## 4. App shell integration

- [x] 4.1 Import and render `<CitySearch />` in the hero/empty state search slot (FR-SHELL-03)
- [x] 4.2 Wrap `<CitySearch />` (or its parent) in `<Suspense>` to satisfy Next.js App Router `useSearchParams` requirement

## 5. Verification

- [x] 5.1 Manually verify: typing a city name shows suggestions, clicking selects and updates the URL
- [x] 5.2 Manually verify: pressing Enter with one suggestion auto-selects it
- [x] 5.3 Manually verify: nonsense input shows inline "Нічого не знайдено" with no toast
- [x] 5.4 Manually verify: keyboard navigation (ArrowDown/Up, Enter, Escape) works correctly
- [x] 5.5 Manually verify: no console warnings or errors on a healthy search session (NFR-OBS-01)
- [x] 5.6 Run `npm run lint && tsc --noEmit && npm test && npm run build` and confirm all pass
