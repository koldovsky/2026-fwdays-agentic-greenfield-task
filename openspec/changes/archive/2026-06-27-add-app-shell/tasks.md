## 1. Tokens & fonts

- [x] 1.1 Read the App Router guide in `node_modules/next/dist/docs/` before writing routes — read layouts-and-pages, fonts, css (Tailwind v4), server-and-client-components for Next 16.2.9
- [x] 1.2 Define Still Water tokens via `@theme` in `app/globals.css` (TC-STACK-02)
- [x] 1.3 Load Fraunces + Inter via `next/font/google`, map to `--font-display`/`--font-sans` (TC-FONT-01)

## 2. Shell & navigation

- [x] 2.1 Build the root layout and single-screen shell (FR-SHELL-01)
- [x] 2.2 Add quiet nav between main / Settings / Stats with visible focus styles (FR-SHELL-01, NFR-A11Y-01)
- [x] 2.3 Make the layout mobile-first with the ring as focal point at small widths (FR-SHELL-02)
- [x] 2.4 Add first-run intro line when no settings are saved (FR-SHELL-03)

## 3. Breathing ring

- [x] 3.1 Add a pure helper for the elapsed-fraction → arc offset (consumes engine output)
- [x] 3.2 Build `BreathingRing` (SVG arc + centered `tabular-nums` countdown) with idle/due/disabled states (DESIGN.md)
- [x] 3.3 Gate the breathing pulse and grow-ins behind `motion-reduce:` (NFR-MOTION-01)
- [x] 3.4 Wire a client tick supplying `from` to the engine; ensure `lib/` stays clock-free

## 4. Settings view (relocated from add-settings)

- [x] 4.1 Build the Settings view with controls for all fields, using DESIGN.md tokens (FR-SETTINGS-01)
- [x] 4.2 Hold settings in client state; persist via `saveSettings` (the shipped storage core) on change
- [x] 4.3 On any change, recompute the next reminder via `computeNextReminder` and reflect it in the main view (FR-SETTINGS-04)

## 5. Verify

- [x] 5.1 Unit-test the arc-fraction helper
- [x] 5.2 Run `npm run lint && npm run typecheck && npm test && npm run build` — ALL GREEN (lint clean, typecheck clean, 40/40 tests, build prerenders `/`). Removed the stale repo-root `types/` dir that was the sole blocker; Next regenerates correct validators into the gitignored `.next/types/`.
- [x] 5.3 Check reduced-motion and focus styles manually; run `npx openspec validate add-app-shell --strict` — validate passes. Drove system Chrome (Playwright): idle ring + countdown ✓, disabled "Off"/muted ✓ (toggle persisted to localStorage), keyboard focus ring on nav ✓, reduced-motion computed `animationName` `breathe`→`none` ✓, zero console errors (NFR-OBS-01). Found+fixed a first-paint bug (showed "Off" when enabled but not yet mounted → now idle "—").
