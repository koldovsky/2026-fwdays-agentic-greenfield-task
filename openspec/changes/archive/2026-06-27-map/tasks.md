## 1. Dependencies & Setup

- [x] 1.1 Install `leaflet` and `react-leaflet` packages and their TypeScript types (`@types/leaflet`)
- [x] 1.2 Verify Leaflet CSS can be imported in a client component (no build errors)

## 2. Reverse-Geocode Route Handler

- [x] 2.1 Create `app/api/reverse-geocode/route.ts` with a GET handler accepting `lat` and `lon` query params
- [x] 2.2 Proxy to Open-Meteo geocoding reverse endpoint server-side; return `{ name, lat, lon }` on success
- [x] 2.3 Return HTTP 400 for missing, non-numeric, or out-of-range coordinates
- [x] 2.4 Verify no Open-Meteo URL appears in the client bundle (inspect `next build` output)

## 3. Map Client Component

- [x] 3.1 Create `components/Map/MapClient.tsx` as a `"use client"` component importing `leaflet/dist/leaflet.css` and `react-leaflet`
- [x] 3.2 Render a `<MapContainer>` with `<TileLayer>` using OSM tiles and the required attribution string ("© OpenStreetMap contributors")
- [x] 3.3 Add a `<Marker>` at active location coordinates with a `<Popup>` showing the city name
- [x] 3.4 Wire `<MapContainer>`'s click handler: call `/api/reverse-geocode?lat=&lon=`, then `router.push` with `?lat=&lon=&name=` to update active location
- [x] 3.5 Handle reverse-geocode error response gracefully (show unobtrusive UI indicator, do not throw)

## 4. SSR-Safe Dynamic Wrapper & Skeleton

- [x] 4.1 Create `components/Map/MapSkeleton.tsx` — a `<div>` with the same height/width as the map, using design-system surface tokens and CSS pulse animation
- [x] 4.2 Respect `prefers-reduced-motion` in skeleton: static surface only when motion is reduced
- [x] 4.3 Create `components/Map/index.tsx` exporting the map via `next/dynamic(() => import('./MapClient'), { ssr: false, loading: () => <MapSkeleton /> })`

## 5. Page Integration

- [x] 5.1 Mount `<Map />` in the main page/layout beneath the forecast section; render only when an active location is set
- [x] 5.2 Confirm the map does not render (or renders a search-prompt placeholder) in the empty/hero state

## 6. i18n Strings

- [x] 6.1 Add any new UI strings (e.g., error indicator text, search-prompt placeholder) to `lib/i18n/uk.ts` and `lib/i18n/en.ts` using calm Ukrainian voice, no exclamation marks

## 7. Verification

- [x] 7.1 Build passes (`next build`) with no TypeScript or lint errors
- [x] 7.2 Map renders correctly on desktop and mobile breakpoints (768 px, 1280 px)
- [x] 7.3 Clicking the map updates the URL, re-fetches forecast, and moves the marker to the new location
- [x] 7.4 OSM attribution is visible on the rendered map
- [x] 7.5 Skeleton appears before the Leaflet chunk loads (simulate slow network in DevTools)
- [x] 7.6 No layout shift when map replaces skeleton (Lighthouse CLS ≈ 0)
- [x] 7.7 Confirm no console errors or warnings (NFR-OBS-01)
- [x] 7.8 Lighthouse performance ≥ 90 and accessibility ≥ 95 on the page with the map
