## 1. Dependencies

- [x] 1.1 Add `leaflet`, `react-leaflet`, and `@types/leaflet` (TC-STACK-03)
- [x] 1.2 Verify Leaflet CSS imported only in client map module

## 2. Map components

- [x] 2.1 Create `components/map/map-skeleton.tsx` — structured placeholder (FR-MAP-03)
- [x] 2.2 Create `components/map/map-attribution.tsx` — bottom-right OSM credit overlay (FR-MAP-04)
- [x] 2.3 Create `components/map/route-map-markers.tsx` — color/shape markers by stop kind (FR-MAP-02, DESIGN.md)
- [x] 2.4 Create `components/map/route-map.tsx` — TileLayer, Polyline, bounds fit, reads `useRoutePlan().itinerary` (FR-MAP-01)
- [x] 2.5 Export map via `next/dynamic` with `{ ssr: false }` and skeleton loading state

## 3. Results layout

- [x] 3.1 Create `components/layout/route-results-layout.tsx` — empty vs results states; map region when itinerary present
- [x] 3.2 Move `RoutePlanProvider` from `ConfigPanel` to `app/page.tsx`; wrap results layout
- [x] 3.3 Update `components/empty-state/config-panel.tsx` — form-only card without provider wrapper

## 4. Responsive behavior

- [x] 4.1 Implement mobile layout: config above map, full-width map min-height (FR-SHELL-02)
- [x] 4.2 Implement desktop layout: map flex-1 in results row; reserve space compatible with future sidebar column

## 5. Verification

- [x] 5.1 Run `npm run lint && npm run build` — must pass without errors
- [x] 5.2 Manual: submit valid route → map shows polyline, markers, attribution; SSR shows skeleton only
- [x] 5.3 Manual: no itinerary on load — centered config only, no map fetch or render
