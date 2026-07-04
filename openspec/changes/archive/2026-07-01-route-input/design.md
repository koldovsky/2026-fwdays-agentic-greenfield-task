## Context

Phases 1–2 delivered the Ukrainian SPA shell, theme system, shadcn form primitives, and header clock. `ConfigPanel` is a Card with heading and helper text only — no inputs. FR-SEARCH-01/02/03 and FR-INPUT-01 require the rider to configure a trip and share state via URL before routing or map phases can run.

Constraints: browser-only geocoding via CORS-safe public endpoints (TC-DATA-01, TC-STACK-04, NFR-COST-01); no API keys; no analytics or cookies (BC-PRIVACY-01/02); Ukrainian copy via local i18n (NFR-I18N-01, BC-BRAND-01); silent console (NFR-OBS-01); keyboard-accessible forms (NFR-A11Y-01). DESIGN.md defines field labels, focus rings, and calm error tone.

## Goals / Non-Goals

**Goals:**

- Functional route configuration form in the centered empty-state card
- Debounced location search with autocomplete showing name, region, and country
- Strict validation for rest interval and max daily distance (km)
- Bidirectional URL sync: `?start=&end=&rest=&day=` for shareable links
- Restore full form state from URL on load and reload
- Client-only form island — no server actions, no backend persistence
- Submit button present ("Побудувати маршрут") but no routing side effects yet

**Non-Goals:**

- OSRM route fetch or map rendering (`routing-integration`, `map-rendering`)
- Pure segmentation logic (`route-engine`)
- Geolocation on page load (BC-PRIVACY-02)
- GPX export, multi-stop routing, saved profiles
- Server-side geocoding proxy or API route middleware
- Runtime i18n middleware or locale routing

## Decisions

### 1. Component and module layout

```
components/
  route-input/
    route-config-form.tsx      # "use client" — form shell, submit, URL sync orchestration
    location-field.tsx         # debounced search + autocomplete listbox
    constraint-fields.tsx      # rest + daily numeric inputs
  empty-state/
    config-panel.tsx           # server wrapper → renders RouteConfigForm
lib/
  geocoding/
    types.ts                   # GeocodedPlace { id, name, region, country, lat, lon }
    photon-client.ts           # fetch + normalize Photon API responses
  route-config/
    types.ts                   # RouteConfig { start, end, restKm, dayKm }
    validation.ts              # Zod-like manual validators or plain functions
    url-codec.ts               # encode/decode query params start/end/rest/day
    defaults.ts                # sensible defaults when params absent
```

**Rationale:** Mirrors `components/clock/` isolation pattern. Pure lib modules are testable without DOM. `ConfigPanel` stays the empty-state entry point for `app-shell` compliance.

**Alternative considered:** Single monolithic form file — rejected; location autocomplete and URL codec deserve separate units.

### 2. Geocoding provider — Photon (komoot)

Use `https://photon.komoot.io/api/` with query param `q`, `lang=uk`, and `limit=5`.

- CORS-enabled from browser (TC-DATA-01)
- Keyless (NFR-COST-01)
- OSM-derived data aligned with map stack

Normalize each feature to `GeocodedPlace`:

| Field   | Photon source (fallback chain)        |
| ------- | ------------------------------------- |
| name    | `properties.name` or `properties.city` |
| region  | `properties.state` or `properties.county` |
| country | `properties.country`                  |
| lat/lon | `geometry.coordinates` (swap to lat,lon) |

Set `User-Agent: MotoRoute/0.1 (lab demo)` header per good citizenship; debounce 300 ms; abort in-flight requests on new input.

**Alternative considered:** Nominatim direct — rejected for browser CORS and usage-policy friction.

### 3. Debounce and request lifecycle

- 300 ms debounce on location field text changes
- Minimum query length: 2 characters before fetch
- `AbortController` per field; abort prior request when query changes or field blurs
- Empty/error results: show calm inline message, no console logging (NFR-OBS-01)

### 4. Autocomplete UI (FR-SEARCH-02, NFR-A11Y-01)

- Combobox pattern: `Input` + absolutely positioned suggestion list
- List: `role="listbox"`, items `role="option"`
- Row layout: primary line `name`, secondary `region · country` in `text-muted text-sm`
- Keyboard: ArrowUp/Down navigate, Enter selects, Escape closes
- `aria-expanded`, `aria-controls`, `aria-activedescendant` on input
- Focus ring: `ring-2 ring-accent ring-offset-2` per DESIGN.md

### 5. URL encoding (FR-SEARCH-03)

Query keys (exact):

| Param  | Content                                      | Example |
| ------ | -------------------------------------------- | ------- |
| `start`| `{lat},{lon},{urlEncodedLabel}`              | `50.4501,30.5234,Київ` |
| `end`  | same shape                                   | `49.8397,24.0297,Львів` |
| `rest` | positive integer km                          | `150` |
| `day`  | positive integer km                          | `400` |

Codec rules:

- Parse on mount via `useSearchParams()`; invalid segments ignored (field stays empty)
- Write on committed changes (location selected, valid number blur/change) via `router.replace(url, { scroll: false })`
- Omit empty optional params; always preserve order `start`, `end`, `rest`, `day`
- No hash routing; pathname stays `/`

**Alternative considered:** JSON blob in single param — rejected; opaque and poor shareability.

### 6. Numeric validation (FR-INPUT-01)

| Field        | Rules                                      | Default |
| ------------ | ------------------------------------------ | ------- |
| Rest interval| integer, 50–300 km                         | 150     |
| Daily limit  | integer, 100–1000 km                       | 400     |

- `inputMode="numeric"`; reject non-digits on input
- Validate on blur and on submit attempt
- Error text under field in `text-destructive text-sm` — calm Ukrainian, no exclamation marks
- Block submit while any field invalid or start/end missing

### 7. Form state and client boundary

`RouteConfigForm` is `"use client"`. `ConfigPanel` imports it as child — server component can render client child.

State: React `useState` for draft values; URL is source of truth after hydration:

1. SSR renders form with defaults (no searchParams on server static page — use defaults)
2. Client mounts, reads `useSearchParams`, hydrates fields
3. User edits → update local state → encode → `replace` URL

Wrap form in `<Suspense fallback={...}>` at page level if required by Next.js 16 for `useSearchParams`.

**Alternative considered:** nuqs or similar — rejected to avoid dependency.

### 8. Submit button (stub)

Primary button "Побудувати маршрут" validates all fields. On success: no-op or `preventDefault` only — optional disabled state with `title` explaining routing comes in next phase. Do not fetch OSRM in this change.

### 9. i18n additions (`lib/i18n/uk.ts`)

Keys under `route.*`:

- `startLabel`, `endLabel`, `restLabel`, `dayLabel`
- `startPlaceholder`, `endPlaceholder`
- `submit`, `searching`, `noResults`
- `errorRestRange`, `errorDayRange`, `errorRequired`
- `autocompleteHint` (sr-only or aria)

Copy from DESIGN.md where defined.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Photon rate limits or downtime | Debounce; show calm error in autocomplete; no retry spam |
| URL length with long place names | Encode labels; truncate display label server-side if needed |
| Hydration mismatch from URL params | Client-only hydration of searchParams; defaults on SSR |
| Autocomplete focus trap on mobile | List dismisses on selection/blur; test at 375 px |
| Accidental geocode on every keystroke | 300 ms debounce + min length + abort |
| Submit confusion without routing | Button validates only; helper text unchanged until routing phase |

## Migration Plan

1. Add lib modules (`geocoding`, `route-config`) and i18n keys
2. Build `LocationField`, `ConstraintFields`, `RouteConfigForm`
3. Replace placeholder body in `ConfigPanel`
4. Add Suspense boundary on page if needed for search params
5. Verify `npm run lint && npm run build`
6. Manual: type search, select suggestion, edit numbers, copy URL, reload restores state

Rollback: revert `ConfigPanel` to placeholder card; remove route-input components and lib modules.

## Open Questions

- None blocking. Photon chosen as geocoding endpoint; switch to another CORS-safe OSM geocoder only if Photon policy changes.
