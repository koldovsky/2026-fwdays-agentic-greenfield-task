## Why

The MVP build starts with a shared application shell so every later capability
(rates list, converter, history) renders inside one calm, Ukrainian-first surface.
The baseline spec at `openspec/specs/app-shell/spec.md` already defines
**FR-SHELL-01 … FR-SHELL-04**; this change implements that spec and replaces the
temporary in-brand preview in `app/page.tsx`.

## What Changes

- Add a real **app shell**: sticky header («Гривня» lockup + «Офіційний курс НБУ»
  subtitle + theme toggle), responsive two-column main (rates slot · focus/detail
  slot), and footer.
- **Responsive layout (FR-SHELL-02):** side-by-side columns at ≥1100 px; single
  column below the breakpoint (token `--bp-desktop`).
- **Theme toggle (FR-SHELL-03):** light/dark via `data-theme` on `<html>`; optional
  `localStorage` persistence; no flash of the wrong theme on first paint.
- **Honest loading/empty (FR-SHELL-04):** skeleton placeholders of equal footprint
  in both main slots while content is pending; calm empty copy when a slot has
  nothing to show; never a blank crash.
- Remove the temporary design-system demo content from `app/page.tsx`; the page
  becomes a thin orchestrator around the shell with placeholder slots until
  `currency-list` lands.

## Capabilities

### New Capabilities

- `app-shell`: First implementation of the baseline shell (FR-SHELL-01 … FR-SHELL-04).
  Delta spec mirrors `openspec/specs/app-shell/spec.md` without behavioural change.

### Modified Capabilities

<!-- None — baseline requirement text is unchanged. -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/theme/`** | Pure helpers: resolve/persist theme preference (`ThemePreference`), map to `data-theme` attribute value; total, never throws. |
| **`components/app-shell/`** | `AppShell`, `AppHeader`, `AppFooter`, `ShellSkeleton`, `ThemeScript` (no-flash bootstrap). |
| **`app/layout.tsx`** | Theme bootstrap script before paint; shell-friendly body classes. |
| **`app/page.tsx`** | Replaced: uses `AppShell` with placeholder left/right slots + loading skeleton demo path. |
| **`app/globals.css`** | Responsive grid utility for the two-column → one-column breakpoint. |
| **Dependencies** | None — first slice; no prior slices. Downstream: `i18n`, `currency-list`, `footer-sayings` mount inside this shell. |
| **Design system** | `@/components/ds` (`Switch`, `Card`, semantic tokens); reference layout in `docs/design-system/ui_kits/hryvnia/App.jsx`. |
