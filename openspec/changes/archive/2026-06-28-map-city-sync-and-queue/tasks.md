## 1. PinnedCitiesContext — FIFO queue and active fallback

- [x] 1.1 Change `pin()` in `app/components/PinnedCities/PinnedCitiesContext.tsx` to apply FIFO queue eviction: remove duplicate entry if present, then evict index-0 if list is at capacity (5), then append the new city.
- [x] 1.2 Change `unpin()` to return `PinnedCity | null` — the fallback city that should become active (city immediately before the removed one; first remaining city if the removed city was first; `null` if only one city remains or the removed city was not active).
- [x] 1.3 Update the `PinnedCitiesContextType` TypeScript interface to reflect the new `unpin` signature.

## 2. PinnedChipRow — hide × when only one city pinned

- [x] 2.1 In `app/components/PinnedCities/PinnedChipRow.tsx`, wrap the dismiss `<button>` in a condition `pins.length > 1` so it is not rendered when exactly one city is pinned.
- [x] 2.2 Verify the chip row still renders correctly (city name + pin icon visible) when `pins.length === 1` and that no layout shift occurs when the × button disappears/appears.

## 3. Map auto-pan — MapViewSyncer child component

- [x] 3.1 Add a `MapViewSyncer` component inside `app/components/Map/MapClient.tsx` (or a sibling file) that uses `useMap()` and calls `map.flyTo([lat, lon], zoom)` or `map.setView([lat, lon], zoom)` (based on `prefers-reduced-motion`) in a `useEffect` keyed on `[lat, lon]`.
- [x] 3.2 Render `<MapViewSyncer lat={lat} lon={lon} />` as a child of `<MapContainer>` in `MapClient`.
- [x] 3.3 Ensure the `useEffect` does NOT fire on initial mount (use a ref flag or compare prev values) to avoid a redundant pan on top of `MapContainer`'s own initial centering.

## 4. Map click → auto-pin

- [x] 4.1 Add an optional `onPin?: (city: PinnedCity) => void` prop to `MapClient` in `app/components/Map/MapClient.tsx`.
- [x] 4.2 After a successful reverse-geocode in `handleLocationChange`, call `onPin?.({ name: data.name, lat: data.lat, lon: data.lon })`.
- [x] 4.3 Wire `onPin` in the parent that renders `<MapClient>` (likely `app/components/Shell.tsx` or the main page): pass `usePinnedCitiesContext().pin` as `onPin`.

## 5. Active fallback on unpin — call site

- [x] 5.1 In the component that calls `unpin` (the chip row's parent — `Shell.tsx` or equivalent), capture the return value of `unpin(city)`.
- [x] 5.2 If the return value is non-null and the unpinned city is the currently active city (compare `lat`+`lon` against current URL params), call `router.push(?)` with the fallback city's coordinates to update the active location.

## 6. Search bar pin-on-select (queue semantics already covered)

- [x] 6.1 Verify that the existing `pin()` call in `CitySearch.tsx` (or wherever search selection triggers pinning) requires no change — queue eviction is handled entirely inside `PinnedCitiesContext.pin()`.

## 7. Quality gate

- [x] 7.1 Run `npx tsc --noEmit` — zero errors.
- [x] 7.2 Run `npx eslint .` — zero warnings or errors.
- [x] 7.3 Run `npx prettier --check .` — clean.
- [x] 7.4 Run `npm test` — all existing Vitest tests pass (≥ 56 passing, 0 failing).
- [x] 7.5 Manual smoke test: pin Kyiv → pin Lviv → click on Odesa on the map → verify map pans, Odesa is added, chip row shows all 3; then pin a 6th city and confirm oldest is evicted; then remove active city and confirm previous becomes active; when 1 city remains confirm × is hidden.
