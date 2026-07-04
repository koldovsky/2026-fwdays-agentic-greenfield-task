## Context

Phases 1–4 delivered the Ukrainian SPA shell, route configuration form with URL sync, Photon geocoding, and pure `segmentRoute` in `lib/route-engine/`. Submit validates and syncs the URL but performs no routing. Phase 5 connects the rider's explicit submit action to OSRM and the segmentation engine, producing a client-side itinerary for later map and sidebar phases.

Constraints: browser-only OSRM via CORS-safe public endpoints (TC-DATA-01, TC-STACK-04, NFR-COST-01); no API keys; no fetch on page load (BC-PRIVACY-02); silent console on happy path (NFR-OBS-01); calm Ukrainian copy (BC-BRAND-01, NFR-I18N-01). DESIGN.md defines destructive text-only errors and primary submit button.

## Goals / Non-Goals

**Goals:**

- Fetch driving route geometry from a public OSRM instance on submit
- Decode OSRM GeoJSON coordinates to `LatLon[]` and pass to `segmentRoute`
- Hold latest itinerary and planning status in client React state
- Loading indicator on submit; disable double-submit while in flight
- Calm Ukrainian error when OSRM fails or returns no route
- Minimal success summary: total distance (km) and travel day count
- Vitest tests for geometry decode and orchestration with mocked `fetch`
- Abort in-flight OSRM request when a new submit starts

**Non-Goals:**

- Interactive map or markers (`map-rendering`)
- Full chronological sidebar (`route-details`)
- Automatic re-plan on URL change without submit
- Server-side OSRM proxy or API routes
- Geolocation on load
- GPX export, saved routes, multi-stop routing

## Decisions

### 1. Module layout

```
lib/routing/
  types.ts              # OsrmRouteResponse, RoutingError, PlanRouteResult
  osrm-client.ts        # fetchOsrmRoute(start, end) → LatLon[] | error
  plan-route.ts         # planRoute(config) → Itinerary | error (calls osrm + segmentRoute)
  decode-geometry.ts    # OSRM GeoJSON LineString → LatLon[]
  index.ts              # public exports
lib/routing/__tests__/
  decode-geometry.test.ts
  plan-route.test.ts    # mocked fetch
components/
  route-planning/
    route-plan-provider.tsx   # context: itinerary, status, planFromConfig()
    route-plan-summary.tsx    # compact success summary below form
```

**Rationale:** Keeps network code separate from React. `plan-route.ts` is testable with mocked fetch. Provider isolates state for map/sidebar phases.

### 2. OSRM endpoint — `router.project-osrm.org`

```
GET https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
  ?overview=full
  &geometries=geojson
  &steps=false
```

- CORS-enabled for browser `fetch` (TC-DATA-01)
- Keyless public demo instance (NFR-COST-01)
- `driving` profile — closest available on public OSRM; motorcycle-specific routing deferred

Request coordinates in OSRM order: `{lon},{lat}`.

Parse `routes[0].geometry.coordinates` — each pair `[lon, lat]` → `{ lat, lon }`.

Handle HTTP errors, empty `routes`, and malformed JSON → typed `RoutingError` without throwing.

**Alternative considered:** self-hosted OSRM — rejected for MVP keyless demo.

### 3. Orchestration flow (`planRoute`)

```typescript
async function planRoute(config: RouteConfig): Promise<PlanRouteResult>
```

1. Validate `config` has `start` and `end` (caller also validates in form)
2. `fetchOsrmRoute(start, end)` with `AbortSignal`
3. On success, `segmentRoute({ polyline, restKm, dayKm })`
4. On segmentation failure, map to `RoutingError` / `PlanRouteError`
5. Return `{ ok: true, itinerary }` or `{ ok: false, error }`

No `console.*` in lib paths.

### 4. Client state — `RoutePlanProvider`

Context value:

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `itinerary` | `Itinerary \| null` | Latest successful plan |
| `status` | `"idle" \| "loading" \| "success" \| "error"` | UI state |
| `errorKey` | i18n key or null | Ukrainian error lookup |
| `planFromConfig` | `(config) => Promise<void>` | Called from form submit |

Provider wraps `ConfigPanel` or page content inside `"use client"` boundary.

On successful plan: set `itinerary`, `status: "success"`. On failure: clear `itinerary`, set error key.

**Alternative considered:** Zustand store — rejected; React context sufficient for MVP and matches clock pattern scope.

### 5. Form submit integration

`RouteConfigForm` (or thin wrapper):

1. Validate fields (existing)
2. Sync URL (existing)
3. Call `planFromConfig(config)` from context
4. Button shows loading label (`route.planning`) and `disabled` while `status === "loading"`

Do not call `planFromConfig` in `useEffect` on mount or URL change.

### 6. Error and success UI

**Error:** paragraph below submit button, `text-destructive text-sm`, i18n key e.g. `route.errorRoutingFailed` — calm tone, no exclamation marks.

**Success summary (`RoutePlanSummary`):** below form when `itinerary` present — Card or muted panel showing:

- Total distance: `{itinerary.totalDistanceKm} km`
- Travel days: `{itinerary.totalDays}`

Labels from i18n (`route.summaryDistance`, `route.summaryDays`). No map, no day-by-day list.

### 7. i18n additions

```typescript
route: {
  // existing keys...
  planning: "Побудова маршруту…",
  errorRoutingFailed: "Не вдалося побудувати маршрут. Спробуйте ще раз пізніше",
  summaryHeading: "Маршрут готовий",
  summaryDistance: "Загальна відстань",
  summaryDays: "Днів у дорозі",
}
```

### 8. Testing strategy

- `decode-geometry.test.ts` — sample OSRM GeoJSON fixture → `LatLon[]`
- `plan-route.test.ts` — mock `global.fetch` for success, HTTP 500, empty routes; assert itinerary shape
- No network in CI tests

Manual: submit Kyiv → Lviv in dev; verify summary appears; block network → error message.

### 9. App wiring

`app/page.tsx` or `config-panel.tsx`:

```tsx
<RoutePlanProvider>
  <RouteConfigForm />
  <RoutePlanSummary />
</RoutePlanProvider>
```

Keep centered config layout; summary stacks below form within same Card or adjacent Card.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Public OSRM rate limits or downtime | Single fetch on submit; calm error UI; no retry loop |
| `router.project-osrm.org` not motorcycle-optimal | Document driving profile; acceptable for lab MVP |
| Large geometry payloads | OSRM returns simplified geometry; engine handles dense polylines (<50 ms) |
| Itinerary lost on refresh | Expected — no persistence until future scope; URL keeps config only |
| User expects map after submit | Summary copy sets expectation; map phase follows |

## Migration Plan

1. Add `lib/routing/` modules and tests
2. Add i18n keys
3. Implement `RoutePlanProvider`, `RoutePlanSummary`
4. Wire form submit to `planFromConfig`
5. Update `ConfigPanel` / page composition
6. Run `npm test && npm run lint && npm run build`
7. Manual submit test with real OSRM

Rollback: revert provider and lib/routing; restore submit stub behavior.

## Open Questions

- None blocking. Switch OSRM host only if CORS or availability regresses.
