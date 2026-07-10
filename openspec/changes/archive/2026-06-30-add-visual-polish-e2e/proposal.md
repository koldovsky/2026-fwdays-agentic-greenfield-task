## Why

**Sequencing:** change 11 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on all of changes 1–10
(the eight maket screens and their data / offline / sync layers). Unblocks the v1 release — this is
the acceptance gate; nothing follows it.

Changes 1–10 each built one screen or one headless layer and checked it against its own `doc/web` PNG
in isolation. Nothing yet proves the *assembled* app reproduces the maket, that every cross-screen
state (loading / empty / error / offline, hover / focus, the grid↔list and paged↔scroll toggles, the
four reading themes, the add-source stepper, the extensions and capability-missing states) is present
and styled, that the app is keyboard-operable and accessible, or that the headline promise from
`goals.md` — "open a downloaded book, move through it, reconnect; works end-to-end with the network
cut, and progress reconciles furthest-wins" — actually works against a real server. This capstone
adds that holistic acceptance layer and the automated gates that hold it in place.

## What Changes

- Add a **Playwright visual-regression harness** that renders each maket screen on a deterministic
  seeded fixture and compares it to its `doc/web` / `doc/mobile` PNG within an agreed per-screen
  tolerance, plus committed golden snapshots that guard against future drift. This is the release
  acceptance gate.
- **Verify and polish every interactive and cross-screen state** to the maket: loading / empty /
  error / offline; hover / active / focus rings; the grid↔list toggle; paged↔scroll; the four reading
  themes; the add-source stepper (Address → Detected → Sign in); the extensions installed/available
  lists and the capability-missing install-then-retry sheet. These surfaces are *built* by their
  owning changes; this change closes the remaining fidelity gaps and asserts they all exist.
- Add **keyboard-navigation and accessibility gates**: axe-core on every screen (no serious/critical
  violations), logical focus order, accessible names on icon-only controls, modal focus-trap +
  Escape, and WCAG 2.1 AA contrast across the chrome and all four reading themes.
- Add **responsive checks** so screens do not break across phone/tablet/desktop widths, with the
  phone layouts matched to `doc/mobile` (including the RTL comic reader).
- Add the **end-to-end offline happy path** — an automated Playwright flow run against the throwaway
  Docker Komga (`test/komga/`, seeded from `test-epubs/`, gated on `pnpm komga:provision`): add a
  source → browse → open a book → paginate → adjust reading preferences → go offline and read →
  reconnect and see progress reconcile furthest-wins. This run is also the source of the PR video
  demo.

## Capabilities

### New Capabilities

- `visual-fidelity`: the cross-screen acceptance layer — Playwright visual-regression against every
  maket PNG, the styled interactive/cross-screen states, the accessibility + keyboard gates, the
  responsive checks, and the end-to-end offline happy-path run against the Docker Komga.

### Modified Capabilities

- None (greenfield).

## Impact

- Tests / harness (primary): a Playwright config and `test/e2e/` specs — the per-screen visual-
  regression suite with committed golden snapshots and a render-and-compare against `doc/web` /
  `doc/mobile`, the axe-core accessibility checks, the responsive checks, and the Komga-gated offline
  e2e flow; `@axe-core/playwright` and `pixelmatch`/`pngjs` as dev dependencies; `package.json`
  scripts (`test:visual`, `test:e2e`); CI that runs `docker compose up -d komga` + `pnpm
  komga:provision` before the e2e project and skips it otherwise.
- Source: targeted **visual polish only** in existing components and design tokens to reach maket
  fidelity (e.g., focus rings, hover/active states, contrast) and to ensure every loading / empty /
  error / offline state is styled. **No new product surface** — no new routes, screens, components,
  connectors, or formats.
- Docs / fixtures: a seeded "maket fixture" mirroring the PNG content for deterministic capture;
  `KOMGA_CORS_ALLOWED_ORIGINS` must include the app origin for the e2e run (a host concern, per
  `DESIGN.md`).
- No `core/` contract or domain-model changes (this change consumes the prior capabilities, it does
  not alter them).
