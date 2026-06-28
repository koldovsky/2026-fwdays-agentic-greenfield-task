## Why

The design system already ships a complete `[data-theme="dark"]` color palette (`app/design-system/tokens/colors.css`), and both DESIGN.md and NFR-A11Y-02 require WCAG AA contrast across light **and** dark themes. Currently `<html data-theme="light">` is hardcoded in `app/layout.tsx` — the dark theme exists in CSS but is completely unreachable by users.

Adding a theme toggle completes a planned requirement and respects `prefers-color-scheme` for users who prefer dark environments, without introducing any new color work.

## What Changes

- Detect OS preference (`prefers-color-scheme`) as the default; store the user's explicit choice in `localStorage`.
- Write the resolved `data-theme` attribute to `<html>` **before first paint** via an inline blocking script (eliminates flash of wrong theme — FOWT).
- Add a compact icon-button toggle in the top bar (sun ↔ moon icon from Lucide, 24 px, 1.75 stroke) that swaps light ↔ dark.
- Persist the user's choice in `localStorage` under the key `nadvori-theme`; on next visit the blocking script restores it immediately.
- No change to any color tokens — they are already correct for both themes.

## Capabilities

### New Capabilities

- `dark-theme`: System-aware theme toggle with FOWT-free persistence. Reads `prefers-color-scheme` as default; stores explicit user preference in `localStorage`. Toggle rendered as a compact icon-button in the header.

### Modified Capabilities

- `app-shell`: Header gains the theme toggle button. Layout structure unchanged.

## Impact

- **New files:** `components/ThemeToggle/` (client component), `lib/theme.ts` (pure theme utility — `getInitialTheme`, `setTheme`).
- **Modified files:** `app/layout.tsx` (inline blocking script + `ThemeProvider` wrapper or direct attribute mutation); header component to mount `<ThemeToggle />`.
- **New dependency:** none — Lucide icons already used across the project.
- **Bundle impact:** negligible (small client component + tiny localStorage utility).
- **Accessibility:** icon button needs an accessible label ("Перемкнути тему" / "Toggle theme"); focus ring always visible (`NFR-A11Y-01`).
