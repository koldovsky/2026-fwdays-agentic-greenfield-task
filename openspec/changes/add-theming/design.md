## Context

The token theme already exists: `ThemeProvider` resolves `scheme = override ?? (system==='light'
? 'light' : 'dark')`, exposes `useTheme()` + `useThemeControls()` (`scheme`, `setScheme`), and
`tokens.ts` holds the light/dark palettes. Two gaps remain: no user control and no persistence.
`theming` adds both (FR-THEME-01/02) and audits AA contrast (NFR-A11Y-02). Design reference:
`honeydo-design/components/core/SegmentedControl.jsx` and the Profile appearance section in
`ui_kits/honeydo/ProfileScreen.jsx`.

## Goals / Non-Goals

**Goals:**
- A three-way appearance preference: `light | dark | system`, default `dark`.
- Persist the preference and restore it on launch; apply app-wide instantly (token swap).
- A reusable `SegmentedControl` component matching the design system.
- Confirm AA contrast for both palettes.

**Non-Goals:**
- Native surfaces honoring the in-app override — FR-THEME-04 keeps them on the system appearance
  (deferred with `home-widget`/`live-activity`; none exist yet).
- New palettes or per-component color work — tokens are fixed (DESIGN.md).
- A general settings/preferences store beyond this one key.

## Decisions

- **Preference model = `'light' | 'dark' | 'system'`.** Store the user's *intent*, not the
  resolved scheme. `system` means "follow the OS" (today's `override === null`). `ThemeProvider`
  resolves: `system` → `useColorScheme()`; otherwise the explicit choice. Default `dark` when
  unset (DESIGN.md). This makes "System" a first-class option instead of an implicit null.
- **Persist with `expo-secure-store`, not AsyncStorage.** It's already in the native build, so
  this stays **JS-only with no rebuild** — the right call for a small, single-key preference. A
  theme choice isn't secret, but the key/value API fits and avoids adding a native module.
  (If a broader prefs store is needed later, migrate to AsyncStorage/MMKV then.)
- **Load asynchronously without a flash.** `ThemeProvider` reads the stored preference on mount;
  until it resolves, render with the default (`dark`) so there's no light flash, then swap when
  the stored value loads. Writes are fire-and-forget on each change (apply state immediately;
  persist in the background — mirrors the app's optimistic pattern).
- **`SegmentedControl` component** (`src/components/`) per the design's core SegmentedControl:
  pill track on `surface-alt`, amber-filled active segment, token-driven. Reused anywhere a
  small multi-choice control is needed later.
- **Profile hosts the control.** An "APPEARANCE" section on `ProfileScreen` with the segmented
  control bound to the preference via `useThemeControls` (extended to expose the tri-state
  preference + a setter).
- **AA-contrast audit.** Check `text`/`textMuted`/`onAccent` against their backgrounds in both
  palettes; the tokens are AA by design (DESIGN.md), so this is verification, not re-design.

## Risks / Trade-offs

- **Launch flash.** Async preference load could flash the default before the stored theme
  applies → mitigate by defaulting to `dark` (the common case) and swapping on load; the
  provider already starts at `dark`, so the window is a frame or two.
- **secure-store semantics.** Using the keychain for a non-secret pref is slightly unusual →
  documented; trivially migratable if we add a general store.
- **System-mode reactivity.** In `system` mode the theme must react to OS changes live →
  `useColorScheme()` already re-renders on OS change; keep it in the resolve path.

## Migration Plan

- Extend `ThemeProvider` (preference state + secure-store load/save + resolve). Add
  `SegmentedControl`, wire the Profile appearance section. No data migration; JS-only, no
  rebuild. Reversible by reverting the provider + removing the control.

## Open Questions

- **Preference key + storage:** confirm `expo-secure-store` under `honeydo.themePreference`
  (vs. adding AsyncStorage) — proposal assumes secure-store for the no-rebuild win.
- **AA audit outcome:** if any pair falls short of AA, that's a token adjustment in `tokens.ts`
  synced back to the `honeydo-design` tokens — flag rather than silently tweak.
