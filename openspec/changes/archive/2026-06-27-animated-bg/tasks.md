## 1. Pure utility — condition mapping

- [x] 1.1 Create `lib/weather/conditions.ts` with `WeatherState` type and `getWeatherState(code, sunrise, sunset, nowIso)` pure function implementing the WMO bucket mapping
- [x] 1.2 Write `lib/weather/conditions.test.ts` with Vitest unit tests covering: clear day, clear night, rain codes (51, 61, 80, 95), snow codes (71, 73, 85), cloudy codes (1, 2, 3, 45), unknown code fallback, and sunrise/sunset boundary edge cases
- [x] 1.3 Run `npm test` and confirm all `conditions.test.ts` cases pass

## 2. CSS animation layer

- [x] 2.1 Add z-index custom properties to `app/globals.css`: `--z-bg`, `--z-content`, `--z-modal` with documented values
- [x] 2.2 Add CSS `@keyframes` for rain particles (vertical fall), snowflakes (diagonal drift + slight sway), and cloud drift (horizontal translate) to `app/globals.css`
- [x] 2.3 Add `@media (prefers-reduced-motion: reduce)` block that sets `animation: none` on all background animation classes
- [x] 2.4 Add per-state background gradient CSS custom properties or Tailwind classes for: `clear-day`, `clear-night`, `cloudy-day`, `cloudy-night`, `rain`, `snow`, neutral

## 3. AnimatedBackground component

- [x] 3.1 Create `components/animated-bg/AnimatedBackground.tsx` as a `'use client'` component that reads `weatherCode`, `sunrise`, and `sunset` from the forecast store/context
- [x] 3.2 Implement `useReducedMotion()` hook (wraps `window.matchMedia('(prefers-reduced-motion: reduce)')`) and use it to skip mounting particle layers when true
- [x] 3.3 Render fixed-position wrapper div with `aria-hidden="true"`, `pointer-events: none`, and `z-index: var(--z-bg)`; apply condition-appropriate CSS classes derived from `getWeatherState()`
- [x] 3.4 Render particle/cloud sub-layers inside the wrapper only when reduced-motion is false; each layer is a styled div driven by CSS `@keyframes`
- [x] 3.5 Handle missing/undefined forecast data gracefully: render neutral gradient state

## 4. Integration — mount in layout

- [x] 4.1 Import and mount `<AnimatedBackground />` in `app/layout.tsx` (or root page) as a fixed background layer, confirming it is rendered below all page content
- [x] 4.2 Verify z-index layering: background does not cover the navigation bar, search input, forecast panel, or any interactive element at mobile (375 px), tablet (768 px), and desktop (1280 px) viewports

## 5. i18n strings

- [x] 5.1 Add any new UI strings (e.g. accessible `aria-label` for background state if needed) to `lib/i18n/uk.ts` and `lib/i18n/en.ts`

## 6. Verification

- [x] 6.1 Run `npm run lint && tsc --noEmit` and fix all errors
- [x] 6.2 Run `npm test` and confirm all tests pass including `conditions.test.ts`
- [x] 6.3 Run `npm run build` and confirm no build errors
- [x] 6.4 Manually verify in browser: select a city → background changes to match condition; toggle OS reduced-motion → animations stop; click interactive elements → they receive click events unobstructed
- [x] 6.5 Check console is silent (no warnings or errors) during a normal session (NFR-OBS-01)
