# Test plan — MotoRoute Agent MVP

Last updated: 2026-07-04 (quality-gate)

Requirement traceability matrix for [requirements.md](requirements.md). Each MVP requirement maps to automated tests or a documented manual procedure (BC-DEMO-01).

## Automated quality gate

| Command | Purpose | Evidence |
| ------- | ------- | -------- |
| `npm run check` | lint + typecheck + test + build (NFR-DX-01) | `package.json` scripts |
| GitHub Actions `quality.yml` | CI on push/PR | `.github/workflows/quality.yml` |

**Last local run:** `npm run check` completed in ~13 s (well under 60 s budget).

## Lighthouse performance (NFR-PERF-01)

Run against production build:

```bash
npm run build
npx next start -p 3001
npx lighthouse http://localhost:3001 --only-categories=performance --preset=desktop
npx lighthouse http://localhost:3001 --only-categories=performance --screenEmulation.mobile=true
```

| Target | URL state | Score | Date |
| ------ | --------- | ----- | ---- |
| Desktop Performance | Empty state (`/`) | **100** | 2026-07-04 |
| Mobile Performance | Empty state (`/`) | **95** | 2026-07-04 |

Both scores ≥ 90. Results page with map may score lower due to Leaflet; empty state represents initial landing demo.

## Console audit (NFR-OBS-01)

Checklist (production mode, DevTools console open, verbose):

1. Load `/` — no application `console.*` output
2. Type in Start/End search — no app-initiated logs (network errors from external APIs acceptable)
3. Submit a valid route — no app-initiated logs
4. Toggle theme — no app-initiated logs

**Source grep:** no `console.` calls under `app/`, `components/`, or `lib/`.

**Result:** Pass (2026-07-04).

## Manual verification checklists

### Responsive shell (FR-SHELL-02)

- [x] At ≥ 1280 px: three-column results layout (form \| map \| sidebar)
- [x] At ≥ 768 px: sidebar stacks below map on narrow desktop/tablet
- [x] Below 768 px: single-column stack

Evidence: `components/layout/route-results-layout.tsx`, `components/layout/app-shell.tsx`

### Accessibility (NFR-A11Y-01)

- [x] Tab through Start, End, rest km, day km, submit — visible focus rings
- [x] Location combobox: arrow keys, Enter, Escape

Evidence: `components/route-input/location-field.tsx` (ARIA combobox), `components/ui/input.tsx` focus styles

### Brand & copy (BC-BRAND-01, BC-BRAND-02)

- [x] Ukrainian UI strings via `lib/i18n/uk.ts`
- [x] Footer links to OpenStreetMap copyright and OSRM

Evidence: `components/layout/site-footer.tsx`, `lang="uk"` in `app/layout.tsx`

### Privacy & cost (BC-PRIVACY-01, BC-PRIVACY-02, NFR-COST-01)

- [x] No analytics scripts in layout or pages
- [x] No auth cookies; theme uses `localStorage` only (not profile tracking)
- [x] Geocoding (Nominatim), routing (OSRM), tiles (OSM) — no API keys

Evidence: `app/layout.tsx`, `lib/geocoding/nominatim-client.ts`, `lib/routing/osrm-client.ts`

---

## Requirement trace matrix

### Functional requirements

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| FR-SHELL-01 | Manual | `components/layout/app-shell.tsx`, `components/layout/site-header.tsx` |
| FR-SHELL-02 | Manual | § Responsive shell above; `route-results-layout.tsx` |
| FR-SHELL-03 | Manual | `app/page.tsx`, `config-panel.tsx` empty state |
| FR-CLOCK-01 | Manual + code | `components/clock/header-clock.tsx`, `lib/clock/time-store.ts` |
| FR-SEARCH-01 | Manual + unit | `location-field.tsx` (1 s debounce); `nominatim-client.ts` |
| FR-SEARCH-02 | Unit | `lib/geocoding/__tests__/nominatim-client.test.ts` |
| FR-SEARCH-03 | Manual + code | `lib/route-config/url-codec.ts`, `route-config-form.tsx` |
| FR-INPUT-01 | Manual + code | `constraint-fields.tsx`, `lib/route-config/validation.ts` |
| FR-MAP-01 | Manual | `components/map/route-map.tsx` bounds to itinerary |
| FR-MAP-02 | Manual | `components/map/route-map-markers.tsx`, marker colors |
| FR-MAP-03 | Code | `dynamic(..., { ssr: false })` in map panel |
| FR-MAP-04 | Manual | Map attribution control + `site-footer.tsx` |
| FR-VIEW-01 | Manual | `components/route-details/itinerary-sidebar.tsx` |
| FR-VIEW-02 | Automated | `lib/route-engine/__tests__/segment-route.test.ts`, `split-days.test.ts`, `place-rest-stops.test.ts` |

### Non-functional requirements

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| NFR-PERF-01 | Manual (Lighthouse) | § Lighthouse section above |
| NFR-PERF-02 | Automated | `lib/route-engine/__tests__/performance.test.ts` |
| NFR-A11Y-01 | Manual | § Accessibility above |
| NFR-COST-01 | Manual + code | § Privacy & cost above |
| NFR-OBS-01 | Manual + grep | § Console audit above |
| NFR-I18N-01 | Code | `lib/i18n/uk.ts`, `t()` helper — no i18n middleware |
| NFR-DX-01 | Automated | `npm run check` timing § above |

### Business / UX constraints

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| BC-PRIVACY-01 | Manual + code | No trackers in repo; § Privacy & cost |
| BC-PRIVACY-02 | Manual + code | No geolocation on load; URL-only route state |
| BC-BRAND-01 | Manual | § Brand & copy; `DESIGN.md` |
| BC-BRAND-02 | Manual | `site-footer.tsx` OSM + OSRM links |
| BC-DEMO-01 | Document | This test plan + OpenSpec specs + Vitest suite |

### Technical constraints (reference)

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| TC-STACK-01 | Code | Next.js 16 App Router, React 19, strict TS |
| TC-STACK-02 | Code | Tailwind 4, shadcn components |
| TC-STACK-03 | Code | Leaflet + OSM tiles in `route-map.tsx` |
| TC-STACK-04 | Code | Nominatim + OSRM public endpoints |
| TC-PURE-01 | Automated | `lib/route-engine/` tests, no DOM in engine |
| TC-DATA-01 | Code | Browser `fetch` in geocoding/routing clients |
| TC-TEST-01 | Automated | Vitest in `lib/**/__tests__/` |

## Vitest inventory

| Module | Test file |
| ------ | --------- |
| Geocoding | `lib/geocoding/__tests__/nominatim-client.test.ts` |
| Route engine | `lib/route-engine/__tests__/*.test.ts` (6 files) |
| Routing | `lib/routing/__tests__/decode-geometry.test.ts`, `plan-route.test.ts` |
| POI | `lib/poi/__tests__/*.test.ts` (5 files) |
| Itinerary metrics | `lib/itinerary-metrics/__tests__/itinerary-metrics.test.ts` |

**Total:** 14 test files, 36 tests (run via `npm test`).

## CI workflow

File: `.github/workflows/quality.yml`

- Triggers: `push` to `main`, all `pull_request`
- Steps: checkout → Node 20 → `npm ci` → `npm run check`
