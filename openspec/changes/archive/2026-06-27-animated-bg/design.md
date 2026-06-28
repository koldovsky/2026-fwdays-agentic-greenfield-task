## Context

The `animated-bg` capability sits in Phase D of the implementation order — it is a pure consumer of the `forecast` data shape. Open-Meteo daily responses provide `weather_code` (WMO code), `sunrise`, and `sunset` per day. The first entry in those arrays corresponds to today. The background must react to: (a) the current weather condition bucket (clear, cloudy, rain, snow), and (b) whether the current wall-clock time falls between today's sunrise and sunset for the active location.

The app uses Next.js 16 App Router, Tailwind CSS 4, React 19, and TypeScript strict. Client JS budget is ≤ 200 KB gzipped (NFR-PERF-03). No animation library may be introduced.

## Goals / Non-Goals

**Goals:**

- Render a fullscreen layer behind all content that visually reflects the current weather condition and time-of-day for the active location.
- Support four visual states: clear-day, clear-night, rain, snow (cloud drift overlays clear states).
- Hard-enforce `prefers-reduced-motion`: static gradient only, zero JS animation loop.
- Zero interaction blocking: `pointer-events: none`, `aria-hidden="true"`, below all content in z-order.
- Keep new client JS minimal; prefer CSS `@keyframes` over canvas.

**Non-Goals:**

- Real-time animation update during a session (background re-evaluates on location change only, not every minute).
- Animated transitions between weather states.
- Support for every WMO weather code individually — bucket mapping is sufficient.
- Server-side rendering of the animated layer (it is a client component).

## Decisions

### 1. CSS `@keyframes` over Canvas

**Decision:** Use CSS animations (`@keyframes` in `app/globals.css`) for all particle and cloud effects, not a `<canvas>` element or a JS animation loop.

**Rationale:** CSS animations run off the main thread, consume zero JS bundle bytes for the animation itself, and are trivially disabled with `@media (prefers-reduced-motion: reduce)` at the CSS level — no JS guard needed. Canvas would require a RAF loop, adding JS complexity and bundle weight.

**Alternative considered:** `framer-motion` or `react-spring` — ruled out; they add ≥ 30 KB gzipped to the client bundle and provide no benefit over CSS for these effects.

### 2. WMO Code Bucketing in `lib/weather/conditions.ts`

**Decision:** A pure function `getWeatherState(code: number, sunrise: string, sunset: string, nowIso: string): WeatherState` maps WMO codes to one of `'clear-day' | 'clear-night' | 'cloudy-day' | 'cloudy-night' | 'rain' | 'snow'`.

**Rationale:** Pure function is framework-free (TC-PURE-01), fully unit-testable with Vitest, and decouples the mapping logic from the React component. `nowIso` is injected rather than calling `Date.now()` inside the function, making it deterministic in tests.

**WMO bucketing (approximate):**

- 0 → clear; 1–3 → cloudy; 45, 48 → cloudy (fog treated as cloudy); 51–67, 80–82 → rain; 71–77, 85–86 → snow; 95–99 → rain (thunderstorm treated as rain).
- Day/night: if `now` < `sunrise` or `now` >= `sunset` → night variant.

### 3. Component Mounting Point

**Decision:** `AnimatedBackground` is mounted once in the root layout (`app/layout.tsx`) as a fixed-position layer. It reads forecast state from a shared context or lightweight atom (the same forecast store used by `ForecastPanel`).

**Rationale:** Mounting in layout ensures it persists across soft navigations and is not remounted on search/location changes. The component re-renders reactively when the active location's forecast data changes.

**Alternative considered:** Mounting per-page — rejected because it causes layout shifts and duplicate subscriptions.

### 4. Data Flow

The background consumes three values from the forecast store already populated by the `forecast` capability:

- `weatherCode: number` — `daily.weather_code[0]`
- `sunrise: string` — `daily.sunrise[0]` (ISO datetime string from Open-Meteo)
- `sunset: string` — `daily.sunset[0]`

No new API calls or server-side work is required for this capability.

### 5. Reduced-Motion Strategy

**Decision:** Dual enforcement — CSS `@media (prefers-reduced-motion: reduce)` removes all `@keyframes` animations and the JS component skips mounting particle layers entirely using `useReducedMotion()` (React hook wrapping `window.matchMedia`).

**Rationale:** CSS alone is sufficient for the animations, but the JS guard prevents unnecessary DOM nodes from being created, keeping the DOM clean for screen readers and assistive tech.

## Risks / Trade-offs

- **Forecast store coupling** → The background depends on the `forecast` capability's data shape being stable. Mitigation: define the consumed interface (`WeatherBgProps`) explicitly and import only that slice.
- **z-index conflicts** → Fixed-position background may conflict with modals or tooltips if z-index is not coordinated. Mitigation: document a z-index scale in `app/globals.css` (`--z-bg: 0`, `--z-content: 1`, `--z-modal: 10`).
- **CSS animation performance on low-end devices** → Multiple simultaneous `@keyframes` (particles + cloud drift) could cause jank. Mitigation: use `will-change: transform` only on animated elements; cap particle count in CSS (fixed number of pseudo-elements, not generated dynamically); profile on a mid-range device before merging.
- **Missing forecast data on first load** → If background mounts before forecast data arrives, it renders the neutral (no-condition) state. This is acceptable and expected.
