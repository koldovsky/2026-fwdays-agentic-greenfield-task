# Product Brief — Weather Explorer / Weekend Trip Planner

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> Tone throughout the product is Ukrainian-first, calm and practical, with no
> exclamation marks (BC-BRAND-01).

## What this is

Weather Explorer is a keyless, privacy-first, Ukrainian-first web app that helps
a person decide whether — and where — a weekend trip is worth taking based on the
weather. It pairs an accurate 7-day forecast with per-day comfort scoring, an
interactive map, and a calm animated background that reflects the sky at the
chosen place. There are no accounts, no cookies, no trackers, and no paid API
keys. The whole experience runs on the free, keyless Open-Meteo and OpenStreetMap
services.

## Who it is for

The single actor is an **anonymous visitor planning a weekend trip**. There are
no roles, no sign-in, and no stored profile. The visitor arrives, explores, and
leaves; nothing about them is persisted server-side and nothing is set in their
browser by the application. Anyone who can open the live URL is a full user — the
repo and the live URL are the workshop's primary, publicly demonstrable artifacts
(BC-DEMO-01).

## The pain it addresses

Deciding whether a weekend away is "weather-worth-it" usually means juggling
several forecasts across tabs, mentally translating raw numbers (precipitation
probability, wind, UV) into a sense of how a day will actually feel, and doing
this separately for each candidate destination. It is slow, and most weather
sites add accounts, ads, and tracking on top.

This product reduces that to a single calm screen. A visitor picks a place, sees
the seven days ahead at a glance, and gets a plain-language comfort read on each
day — with the upcoming weekend called out first, because that is the decision
they came to make.

## End-to-end usage

1. **Land.** On first load the visitor sees a hero with a prominently centered
   city search (FR-SHELL-03). There is no default city and no geolocation on
   load; location is only ever read on an explicit "Use my location" action
   (BC-PRIVACY-02). The header carries a compact live local-time clock and a
   theme indicator (FR-SHELL-01, FR-CLOCK-01).
2. **Choose a place.** The visitor types a free-form city name and gets debounced
   suggestions from Open-Meteo geocoding, each showing city, admin region,
   country, and an optional flag (FR-SEARCH-01/02). Selecting a suggestion sets
   the active location and reflects it in the URL as `?lat=&lon=&name=`, so the
   view is shareable (FR-SEARCH-03). Pressing Enter on a lone suggestion selects
   it (FR-SEARCH-04). If nothing matches, an inline "Nothing found" appears —
   never an error toast (FR-SEARCH-05). Alternatively, the visitor clicks
   anywhere on the map to set the place by reverse-geocoding (FR-MAP-03).
3. **Read the forecast.** Once a location is active, the app fetches a 7-day
   daily forecast (FR-FORECAST-01) and renders seven day cards — weekday, hi/lo
   in °C, weather icon, precipitation probability, wind (FR-FORECAST-02). Below
   them, an hourly temperature line chart covers the next 48 hours
   (FR-FORECAST-03), with today's sunrise and sunset noted underneath
   (FR-FORECAST-04). The last successful response is cached in memory until the
   location changes (FR-FORECAST-05).
4. **Read the comfort scores.** Each day carries a 0–100 comfort score as a
   colored badge — green, yellow, or red — derived from feels-like temperature,
   precipitation probability, wind, cloud cover, and UV (FR-COMFORT-02/04). The
   score is computed by a pure, total function and explained in a single short
   Ukrainian sentence (FR-COMFORT-01/03). The **upcoming weekend** (Saturday +
   Sunday average, by the location's local dates) is highlighted at the top of
   the grid — the headline answer to "is it worth going?" (FR-COMFORT-05).
5. **See it in place.** An interactive OpenStreetMap-tiled map is bounded to the
   current location, with a marker and a popup naming the city
   (FR-MAP-01/02). "© OpenStreetMap contributors" attribution is always shown
   (FR-MAP-04), and the map is client-only with a same-footprint skeleton during
   SSR (FR-MAP-05).
6. **Feel the weather.** A calm animated background reflects the current
   condition for the active place — day or night gradient, rain or snow
   particles, drifting clouds (FR-ANIM-01). Day versus night follows that
   location's sunrise and sunset, not the visitor's clock (FR-ANIM-02). It
   respects `prefers-reduced-motion` by falling back to a static gradient
   (FR-ANIM-03) and never intercepts clicks (FR-ANIM-04).
7. **Compare.** The visitor pins up to three cities and switches to a
   side-by-side weekend comparison — Saturday and Sunday hi/lo, precipitation,
   and comfort score per city — to pick the best destination. This is the
   weekend-compare capability, promoted to MVP at scope sign-off (Checkpoint 1).

## Key workflows in prose

- **Decide on this weekend, one place.** Land, search a city, read the
  highlighted weekend comfort score and the seven-day cards, glance at the
  hourly chart and the map, and decide. This is the core loop and the whole MVP
  supports it.
- **Set the place by map.** Instead of typing, the visitor clicks the map; the
  app reverse-geocodes the point, makes it the active location, and re-fetches
  everything. Useful when the visitor knows roughly where on the map they want to
  go but not the exact city name.
- **Share a view.** Because the active location lives in the URL, a visitor can
  copy the link and send it; the recipient opens the same place with no setup and
  no account.
- **Compare destinations.** Pin a handful of candidate cities and compare their
  weekends side by side, then make one of them active to dive into its full
  forecast.

## MVP vs Future boundary

**In the MVP:** the shell and responsive layout, the live clock, city search
(including the opt-in "Use my location" button, FR-SEARCH-06), the deterministic
Ukrainian footer jokes, the 7-day forecast with the 48-hour hourly chart and
sunrise/sunset, the comfort score with the weekend highlight, the interactive map
with click-to-set-location, the condition-driven animated background, and the
weekend-compare view (pin up to three cities, FR-COMPARE-01/02/03, promoted to
MVP at Checkpoint 1) — all keyless, all privacy-first.

**Future (deferred):**

- The PRD's explicit **out-of-scope** list, none of which is built:
  - push notifications, scheduled jobs, background data refresh;
  - user accounts, history, or favorites persisted server-side;
  - marine / aviation / agriculture weather variables;
  - localisation beyond Ukrainian + English labels;
  - a native mobile app;
  - climate or historical analysis beyond the 7-day forecast.

## Operating principles

- **Privacy-first.** No analytics, no third-party trackers, no fingerprinting, no
  application-set cookies; geolocation only on explicit request
  (BC-PRIVACY-01/02/03).
- **Keyless and free.** Zero paid API keys; all data is keyless or free-tier
  (NFR-COST-01). The footer credits Open-Meteo and OpenStreetMap (BC-BRAND-02).
- **Honest under failure.** No external call or user input produces a generic
  error page or a silent blank; failures degrade to a calm, visible state, and
  the runtime console stays silent on a healthy session (NFR-OBS-01).
- **Ukrainian-first and calm.** UI strings are centralised and Ukrainian-first,
  the tone is practical, and there are no exclamation marks (NFR-I18N-01,
  BC-BRAND-01).
