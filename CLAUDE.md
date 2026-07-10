# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Edda** — a self-hosted-library e-reader (Komga/Kavita/Calibre/OPDS). Web-first **PWA**, offline-first,
with a future native client. Pluggable **Connectors** (servers) and **Formats** (EPUB now; PDF/CBZ later).

**Status: implemented.** A working Vue 3 PWA lives under `src/` (library, book detail, EPUB reader,
reading preferences, add-source, extensions, offline sync), with unit tests and a four-project Playwright
acceptance suite (visual / a11y / responsive / komga-e2e). See `README.md` § What works now. The design
docs below remain the spec — read them before changing a subsystem:
- `doc/plans/goals.md` — what Edda is; goals/non-goals; scope tiers.
- `doc/plans/architecture.md` — structure; plugin model; domain model; cross-platform reuse contract.
- `doc/plans/stack.md` — technology choices + decisions log (ADRs).
- `DESIGN-CONNECTORS.md` — deep subsystem design: full interfaces and sequence diagrams.
  (Was `DESIGN.md`; root `DESIGN.md` is now the visual design system — see **Design context** below.)
- `doc/Edda - Reader (offline).html` — the **UI maket** (interactive single-file prototype of every screen).
  Rendered per-screen captures: `doc/web/` (desktop/PWA) + `doc/mobile/` (phone). See **UI & visual design** below.

Read the relevant doc before implementing a subsystem — they are the spec, not the code.

## Workflow

- **Spec-driven (OpenSpec).** Non-trivial work goes through `openspec/` via the `openspec-*` skills
  (`/openspec-propose`, `/openspec-apply-change`, `/openspec-archive-change`, ...). Propose a change before writing code.
- This is **course homework graded on process evidence** (context engineering, loops, maker≠checker, verification),
  not on scope. Leave visible engineering artifacts: specs, tests, separate review passes.
- **CodeRabbit** auto-reviews PRs in **Ukrainian** (`.coderabbit.yaml`); advisory, non-blocking. PRs use
  `.github/pull_request_template.md` (author name, video-demo link, agentic-practices writeup).
- Use **maker≠checker**: run `/code-review` (or a separate agent) on your own diff before finishing.

## Stack (decided — do not substitute)

pnpm ^10 · TypeScript (strict: `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`) ·
Vue 3.5 (Composition API, `<script setup>`) · Vite (Rolldown) · Vue Router 5 · Pinia 3 (+ Pinia Colada) ·
Tailwind 4 (app chrome only — book typography is readium-css) · **foliate-js** for EPUB (MIT, **vendored** as a
pinned git submodule under `vendor/`, no npm release) · `@readium/shared` (Locator/Publication) · pdfjs-dist (PDF) ·
OPFS + **Dexie 4** (typed migrations) · vite-plugin-pwa (injectManifest).
**Testing/lint/format: Vitest + ESLint + Prettier**; Playwright (vendored) for e2e.

All of the above is installed. `pnpm install`, then `pnpm dev` (app) / `pnpm dev:frame` (reader frame).

## UI & visual design (the maket)

`doc/Edda - Reader (offline).html` is the **interactive design maket** — a self-contained prototype of every
screen. Rendered captures (one PNG per screen) are the visual spec; treat them as source of truth for layout & look:
- **`doc/web/`** — desktop / PWA browser-frame screens.
- **`doc/mobile/`** — phone screens (future Android client + responsive web).

Screens (numbered to match the maket's sections): **Library** · **Book detail** · **Reader** (EPUB two-page spread
on desktop, mobile EPUB, comic CBZ **RTL** via Komga PSE) · **Reading themes & preferences** (Light / Sepia / Dark /
Parchment; typeface Newsreader / Literata / Sans; text size; paged vs scroll) · **Add a source** (probe →
capabilities → connect) · **Extensions** (the plugin registry: installed & available) · **Capability missing**
(install-on-demand sheet). The last three render the plugin/capability model from `DESIGN-CONNECTORS.md` — keep them in sync.

**Visual language — match it when building UI:** warm "parchment" palette (app bg ≈ `#F0EEE9`), serif display +
serif reading type (Newsreader / Literata), monospace for technical metadata (ids, versions, sizes), calm generous
spacing; four reading themes. Per the stack, **Tailwind styles app chrome only; book typography is readium-css.**

### Design context (for UI work)

- **`PRODUCT.md`** (root) — strategic: register (`product`), platform (`web`), users, brand personality
  ("Quiet · Precise · Self-hosted"), anti-references (**Kindle/Kobo web reader**, **Calibre desktop UI**),
  five design principles, and the accessibility bar (AA chrome, **AAA reading text**).
- **`DESIGN.md`** (root) — visual: the token spec, named colors ("The Scriptorium" — Terre Verte on
  Vellum, Oak Gall ink), type hierarchy, elevation doctrine, per-component states, do's and don'ts.
  Machine-readable sidecar: `.impeccable/design.json`. The subsystem spec now lives in
  `DESIGN-CONNECTORS.md` — don't confuse the two.
- Implemented tokens live in `src/app/styles/main.css` under `@theme` — every chrome color belongs there.
- The `impeccable` skill reads both files before any UI work.

## Local test stack (Docker)

`test/komga/` brings up a throwaway **Komga** server (Docker Compose) pre-seeded with `test-epubs/` and a non-admin
reader account — a real server + real books for developing and e2e-testing `connector-komga` (ADR-007). See
`test/komga/README.md`.

- `pnpm komga:up` (start + provision) · `komga:provision` (blocking; for CI/e2e gating) · `komga:logs` ·
  `komga:down` (stop, keep DB) · `komga:reset` (stop + wipe DB). Provisioning is idempotent.
- Komga at **http://localhost:25600**. The connector should auth as the least-privilege reader
  `reader@edda.test` / `edda-reader-pw` (admin `admin@edda.test` / `edda-admin-pw` only provisions). Override via
  `test/komga/.env` (copy `.env.example`).
- On web the connector uses `fetch`, so add the app origin to Komga's `KOMGA_CORS_ALLOWED_ORIGINS` (a host concern,
  not a plugin one — see `DESIGN-CONNECTORS.md`).

## Load-bearing invariants

These are non-obvious and break the architecture if violated:

- **`src/core/contracts` carries zero web-only assumptions** — no DOM, no `fetch`/`window`. The future native
  (Kotlin) client re-implements the same contracts; conformance tests are the guarantee they stay compatible.
- **Plugins are always `async`** from day one (same code runs in-process now, behind a sandbox proxy later).
  "Installing" a plugin = native dynamic `import()` of a lazy chunk, **not** downloading code from a server.
- **`markRaw()` the imperative renderer objects** (`Publication`/`Navigator`/`Session`) so Vue reactivity never
  corrupts foliate-js's internal state (ADR-001 in `stack.md`).
- **Book bytes bypass the Service Worker** — OPFS → `File.slice` for range reads; Workbox can't cache `206`.
- **Progress sync strategy is per-connector** (Komga REST vs OPDS v2 progression vs local-only). The core sync
  engine (outbox, furthest-wins, scheduling) owns nothing server-specific.

## Skills available

- `openspec-*` — the spec-driven change workflow (above).
- `modern-web-guidance` — **run first** for any HTML/CSS/client-JS work; web APIs evolve fast.
- `playwright-cli` — browser automation / e2e.
- `fallow` — Rust tooling (for any future native/tooling work).
