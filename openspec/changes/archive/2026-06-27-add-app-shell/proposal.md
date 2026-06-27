## Why

Settings and the engine are invisible until something renders them. This capability
is the app's body: the single-screen layout, the quiet navigation between the main
"next break" view, Settings, and Stats, and the breathing-ring focal point that makes
the whole product feel calm (FR-SHELL-01…03, DESIGN.md).

## What Changes

- Single-screen PWA layout: a main "next break" view plus Settings and Stats reached
  from a quiet nav (FR-SHELL-01).
- Mobile-first responsive layout where the breathing ring stays the focal point down
  to small phone widths (FR-SHELL-02).
- First-run state: calm defaults applied plus a short intro line when no settings exist (FR-SHELL-03).
- The signature breathing ring (SVG arc + countdown) with idle / due / disabled states,
  honoring `prefers-reduced-motion` (DESIGN.md, NFR-MOTION-01).
- App-wide tokens via `@theme` in `globals.css` and fonts via `next/font/google`
  (TC-STACK-02, TC-FONT-01).
- The Settings view itself (editable fields + recompute-on-change), which depends on
  the shell's tokens and nav. Relocated here from `add-settings`, whose storage core
  (persistence + defaults) already shipped (FR-SETTINGS-01, FR-SETTINGS-04).

## Capabilities

### New Capabilities
- `shell`: the application shell — layout, navigation, first-run state, and the breathing-ring main view.

### Modified Capabilities
- `settings`: adds the Settings view (editable fields, recompute-on-change) on top of the
  already-shipped storage core. The view is built here because it needs the shell's
  DESIGN.md tokens and navigation.

## Impact

- New code: `src/app/` routes/layout, `src/components/` (BreathingRing, nav), `app/globals.css` tokens.
- Depends on `reminder-engine` (countdown target) and `settings` (current settings, first-run defaults).
- Must meet NFR-A11Y-01/02 (focus styles, contrast) and NFR-MOTION-01 (reduced motion).
