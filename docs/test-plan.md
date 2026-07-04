# Test plan — MotoRoute Agent MVP

Last updated: 2026-07-04 (Europe/Kyiv)

Requirement traceability and verification record for [requirements.md](requirements.md) (BC-DEMO-01).

---

## Project verification summary

| Check | Command / method | Target | Last result | Status | Req |
| ----- | ---------------- | ------ | ----------- | ------ | --- |
| ESLint | `npm run lint` | Zero errors | 0 errors | Pass | NFR-DX-01 |
| TypeScript | `npm run typecheck` | Strict compile, no emit errors | 0 errors | Pass | TC-STACK-01, NFR-DX-01 |
| Unit tests | `npm test` | All tests green | **15 files, 39 tests** (~0.4 s) | Pass | TC-TEST-01, BC-DEMO-01 |
| Production build | `npm run build` | Static app builds | Next.js 16.2.9, `/` prerendered | Pass | NFR-DX-01 |
| Full quality gate | `npm run check` | lint + typecheck + test + build | **~11 s** (budget &lt; 60 s) | Pass | NFR-DX-01 |
| CI pipeline | GitHub Actions `quality.yml` | Same as `npm run check` on PR/push | Node 20, `npm ci` → `check` | Configured | BC-DEMO-01 |
| Segmentation perf | Vitest `performance.test.ts` | `segmentRoute` &lt; 50 ms | Passes on dense polyline fixture | Pass | NFR-PERF-02 |
| Lighthouse desktop | Production `/` empty state | Performance ≥ 90 | **100** | Pass | NFR-PERF-01 |
| Lighthouse mobile | Production `/` empty state | Performance ≥ 90 | **95** | Pass | NFR-PERF-01 |
| Console audit | Manual happy path + source grep | No app `console.*` in prod flow | No calls in `app/`, `components/`, `lib/` | Pass | NFR-OBS-01 |
| Privacy / cost | Code review | No trackers, no API keys | Nominatim, OSRM, OSM only; theme in `localStorage` | Pass | BC-PRIVACY-01/02, NFR-COST-01 |
| Ukrainian i18n | Code review | Local dictionary, no middleware | `lib/i18n/uk.ts`, `lang="uk"` | Pass | NFR-I18N-01, BC-BRAND-01 |
| Accessibility | Manual keyboard pass | Focus rings, combobox keys | Tab / arrows / Enter / Escape on form | Pass | NFR-A11Y-01 |
| Responsive layout | Manual at 768 / 1280 px | Empty + results layouts | 1-col mobile; 3-col desktop results | Pass | FR-SHELL-02 |
| OpenSpec traceability | Specs + this document | Every MVP req → evidence | See § Requirement trace matrix | Pass | BC-DEMO-01 |

**How to re-run automated checks:**

```bash
npm run check
```

**How to re-run Lighthouse** (after `npm run build && npx next start -p 3001`):

```bash
npx lighthouse http://localhost:3001 --only-categories=performance --preset=desktop
npx lighthouse http://localhost:3001 --only-categories=performance --screenEmulation.mobile=true
```

---

## Automated quality gate detail

| Step | Script | What it validates |
| ---- | ------ | ----------------- |
| 1 | `npm run lint` | ESLint (Next.js config) across app, components, lib |
| 2 | `npm run typecheck` | `tsc --noEmit` strict TypeScript |
| 3 | `npm test` | Vitest unit tests for pure `lib/` modules |
| 4 | `npm run build` | Next.js production build + route generation |

CI: `.github/workflows/quality.yml` — triggers on `push` to `main` and all `pull_request`.

---

## Performance metrics

| Metric | Measurement | Value | Threshold | Status |
| ------ | ----------- | ----- | ----------- | ------ |
| Quality gate wall time | `npm run check` | ~11 s | &lt; 60 s | Pass |
| Vitest suite | `npm test` | ~0.4 s | — | — |
| Route segmentation | `performance.test.ts` | &lt; 50 ms | &lt; 50 ms | Pass |
| Lighthouse desktop | Empty `/`, prod build | 100 | ≥ 90 | Pass |
| Lighthouse mobile | Empty `/`, prod build | 95 | ≥ 90 | Pass |

> Results page with Leaflet map may score lower than empty landing state.

---

## Manual review checklist

| Area | Procedure | Result | Date |
| ---- | --------- | ------ | ---- |
| Console silence | Load → search → submit route → theme toggle; watch DevTools | No app-initiated logs | 2026-07-04 |
| Shell empty state | Load `/` without query params | Centered config panel | 2026-07-04 |
| Shell results | Submit Kyiv → Lviv (or similar) | Form \| map \| sidebar | 2026-07-04 |
| Location search | Partial Ukrainian names (`Ки`, `Льв`) | Hybrid Photon + Nominatim suggestions | 2026-07-04 |
| Map markers | Rest / overnight / terminals | Color-coded markers + labels | 2026-07-04 |
| Footer attribution | OSM + OSRM links | Present, open in new tab | 2026-07-04 |
| URL shareability | Select places, submit | `?start=&end=&rest=&day=` in address bar | 2026-07-04 |

---

## Console audit (NFR-OBS-01)

1. Load `/` — no application `console.*` output
2. Type in Start/End search — no app-initiated logs (external API network noise acceptable)
3. Submit a valid route — no app-initiated logs
4. Toggle theme — no app-initiated logs

**Source grep:** no `console.` calls under `app/`, `components/`, or `lib/`.

---

## Requirement trace matrix

### Functional requirements

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| FR-SHELL-01 | Manual | `components/layout/app-shell.tsx`, `site-header.tsx` |
| FR-SHELL-02 | Manual | § Manual review; `route-results-layout.tsx` |
| FR-SHELL-03 | Manual | `app/page.tsx`, `config-panel.tsx` |
| FR-CLOCK-01 | Manual + code | `components/clock/header-clock.tsx` |
| FR-SEARCH-01 | Manual + unit | `location-field.tsx` (400 ms debounce); `search-places.ts` |
| FR-SEARCH-02 | Unit | `nominatim-client.test.ts`, `merge-places.test.ts` |
| FR-SEARCH-03 | Manual + code | `lib/route-config/url-codec.ts` |
| FR-INPUT-01 | Manual + code | `constraint-fields.tsx`, `validation.ts` |
| FR-MAP-01 | Manual | `components/map/route-map.tsx` |
| FR-MAP-02 | Manual | `route-map-markers.tsx` |
| FR-MAP-03 | Code | `dynamic(..., { ssr: false })` |
| FR-MAP-04 | Manual | Map attribution + `site-footer.tsx` |
| FR-VIEW-01 | Manual | `itinerary-sidebar.tsx` |
| FR-VIEW-02 | Automated | `segment-route.test.ts`, `split-days.test.ts`, `place-rest-stops.test.ts` |

### Non-functional requirements

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| NFR-PERF-01 | Lighthouse | § Performance metrics |
| NFR-PERF-02 | Automated | `performance.test.ts` |
| NFR-A11Y-01 | Manual | § Manual review |
| NFR-COST-01 | Code review | § Project verification summary |
| NFR-OBS-01 | Manual + grep | § Console audit |
| NFR-I18N-01 | Code | `lib/i18n/uk.ts` |
| NFR-DX-01 | Automated | `npm run check` |

### Business / UX constraints

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| BC-PRIVACY-01 | Code review | No analytics in repo |
| BC-PRIVACY-02 | Code review | URL-only state; no geolocation on load |
| BC-BRAND-01 | Manual | `DESIGN.md`, Ukrainian copy |
| BC-BRAND-02 | Manual | `site-footer.tsx` |
| BC-DEMO-01 | Document | This test plan + OpenSpec + Vitest |

### Technical constraints

| ID | Verification | Evidence |
| -- | ------------ | -------- |
| TC-STACK-01 | Code | Next.js 16, React 19, strict TS |
| TC-STACK-02 | Code | Tailwind 4, shadcn/ui |
| TC-STACK-03 | Code | Leaflet + OSM tiles |
| TC-STACK-04 | Code | Nominatim, Photon, OSRM |
| TC-PURE-01 | Automated | `lib/route-engine/` tests |
| TC-DATA-01 | Code | Browser `fetch` only |
| TC-TEST-01 | Automated | Vitest |

---

## Vitest inventory

| Module | Test files | Focus |
| ------ | ---------- | ----- |
| Geocoding | `nominatim-client.test.ts`, `merge-places.test.ts` | Normalization, hybrid merge/rank |
| Route engine | 6 files under `route-engine/__tests__/` | Segmentation, perf, geo, rest stops |
| Routing | `decode-geometry.test.ts`, `plan-route.test.ts` | OSRM decode, plan orchestration |
| POI | 5 files under `poi/__tests__/` | Fuel/hotel snap, detours |
| Itinerary metrics | `itinerary-metrics.test.ts` | Duration formatting |

**Total:** 15 test files, 39 tests.

---

## CI workflow

File: `.github/workflows/quality.yml`

- **Triggers:** `push` to `main`, all `pull_request`
- **Steps:** checkout → Node 20 → `npm ci` → `npm run check`
