## Why

This is the first build slice of the Plant Growth & Watering Tracker. Before any
plant, growth, watering, or chart feature can ship, the app needs the single
navigational frame they all live in, the theme it is viewed in, and the inline
error contract every form depends on.

This slice delivers FR-SHELL-01 (one shell, list ↔ detail navigation),
FR-SHELL-02 (persisted light/dark theme), and FR-SHELL-03 (invalid input shown
inline, never a raw 500 or silent failure). Critically, it also DEFINES the
shared server-action result type and inline-error UI that slices 2–5 (plants,
growth, watering, charts) reuse, so the contract must be settled here first.

## What Changes

- A single Next.js App Router root layout and shared (auth-less) shell with
  navigation between the plant list `/` and plant detail `/plants/[id]`.
- A `ThemeProvider` + theme toggle that persists the choice to `localStorage`
  and applies it before first paint via a pre-hydration inline script (no flash
  of the wrong theme on reload).
- The shared inline-error pattern: a discriminated server-action result type
  `{ ok: true } | { ok: false, fieldErrors?, formError? }`, plus a reusable
  `<FieldError>` component and a form-level error banner.
- Ukrainian UI copy (NFR-LOC-01) for all shell chrome and error messages; code,
  spec, and trace ids stay English.
- A not-found state for unknown `/plants/[id]` routes (friendly, never raw 500).

## Capabilities

### New Capabilities
- `app-shell`: the single navigational frame (list ↔ detail), the persisted
  light/dark theme, and the shared inline form-error contract reused by every
  later capability; home for the shell's cross-cutting a11y, responsive, and
  localization NFRs.

### Modified Capabilities
<!-- None. This change introduces the app-shell capability; no existing capability's requirements change. -->

## Impact

- New code: `app/layout.tsx`, the shell layout/nav, `app/not-found.tsx` and the
  `/plants/[id]` not-found boundary, `components/theme/` (provider + toggle +
  pre-hydration script), `components/forms/` (`FieldError`, form-error banner),
  `lib/forms/result.ts` (shared action-result type), `lib/i18n/` (Ukrainian
  copy strings), Tailwind 4 dark-mode theme tokens.
- Contract depended on by slices 2–5: the `ActionResult` shape and the
  `FieldError` / form-error banner API. Changing it later is a breaking change
  for those slices.
- Trace ids touched: FR-SHELL-01, FR-SHELL-02, FR-SHELL-03; NFR-USA-01,
  NFR-USA-02, NFR-A11Y-01, NFR-A11Y-02, NFR-A11Y-04, NFR-COMPAT-01,
  NFR-COMPAT-02, NFR-LOC-01.
- No database, no auth, no third-party integrations (TC-04).
