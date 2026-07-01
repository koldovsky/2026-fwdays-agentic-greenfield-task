# Tasks — add-app-shell

Mobile-only. Reference `specs/app-shell/spec.md` for behavior and `design.md` for approach.
Match the `honeydo-design` references (TabBar, EmptyScreen). Run mobile typecheck + lint and
an `expo export` bundle before committing.

## 1. Navigation setup

- [ ] 1.1 `npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context expo-blur`
- [ ] 1.2 Wrap the app: `App.tsx` → `SafeAreaProvider` + `ThemeProvider` + `NavigationContainer` (container theme background = `bg`, no white flash)
- [ ] 1.3 `src/navigation/` folder per the project-structure rule

## 2. Gated root navigator (FR-SHELL-02)

- [ ] 2.1 Root navigator reads `useAuthStore(status)`: `loading` → splash/loader, `signedOut` → auth stack, `signedIn` → tab navigator
- [ ] 2.2 Auth stack (native-stack) hosting `AuthScreen`; move the gate out of `App.tsx`
- [ ] 2.3 Verify tree-swap: sign-in shows tabs, sign-out returns to auth, no manual reload

## 3. Bottom-tab shell + design tab bar (FR-SHELL-01)

- [ ] 3.1 Bottom-tab navigator with three tabs: Timer/History, Stats, Profile
- [ ] 3.2 Custom `tabBar` per `honeydo-design/components/app/TabBar.jsx`: `expo-blur` translucent surface, amber active state, Lucide icons, height/safe-area from `theme.layout.tabBarHeight` — tokens only, no raw hex
- [ ] 3.3 Active-tab indication + labels in sentence case; icons match the design intent

## 4. Tab screens (placeholders)

- [ ] 4.1 `TimerHistoryScreen` — hosts the empty state now (Timer/History content lands with `time-entries`)
- [ ] 4.2 `StatsScreen` placeholder (token-driven, titled)
- [ ] 4.3 `ProfileScreen` placeholder showing the signed-in user + sign-out (reuse existing sign-out)

## 5. First-run empty state (FR-SHELL-03)

- [ ] 5.1 Reusable `EmptyState` component per `EmptyScreen.jsx` — honeycomb hero + bee glyph + primary action, from tokens
- [ ] 5.2 Timer/History shows the empty state ("Start your first entry") while entries are empty, behind a simple `hasEntries` boolean (wired to the real query in `time-entries`)

## 6. Finalize

- [ ] 6.1 Mobile `tsc --noEmit` + `eslint .` green; `expo export` bundles clean
- [ ] 6.2 `expo prebuild --clean` + verify new native pods install (under `useFrameworks: static`)
- [ ] 6.3 `openspec validate add-app-shell --strict`
- [ ] 6.4 Update `docs/current-state.md`; commit to `dev` (reviewed, referencing FR-SHELL IDs). Rebuild note: `npm run ios:device` (native modules)
- [ ] 6.5 `openspec archive add-app-shell` once implemented and verified on-device
