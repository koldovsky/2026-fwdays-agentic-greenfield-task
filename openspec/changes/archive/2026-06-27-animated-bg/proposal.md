## Why

The app currently renders no visual feedback about weather conditions — all capability phases are structural. Adding an animated background ties the UI emotionally to the forecast data and fulfils the core UX promise of the product: the environment responds to the weather. This is Phase D work, directly dependent on the `forecast` capability's data shape being fixed.

## What Changes

- New `AnimatedBackground` client component renders a fullscreen canvas/CSS layer behind all content, driven by the active location's current weather condition and sunrise/sunset times.
- Background state: clear-day gradient, clear-night gradient, rain particles, snow particles, cloud drift overlay — mutually exclusive base states.
- Day/night determination reads `sunrise`/`sunset` from today's Open-Meteo forecast response for the active location (not the user's local clock).
- `prefers-reduced-motion` media query collapses all animation to a static gradient only; no JS animation loop runs.
- Background layer has `pointer-events: none` and `z-index` below all interactive content — never blocks clicks or keyboard.
- Condition-to-state mapping lives in `lib/weather/conditions.ts` (framework-free, unit-testable per TC-PURE-01).
- All user-facing labels (aria descriptions for the background state) go through `lib/i18n/uk.ts` / `en.ts` per NFR-I18N-01.

## Capabilities

### New Capabilities

- `animated-bg`: Fullscreen animated weather background driven by forecast condition and sunrise/sunset; respects `prefers-reduced-motion`; pointer-events disabled.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- **New files:** `components/animated-bg/AnimatedBackground.tsx` (client component), `lib/weather/conditions.ts` (pure mapping util), `lib/weather/conditions.test.ts`.
- **Modified files:** `app/layout.tsx` or root page to mount `AnimatedBackground` behind the main content; `app/globals.css` for background layer z-index and gradient CSS custom properties; `lib/i18n/uk.ts` and `en.ts` for any new strings.
- **Dependencies:** consumes forecast data shape already fixed by `forecast` capability (specifically `sunrise`, `sunset`, `weathercode`/`weather_code` fields from Open-Meteo daily response).
- **Bundle impact:** client-only component; CSS animations preferred over JS where possible to stay within NFR-PERF-03 (≤ 200 KB gzipped JS). Particle effects use lightweight canvas or CSS `@keyframes` — no animation library.
- **Accessibility:** background aria-hidden; `prefers-reduced-motion` hard constraint (FR-ANIM-03).
