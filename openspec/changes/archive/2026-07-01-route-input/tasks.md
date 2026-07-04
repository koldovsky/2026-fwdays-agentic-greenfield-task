## 1. i18n

- [x] 1.1 Add `route.*` strings to `lib/i18n/uk.ts` — labels, placeholders, validation errors, autocomplete copy (DESIGN.md, no exclamation marks)
- [x] 1.2 Verify typed `t("route.*")` keys resolve via `lib/i18n/index.ts`

## 2. Route config library

- [x] 2.1 Create `lib/route-config/types.ts` — `GeocodedPlace`, `RouteConfig` types
- [x] 2.2 Create `lib/route-config/defaults.ts` — default rest (150 km) and day (400 km) values
- [x] 2.3 Create `lib/route-config/validation.ts` — rest 50–300 km, day 100–1000 km, required start/end
- [x] 2.4 Create `lib/route-config/url-codec.ts` — encode/decode `start`, `end`, `rest`, `day` query params

## 3. Geocoding

- [x] 3.1 Create `lib/geocoding/types.ts` — re-export or align with `GeocodedPlace`
- [x] 3.2 Create `lib/geocoding/photon-client.ts` — debounce-friendly fetch with AbortController, User-Agent header, normalize name/region/country/lat/lon (FR-SEARCH-01, TC-DATA-01, NFR-COST-01)

## 4. Location field UI

- [x] 4.1 Implement `components/route-input/location-field.tsx` — combobox with 300 ms debounce, min query length, suggestion listbox (FR-SEARCH-02)
- [x] 4.2 Add keyboard navigation (arrows, Enter, Escape) and focus ring styling (NFR-A11Y-01)
- [x] 4.3 Show calm Ukrainian empty-state when no results; no console output on failure (NFR-OBS-01)

## 5. Constraint fields UI

- [x] 5.1 Implement `components/route-input/constraint-fields.tsx` — rest and daily numeric inputs with `inputMode="numeric"` (FR-INPUT-01)
- [x] 5.2 Validate on blur; show `text-destructive` error messages from i18n

## 6. Form integration

- [x] 6.1 Implement `components/route-input/route-config-form.tsx` — orchestrate fields, URL read/write via `useSearchParams` + `router.replace`, submit validation stub
- [x] 6.2 Update `components/empty-state/config-panel.tsx` to render `RouteConfigForm` inside Card body
- [x] 6.3 Add Suspense boundary in `app/page.tsx` if required for `useSearchParams` (Next.js 16)

## 7. Verification

- [x] 7.1 Run `npm run lint && npm run build` — must pass without errors
- [x] 7.2 Manual: debounced autocomplete shows name, region, country; selecting updates URL
- [x] 7.3 Manual: invalid numbers rejected; reload with `?start=&end=&rest=&day=` restores form
- [x] 7.4 Manual: submit validates but does not fetch OSRM or show map; Tab through all fields with visible focus
