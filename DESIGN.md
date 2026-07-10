# DESIGN — Weather Explorer / Weekend Trip Planner

> Visual identity and UX decisions for the MVP. Referenced by `BC-BRAND-01` in
> `docs/requirements.md`. Specs and implementation must follow this document.

## Design intent

A calm, privacy-first weather companion for weekend trip decisions. The interface
feels like looking out a window — soft gradients, readable data, no urgency or
marketing noise. Ukrainian-first copy; tone is practical and reassuring (no
exclamation marks).

## Visual direction: **Sky Calm**

| Token        | Light                         | Dark                          |
| ------------ | ----------------------------- | ----------------------------- |
| Background   | `#f4f7fb` (morning mist)      | `#0f1419` (night sky)         |
| Surface      | `#ffffff` @ 80% blur          | `#1a2332` @ 90% blur          |
| Primary      | `#3b6fd9` (clear sky blue)    | `#6b9fff`                     |
| Accent       | `#2d9f83` (comfort green)     | `#4fd1a5`                     |
| Warning      | `#d4a017` (amber haze)        | `#e8b84a`                     |
| Danger       | `#c94c4c` (storm red)         | `#f07171`                     |
| Text         | `#1a2332`                     | `#e8edf4`                     |
| Muted text   | `#5c6b7a`                     | `#8b9bb0`                     |

Comfort score badges map directly: green ≥ 70, yellow 40–69, red < 40
(`FR-COMFORT-04`).

## Typography

- **UI:** `Geist Sans` (Next.js default) — clean, neutral, good Ukrainian glyph support.
- **Data / numbers:** tabular nums enabled (`font-variant-numeric: tabular-nums`).
- **Scale:** base 16px; headings step down in weight rather than up in size — hierarchy through spacing, not shouting.

## Layout & breakpoints

| Breakpoint | Layout (`FR-SHELL-02`)                                      |
| ---------- | ----------------------------------------------------------- |
| < 768px    | Single column; search hero centred; map below forecast      |
| 768–1279px | Two columns: forecast + chart left, map right               |
| ≥ 1280px   | Three columns: sidebar search/pins, forecast grid, map      |

Top bar: logo wordmark, live local-time clock (`FR-CLOCK-01`), theme indicator.
Footer: Open-Meteo / OSM credits + deterministic Ukrainian jokes (`FR-JOKES-01`).

## Components (shadcn/ui base-nova, `TC-STACK-02`)

- **Search combobox** — debounced geocoding suggestions with flag, region, country.
- **Day card** — weekday, hi/lo °C, icon, precip %, wind, comfort badge + rationale tooltip.
- **Weekend highlight strip** — Sat+Sun average score above the grid (`FR-COMFORT-05`).
- **Hourly chart** — Recharts line, muted grid, primary stroke; sunrise/sunset note below.
- **Map panel** — Leaflet in a rounded surface; OSM attribution bottom-right (`FR-MAP-04`).
- **Pin chips** — up to 3 cities for weekend compare (`FR-COMPARE-01`).
- **Compare table** — 3-column Sat/Sun view with sticky city headers (`FR-COMPARE-02/03`).

All interactive elements: visible focus ring (2px primary offset), accessible names
(`NFR-A11Y-01`). Contrast meets WCAG AA in both themes (`NFR-A11Y-02`).

## Animated background (`FR-ANIM-*`)

Full-viewport layer behind content; `pointer-events: none`.

| Condition   | Treatment                                      |
| ----------- | ----------------------------------------------- |
| Clear day   | Soft blue → white gradient, slow cloud drift    |
| Clear night | Deep navy → indigo gradient, subtle stars       |
| Rain        | Day/night base + semi-transparent rain streaks  |
| Snow        | Cool grey base + gentle falling particles       |
| Overcast    | Flat grey-lavender gradient, slow cloud drift   |

Day/night follows **location** sunrise/sunset, not visitor clock (`FR-ANIM-02`).
`prefers-reduced-motion: reduce` → static gradient only (`FR-ANIM-03`).

## Empty & error states

- **First load:** centred hero — title, one-line subtitle, search input prominent
  (`FR-SHELL-03`). No default city, no geolocation prompt.
- **Nothing found:** inline muted text under search — never a toast (`FR-SEARCH-05`).
- **API failure:** inline calm message in the affected panel; other panels keep
  last good data. No full-page error, no console noise (`NFR-OBS-01`).

## Iconography & data display

- Weather icons: consistent 24px set (Open-Meteo WMO codes mapped in `lib/weather/icons.ts`).
- Temperatures always °C with one decimal only when meaningful.
- Wind in m/s; precip as probability %.

## Motion

- Micro-interactions: 150–200ms ease-out (hover, focus, chip add/remove).
- Background animations: 20–40s loops, low opacity — ambient, never distracting.
- Page transitions: none (SPA); content cross-fades on location change (~200ms).

## What we explicitly avoid

- Exclamation marks, urgency copy, gamification streaks.
- Analytics pixels, cookie banners, sign-up walls.
- Dense dashboards, tables-as-default, or map-first layouts that hide the forecast.
- Stock-photo hero imagery — the animated sky *is* the hero.
