## Why

The baseline spec at `openspec/specs/i18n/spec.md` defines **FR-I18N-01** /
**NFR-I18N-01**: all user-facing strings live in `lib/i18n/uk.ts`, consumed
through a typed accessor, no runtime i18n library. The `app-shell` slice
shipped with inline Ukrainian literals in its components and `app/page.tsx`
(documented as an accepted short-term trade-off in
`openspec/changes/archive/2026-06-30-add-app-shell/design.md`, risk row
"Duplicate strings before `i18n` slice"). This change migrates those literals
into the centralised table before further slices add more copy.

## What Changes

- Add `lib/i18n/uk.ts`: a single, strongly-typed `const uk = {...} as const`
  tree of Ukrainian strings, grouped by feature area (`shell`, `home`, `meta`).
- Replace every inline Ukrainian (and English metadata) literal in
  `components/app-shell/*` and `app/page.tsx`, `app/layout.tsx` with reads from
  `uk`.
- Shared labels (e.g. the rates/focus column names) are defined **once** and
  reused by both the shell's `aria-label`s and the home page's placeholder
  titles — no duplicate literals.
- No new runtime dependency; no behavioural change to any FR-SHELL-* scenario.

## Capabilities

### New Capabilities

- `i18n`: first implementation of the baseline spec (FR-I18N-01, NFR-I18N-01).
  Delta spec mirrors `openspec/specs/i18n/spec.md` without behavioural change.

### Modified Capabilities

<!-- None — this slice relocates strings; it does not change app-shell behaviour. -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/i18n/uk.ts`** | New pure data module — the single source of truth for Ukrainian copy. |
| **`components/app-shell/AppHeader.tsx`** | Reads `uk.shell.brandTitle`, `uk.shell.brandSubtitle`, `uk.shell.themeToggleLabel`. |
| **`components/app-shell/AppFooter.tsx`** | Reads `uk.shell.footerProvenance`. |
| **`components/app-shell/AppShell.tsx`** | Reads `uk.shell.ratesColumnLabel`, `uk.shell.focusColumnLabel` for `aria-label`s. |
| **`app/page.tsx`** | Reads `uk.shell.ratesColumnLabel`/`focusColumnLabel` (titles) and `uk.home.*Hint`. |
| **`app/layout.tsx`** | `metadata.title`/`description` read from `uk.meta.*`. |
| **Dependencies** | `app-shell` (already built). Downstream: every later slice adds its copy to `uk.ts`, never inline. |
