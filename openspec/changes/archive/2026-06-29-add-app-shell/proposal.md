## Why

Edda is greenfield: the scaffold has a bare Vue shell (two placeholder views, a router) and no
visual language. Every screen in the maket (`doc/web/`) shares the same chrome — a warm "parchment"
palette, serif display + reading type, monospace for technical metadata, a left sidebar, and a
browser-frame layout. Establishing that **design system** and **app shell** first is what lets every
later screen be built to the maket instead of drifting from it.

**Sequencing:** change 1 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on nothing. Unblocks
every subsequent UI change, all of which inherit these tokens and this chrome.

## What Changes

- Add a **design system**: parchment palette (app bg ≈ `#F0EEE9`), serif display/reading fonts
  (Newsreader / Literata), monospace for ids/versions/sizes, and reusable primitives (chip/pill,
  card, primary/secondary button, toggle, progress bar, segmented control, stepper) — all matched to
  `doc/web/`. Tailwind 4 styles **app chrome only**; book typography is out of scope here (it is
  readium-css, owned by `add-reading-preferences`).
- Add the **app shell**: the left sidebar (Home / Library / Search / Downloads-with-badge, a Sources
  region, an Extensions / Settings footer), the browser-frame content layout, the router skeleton
  (library / book / reader / settings routes), and global loading/empty states.
- Add a **base PWA shell**: installable web manifest + `injectManifest` service worker that precaches
  the app shell and **denylists book-byte routes** (`206` range reads bypass the SW — ADR-005).

## Capabilities

### New Capabilities

- `design-system`: the visual language as code — color/typography/spacing tokens and the reusable UI
  primitives every screen composes, matched to the `doc/web/` maket.
- `app-shell`: the persistent chrome (sidebar nav, sources region, browser-frame layout), routing
  skeleton, global states, and PWA installability + shell precache.

### Modified Capabilities

- None (greenfield).

## Impact

- Code: `src/app/App.vue`, `src/app/router/index.ts`, `src/app/styles/main.css`, new
  `src/app/components/` (primitives) and `src/app/layouts/` (sidebar shell), `index.html`, `sw.ts`.
- Build: Tailwind 4 `@theme` tokens via `@tailwindcss/vite`; `vite-plugin-pwa` (`injectManifest`);
  self-hosted Newsreader/Literata web fonts.
- No `core/` or `plugins/` changes (this is chrome only).
