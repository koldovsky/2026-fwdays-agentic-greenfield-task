## Context

Auth is complete: `useAuthStore` exposes `status` (`loading`/`signedIn`/`signedOut`) and
`App.tsx` currently branches on it between `AuthScreen` and a placeholder `HomeScreen`. There
is no navigation library. `app-shell` introduces real navigation, moves the gate into it, and
adds the tab layout + empty state (FR-SHELL-01/02/03). Design reference:
`honeydo-design/components/app/TabBar.jsx`, `ui_kits/honeydo/App.jsx` and `EmptyScreen.jsx`.

## Goals / Non-Goals

**Goals:**
- A gated root navigator: auth screen when signed out, tabs when signed in, a splash while
  the session restores — driven by `useAuthStore`.
- A bottom-tab shell (Timer/History, Stats, Profile) with the design's blurred amber tab bar.
- A reusable `EmptyState` and the first-run "Start your first entry" screen.
- Structure that later capabilities drop screens into without touching navigation.

**Non-Goals:**
- Real tab content (timers, stats, profile data) — placeholders now; filled by later capabilities.
- Deep linking / URL routing, and Android-specific tab-bar polish (iOS-first, BC-PLATFORM-01).
- Persisting the last-active tab across launches.

## Decisions

- **React Navigation, not Expo Router.** The app already has a plain `App.tsx` entry; adopting
  file-based routing now is a larger structural change for no MVP benefit. Use
  `@react-navigation/native` with a **native stack** (`@react-navigation/native-stack`) for the
  root and **bottom tabs** (`@react-navigation/bottom-tabs`) for the app — native-backed
  (`react-native-screens`) per the RN-native-navigators guidance.
- **Gate at the navigator, off `useAuthStore`.** `App.tsx` renders `NavigationContainer`; a root
  component reads `status` and renders: `loading` → splash/loader, `signedOut` → the auth stack,
  `signedIn` → the tab navigator. Conditionally mounting the trees is the standard React
  Navigation auth pattern and satisfies FR-SHELL-02 (sign-in/out swaps trees, no reload).
- **Custom tab bar for design fidelity.** The design's tab bar is a translucent blurred surface
  with an amber active state — not the stock iOS tab bar. Pass a custom `tabBar` to
  `bottom-tabs` built from theme tokens + `expo-blur` (`BlurView`) + Lucide icons, matching
  `honeydo-design/components/app/TabBar.jsx`. Tab height/safe-area from `theme.layout.tabBarHeight`.
- **Three tabs per the requirement.** Timer/History (combined), Stats, Profile — not four. The
  Timer/History tab hosts the empty state now; History/Timer content arrives with `time-entries`.
- **Empty state as a component.** A reusable `EmptyState` (honeycomb hero + bee glyph + primary
  action) per `EmptyScreen.jsx`; the Timer/History screen shows it while entries are empty. Until
  `time-entries` exists there are no entries, so it renders the empty state by default.
- **`src/navigation/`** holds the navigators + tab bar (project-structure rule); screens stay in
  `src/screens/`.

## Risks / Trade-offs

- **Native modules → rebuild.** `react-native-screens`, `react-native-safe-area-context`,
  `expo-blur` are native → `npm run ios:device` required; JS reload won't pick them up.
  Mitigation: bundle them with this change so there's a single rebuild.
- **Blur performance / appearance.** `BlurView` can be costly and looks different per OS →
  keep it to the tab bar; fall back to a translucent solid `surface` fill if needed (still a
  token swap, NFR-OBS-01).
- **useFrameworks: static already set** (from google-signin) → new pods must integrate under it;
  verify pod install after adding deps.
- **Empty-state coupling.** The "has entries" check is a placeholder until `time-entries`; keep
  it behind a simple boolean so wiring the real query later is a one-line change.

## Migration Plan

- Add nav deps via `npx expo install` (SDK-compatible). Prebuild + rebuild the dev client.
- Refactor `App.tsx`: `ThemeProvider` → `NavigationContainer` → gated root. Reuse `AuthScreen`
  and the current `HomeScreen` (becomes the Timer/History placeholder / empty state host).
- No data migration; no API/shared changes; reversible by removing `src/navigation/` and
  restoring the inline gate.

## Open Questions

- **Tab icons:** confirm the Lucide glyphs (e.g. `timer`/`clock`, `bar-chart-3`, `user`) match
  the design's intent when SF Symbols aren't available.
- **NavigationContainer theme:** map RN Navigation's theme to Honeydo tokens (background) so
  there's no white flash between screens — set container `theme.colors.background = bg`.
