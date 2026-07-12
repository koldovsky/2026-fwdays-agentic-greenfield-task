# Proposal: add-shell

## Why

FR-SHELL-02 (responsive layout at 768 px) is the last open requirement of the S0
`shell` capability — FR-SHELL-01 is accepted and implemented, FR-SHELL-03 is
shipped. Today the dashboard shell renders a fixed 224 px sidebar
(`w-56`, `src/components/layout/app-sidebar.tsx`) at every viewport width, so
below 768 px the content column is squeezed and the shell overflows
horizontally. Until FR-SHELL-02 ships, `shell` cannot be marked `shipped` in
`openspec/capability-map.yaml`, which keeps S2 (`supplier-profile`,
`client-directory`) blocked.

## What Changes

- Dashboard shell adapts at the 768 px breakpoint:
  - **≥ 768 px** — persistent left sidebar, unchanged from today.
  - **< 768 px** — sidebar is hidden; navigation moves to a mobile header
    pattern (compact top bar with a toggleable nav), and the main content area
    takes the full viewport width.
- Content surfaces rendered inside the shell (`<main>`) reflow without
  horizontal overflow down to a 375 px viewport, so the future invoice preview
  surface (`wf-doc` / `wf-panel`) stays readable on mobile.
- Landing page (`src/app/page.tsx`) verified to reflow at the same breakpoint.
- FR-SHELL-02 scenarios are sharpened in the spec (desktop scenario + concrete
  375 px no-overflow check) so the requirement is verifiable.
- No route, health-endpoint, or domain-logic changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `shell`: FR-SHELL-02 "Responsive layout" — requirement intent is unchanged,
  but scenarios are expanded to make it testable: explicit desktop (≥ 768 px)
  behavior, mobile navigation access below 768 px, and a no-horizontal-overflow
  guarantee at 375 px. Delta spec: `specs/shell/spec.md`.

## Impact

- **Affected code** (UI layer only):
  - `src/app/(dashboard)/layout.tsx` — responsive shell structure
  - `src/components/layout/app-sidebar.tsx` — desktop-only visibility
  - new `src/components/layout/mobile-nav.tsx` (or equivalent) — sub-768 px nav
  - `src/app/page.tsx` — verify/adjust landing reflow
- **Explicitly out of bounds:** `src/lib/` is not touched (session constraint;
  shell owns no domain logic), `src/app/api/` unchanged.
- **Dependencies:** none added; WEG3D Fin tokens and Tailwind v4 utilities only.
- **Traceability:** FR-SHELL-02 (`docs/requirements.md`) moves
  `proposed → shipped` once implemented and synced; `docs/capabilities/shell.md`
  and `openspec/capability-map.yaml` (`shell: shipped`) follow, unlocking S2.
- **Risk:** wayfinder ticket 11 (design-system reconciliation) is still open and
  lists `shell` as affected — this change sticks to existing `wf-*` tokens and
  `h-9`/radius conventions so any later token reconciliation is orthogonal.

## Non-goals

- No invoice preview implementation — the preview surface itself belongs to
  `document-render`/`form-input` (S3/S4); shell only guarantees the reflow
  container it will live in.
- No Ukrainian UI-string sweep (NFR-I18N-01) — nav labels stay as they are in
  this change; tracked at capability level, not FR-SHELL-02.
- No auth, no new routes, no `src/lib/` modules, no design-token changes
  (ticket 11 owns that).
- No BC-LEGAL-02 disclaimer work — separate concern from responsive layout.

## Success criteria

- At 375 px viewport: no horizontal overflow anywhere in the shell, navigation
  to Dashboard / Invoices / Clients / Settings reachable, all links resolve.
- At ≥ 768 px: persistent sidebar behavior identical to current desktop layout.
- `npm run typecheck && npm run lint && npm run build` green; build < 60 s
  (NFR-PERF-01).
- `openspec validate --strict` passes for the delta spec.
- After `/opsx:sync` + shipping: FR-SHELL-02 status updated in
  `docs/requirements.md`, `shell` marked `shipped` in `capability-map.yaml`,
  and `docs/current-state.md` handoff updated.
