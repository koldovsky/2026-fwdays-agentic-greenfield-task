# Tasks — add-theming

Mobile-only, JS-only (no rebuild). Reference `specs/theming/spec.md` for behavior and
`design.md` for approach. Match `honeydo-design` (SegmentedControl, Profile appearance section).
Run mobile typecheck + lint + `expo export` before committing.

## 1. Preference persistence

- [x] 1.1 `src/theme/preference.ts` — `AppearancePreference = 'light' | 'dark' | 'system'`; load/save via `expo-secure-store` under a stable key (default `'dark'` when unset)
- [x] 1.2 Extend `ThemeProvider`: hold the tri-state preference, load it on mount (default `dark`, swap on load — no flash), resolve `system` → `useColorScheme()`, persist on change (fire-and-forget)
- [x] 1.3 Extend `useThemeControls()` to expose `{ preference, setPreference }` (keep `scheme` for status-bar/theme consumers)

## 2. SegmentedControl component (FR-THEME-03)

- [x] 2.1 `src/components/SegmentedControl.tsx` per `honeydo-design/components/core/SegmentedControl.jsx` — pill track on `surface-alt`, amber active segment, token-driven, no raw hex
- [x] 2.2 Generic + typed (`options`, `value`, `onChange`) so it's reusable beyond appearance

## 3. Profile appearance section (FR-THEME-01/02)

- [x] 3.1 Add an "APPEARANCE" section to `ProfileScreen` with the SegmentedControl bound to `preference` (Light / Dark / System)
- [x] 3.2 Verify: switching applies app-wide immediately (all tabs re-color, no restart); System follows the OS live
- [x] 3.3 Verify: choice persists across a relaunch (kill + reopen restores it)

## 4. Contrast audit (NFR-A11Y-02)

- [x] 4.1 Check `text`/`textMuted`/`onAccent` vs their surfaces meet WCAG AA in **both** palettes; flag any shortfall in `tokens.ts` (sync back to the design tokens) rather than silently changing

## 5. Finalize

- [x] 5.1 Mobile `tsc --noEmit` + `eslint .` green; `expo export` bundles clean
- [x] 5.2 `openspec validate add-theming --strict`
- [x] 5.3 Update `docs/current-state.md`; commit to `dev` (reviewed, referencing FR-THEME IDs)
- [x] 5.4 `openspec archive add-theming` once verified on-device
