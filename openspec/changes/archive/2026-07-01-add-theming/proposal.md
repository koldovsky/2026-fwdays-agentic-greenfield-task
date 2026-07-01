## Why

Honeydo ships **Dark by default** with Light as a token swap, and the token mechanism already
exists (`ThemeProvider` resolves `override ?? system`, defaulting Dark). What's missing is the
**user-facing control** and **persistence**: a signed-in user can't choose Light/Dark/System,
and the app doesn't remember the choice across launches. `theming` closes that gap
(FR-THEME-01/02) and confirms both palettes meet AA contrast (NFR-A11Y-02).

## What Changes

- **New `theming` capability**: a **Light / Dark / System** control on the **Profile** tab
  (segmented control); the selection **persists across launches** and applies **app-wide
  immediately, without a restart**. Default remains **Dark**. (FR-THEME-01/02)
- **Mobile (`@honeydo/mobile`)**: extend `ThemeProvider` to store the preference
  (`'light' | 'dark' | 'system'`) and load it on launch; add a `SegmentedControl` component
  (per the design system) and wire it into `ProfileScreen`. Persist via the already-installed
  `expo-secure-store` (no new native module → no rebuild).
- **Confirm tokens-only + AA contrast** (FR-THEME-03 already enforced by the no-raw-hex lint
  guard; audit the light/dark palettes for WCAG AA, NFR-A11Y-02).

## Capabilities

### New Capabilities
- `theming`: user-selectable Light/Dark/System appearance with persistence, applied app-wide
  as a token swap (Dark default).

### Modified Capabilities
<!-- None. The token theme + ThemeProvider are foundation/app-shell scaffolding; this adds the
     control + persistence on top. No existing spec's requirements change. -->

## Impact

- **No new dependencies** — reuses `expo-secure-store`; JS-only, **no dev-build rebuild**.
- **Files**: `ThemeProvider` (persistence + a `'system'` mode), a new
  `src/components/SegmentedControl.tsx`, a themed appearance section in `ProfileScreen`, and a
  small `src/theme/preference` store helper.
- **Out of scope (FR-THEME-04)**: native surfaces (home-screen widget, Live Activity) follow the
  **system** appearance, not the in-app override — deferred with those iOS capabilities (none
  exist yet).
