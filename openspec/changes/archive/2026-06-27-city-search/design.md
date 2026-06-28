## Context

The app shell exists with an empty search slot. There is no way to set an active location, which means no forecast, no map, no comfort score, and no animated background can render. City search is the entry gate of the entire data path.

The Open-Meteo geocoding API is keyless and returns JSON with city name, latitude, longitude, country code, admin region, and country name. It must be called server-side per TC-DATA-01 to avoid leaking the endpoint pattern in the client bundle.

## Goals / Non-Goals

**Goals:**

- Debounced city name input that fetches geocoding suggestions via a Next.js Route Handler
- Suggestion list with city name, admin region, country, and flag emoji
- On selection: set active location and write `?lat=&lon=&name=` to the URL
- Keyboard auto-select (Enter with a single suggestion)
- Inline "Nothing found" empty state
- Full accessibility: visible focus, ARIA labels, keyboard navigation

**Non-Goals:**

- Geolocation / "Use my location" (BC-PRIVACY-02 — explicit action only; not in this capability scope)
- Caching geocoding responses server-side (in-memory client debounce is sufficient)
- Any server-side URL state persistence

## Decisions

### Route Handler for geocoding (not client-side fetch)

**Decision:** `GET /api/geocode?name=<query>` proxies to Open-Meteo geocoding.

**Why:** TC-DATA-01 requires Open-Meteo calls to happen from Server Components or Route Handlers. Calling from the client would expose the Open-Meteo URL in the network tab with a pattern that could imply a key is needed, creating confusion. The Route Handler also gives a single place to add caching headers or change the upstream URL without touching client code.

**Alternative considered:** Client-side fetch directly to Open-Meteo. Rejected: violates TC-DATA-01.

### Debounce in the client component (300 ms)

**Decision:** Debounce the search input at 300 ms in `CitySearch` before calling the Route Handler.

**Why:** Prevents a request per keystroke; 300 ms is imperceptible latency for a suggestion list. No server-side rate limiting is needed at this call volume.

**Alternative considered:** Server-side debounce / request coalescing. Rejected: overkill for a personal-scale app; adds complexity with no user-visible benefit.

### URL state via `useRouter` / `useSearchParams` (Next.js App Router)

**Decision:** On selection, call `router.push` with `?lat=&lon=&name=` query params. Other capabilities read these params to hydrate their state.

**Why:** URL is the simplest shared-state mechanism in Next.js App Router; it makes the view bookmarkable and shareable (FR-SEARCH-03) without any global state library. Downstream capabilities (forecast, map) can read params from `useSearchParams` independently.

**Alternative considered:** React context / Zustand for location state. Rejected: adds a dependency and breaks shareability/bookmarkability for no benefit at this scale.

### `CitySearch` as a Client Component

**Decision:** `CitySearch` is a `"use client"` component.

**Why:** The debounced input, dropdown interaction, and `useRouter`/`useSearchParams` hooks all require client-side execution. No meaningful static content to server-render.

### Suggestion rendering: plain list, not a combobox library

**Decision:** Build the suggestion dropdown as a native `<ul>` / `<li>` with ARIA `role="listbox"` / `role="option"` attributes.

**Why:** The interaction is simple (type → list → click or keyboard select). A headless combobox library (e.g., Radix Select) adds bundle weight (NFR-PERF-03) for a component we can implement correctly in ~60 lines. Custom ARIA is straightforward here.

**Alternative considered:** Radix UI Combobox. Rejected: bundle cost; the feature set we need is a strict subset of what a general combobox provides.

## Risks / Trade-offs

- **Open-Meteo geocoding uptime** → Mitigation: show "Nothing found" on any non-2xx response — same as zero results. No separate error state needed per FR-SEARCH-05.
- **Hydration mismatch** (`useSearchParams` SSR vs client) → Mitigation: wrap the component (or its parent) in `<Suspense>` as required by Next.js App Router; the search input is non-critical to SSR content.
- **Long city names / flag emoji width** → Mitigation: suggestion rows use `truncate` on the text and the flag is a fixed-width inline element; no layout break.
- **IME / CJK input delay** → Accepted trade-off: debounce fires after `compositionend`; this is standard browser behavior and requires no extra handling.
