## 1. Itinerary metrics library

- [x] 1.1 Create `lib/itinerary-metrics/constants.ts` — documented average speed constant for duration estimates
- [x] 1.2 Create `lib/itinerary-metrics/estimate-duration.ts` — pure km → minutes helper
- [x] 1.3 Create `lib/itinerary-metrics/format-duration.ts` — Ukrainian duration formatting
- [x] 1.4 Create `lib/itinerary-metrics/index.ts` — public exports
- [x] 1.5 Add `lib/itinerary-metrics/__tests__/estimate-duration.test.ts` and format tests (FR-VIEW-02)

## 2. i18n

- [x] 2.1 Add `itinerary.*` strings to `lib/i18n/uk.ts` — overview, day titles, stop kinds, metric labels (BC-BRAND-01)

## 3. Sidebar components

- [x] 3.1 Create `components/route-details/stop-list-item.tsx` — stop row with kind label and distance
- [x] 3.2 Create `components/route-details/day-group-card.tsx` — per-day Card with stops and day metrics
- [x] 3.3 Create `components/route-details/itinerary-sidebar.tsx` — overview + day list; reads `useRoutePlan().itinerary` (FR-VIEW-01)

## 4. Layout integration

- [x] 4.1 Create or extend `components/layout/route-results-layout.tsx` — sidebar column when itinerary present
- [x] 4.2 Move `RoutePlanProvider` to `app/page.tsx` if not already at page level
- [x] 4.3 Remove `RoutePlanSummary` from config panel; render sidebar in results layout
- [x] 4.4 Implement responsive sidebar: full width below content on mobile; fixed width beside content from 768 px (FR-SHELL-02)

## 5. Verification

- [x] 5.1 Run `npm test` — itinerary-metrics tests pass
- [x] 5.2 Run `npm run lint && npm run build` — must pass without errors
- [x] 5.3 Manual: submit valid route → sidebar totals and day groups match engine output; summary card gone
