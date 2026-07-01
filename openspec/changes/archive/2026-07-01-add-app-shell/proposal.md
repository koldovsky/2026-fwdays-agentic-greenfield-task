## Why

Auth is done, but a signed-in user lands on a single placeholder Home screen. The app has
no navigation and no gating structure, so the core capabilities (time-entries, stats,
profile) have nowhere to live. `app-shell` builds the navigation skeleton — a gated root
plus the bottom-tab shell and first-run empty state (FR-SHELL-01→03) — that every later
screen slots into.

## What Changes

- **New `app-shell` capability**: a gated **root navigator** (auth screen when signed out,
  the tabbed app when signed in) and a **bottom-tab shell** with four tabs — **Timer**, **History**,
  **Stats**, **Profile** — using the design system's blurred amber tab bar. The Timer
  tab shows the **first-run empty state** (hero + "Start your first entry") when the user has
  no entries. (FR-SHELL-01/02/03)
- **Mobile (`@honeydo/mobile`)**: add React Navigation (native stack for the root, bottom
  tabs for the app), a **custom design tab bar** (blur + tokens + Lucide icons per the
  `honeydo-design` TabBar), placeholder tab screens, an `EmptyState` component, and move the
  existing `useAuthStore`-based gate out of `App.tsx` into the root navigator.
- No API or `@honeydo/shared` changes — this is pure mobile navigation/UI.

## Capabilities

### New Capabilities
- `app-shell`: the mobile navigation shell — auth gating at the navigator level, bottom-tab
  layout (Timer, History, Stats, Profile), and the first-run empty state. The home for all
  authenticated screens.

### Modified Capabilities
<!-- None. Auth's gate currently lives inline in App.tsx; moving it into the navigator is an
     implementation detail — FR-AUTH-06 (401 → auth) behavior is unchanged, no auth spec edit. -->

## Impact

- **New mobile deps**: `@react-navigation/native`, `@react-navigation/native-stack`,
  `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`,
  and `expo-blur` (for the translucent tab bar). Several are **native modules** → the dev
  build must be rebuilt (`npm run ios:device`).
- **Entry/structure**: `App.tsx` wraps the tree in `NavigationContainer`; the current
  `HomeScreen` placeholder becomes the Timer tab screen. New `src/navigation/`
  (navigators, tab bar) per the project-structure rule.
- **Downstream**: real tab content (timers, stats, profile) lands in later capabilities;
  this change ships placeholders + the empty state only.
