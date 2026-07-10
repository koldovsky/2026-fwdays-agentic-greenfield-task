## Context

The maket (`doc/web/`) is the visual source of truth. Screens 01 (Library) and 06 (Extensions) show
the full chrome: a left sidebar over a warm parchment canvas inside a faux browser frame, serif
headings, and monospace technical metadata (breadcrumbs like `edda.local / library`, plugin ids like
`connector.komga`, versions `v2.1.0`, sizes `1.2 MB`). The stack is decided (`stack.md`): Vue 3.5 +
Vite + Tailwind 4 (Oxide) for **app chrome only**, with book typography deliberately excluded (it is
readium-css inside the navigator). This change extracts that shared language into tokens + primitives
so later screens compose rather than re-invent.

## Goals / Non-Goals

**Goals:**
- A small, named token set (color, type, spacing, radius) that reproduces the maket's parchment look.
- Reusable primitives every screen needs: chip/pill, card, primary/secondary button, toggle, progress
  bar, segmented control, stepper, status dot.
- The persistent sidebar shell + browser-frame layout + router skeleton + global loading/empty states.
- Installable PWA whose SW precaches the shell and never intercepts book-byte (`206`) routes.

**Non-Goals:**
- Book/reading typography and the four reading themes (Light/Sepia/Dark/Parchment) — that is
  readium-css, owned by `add-reading-preferences`.
- Any data, connectors, or screen content — the shell renders with empty/placeholder regions here.
- Mobile layouts beyond making the shell responsive enough not to break (phone screens are a later
  concern; `doc/mobile/` is not in scope for this change).

## Decisions

- **Tailwind 4 `@theme` tokens, not a CSS-in-JS system.** Define the palette and type scale as CSS
  custom properties via Tailwind's `@theme` so utilities and raw CSS share one source. *Alternative:*
  a runtime theme object — rejected; chrome theming is static and Tailwind 4 is already the decided
  stack.
- **Self-host Newsreader + Literata** (woff2, `font-display: swap`) rather than a CDN — offline-first
  PWA must not depend on a font CDN. Monospace uses the system mono stack.
- **Sidebar shell as a layout component** wrapping `<RouterView>`; the reader route renders
  full-bleed (no sidebar) since screen 03 has its own top bar. *Alternative:* per-view chrome —
  rejected; duplicates the sidebar and risks drift.
- **`vite-plugin-pwa` `injectManifest`** with a hand-written `sw.ts`: precache the built shell assets,
  runtime-cache plugin chunks later, and add a **denylist** so OPFS/range book-byte requests are never
  routed through Workbox (ADR-005 — Workbox cannot cache a `206`).
- **Palette anchors (exact values finalized in implementation against the PNGs):** app bg `#F0EEE9`;
  raised surfaces a touch lighter; primary action = muted forest/olive green; warm near-black text;
  muted secondary text; green status dot. The PNGs in `doc/web/` are authoritative for final hex.

## Risks / Trade-offs

- [Token values drift from the maket] → The `design-system` spec requires a visual check against
  `doc/web/01` and `doc/web/06`; `add-visual-polish-e2e` later gates on pixel regression.
- [Self-hosted fonts bloat the initial bundle] → Subset to Latin + the weights actually used; lazy
  non-critical weights.
- [SW intercepting book bytes corrupts range reads] → Explicit denylist + a test asserting a `206`
  range request bypasses the SW.

## Open Questions

- Exact reading-theme background hexes — deferred to `add-reading-preferences` (readium-css scope).
- Whether the faux browser frame from the maket is a literal app element or just a screenshot device
  — treated as a screenshot device; the app renders the chrome inside the real browser, not a drawn
  frame. Final call validated against the PNGs during implementation.
