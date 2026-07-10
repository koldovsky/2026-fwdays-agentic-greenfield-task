## Why

The reader is the heart of Edda, and screen `doc/web/03-reader-desktop-epub-spread.png` is the first
time a real publication is put on screen: a two-page parchment spread of *Pride and Prejudice* with
running heads, edge chevrons, a chapter opener, and a position bar. Changes 1–6 built the chrome, the
domain model, a connector, and the EPUB renderer; this change is the screen that **mounts** that
renderer and turns "we can parse an EPUB" into "we can read one". It owns only the **reader shell** —
the chrome around the renderer plus the wiring that keeps Vue's reactivity away from foliate-js's
internals — not the renderer (`format-epub`), the preferences panel (`reading-preferences`), or the
durable progress outbox (`sync-engine`).

**Sequencing:** change 7 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on `add-format-epub`
(`format-epub`, which supplies the foliate `Navigator`). Unblocks `add-reading-preferences`
(`reading-preferences`, the `Aa` panel) and the locator feed consumed by `add-offline-and-sync`
(`sync-engine`).

## What Changes

- Add the **Reader screen** at the full-bleed `/reader/:sourceId/:bookId/:mediaType` route (the route
  shell is owned by `app-shell`): a top bar (← Library, centered serif title + author, and TOC /
  bookmark / `Aa` controls), a two-page parchment spread on desktop, edge prev/next chevrons, and a
  bottom position bar (chapter label, scrubber, page/time readout) — all matched to
  `doc/web/03-reader-desktop-epub-spread.png`.
- Mount the **foliate `Navigator`** (created by `format-epub`) into a raw `HTMLElement` and store the
  `Publication` / `Navigator` / `Session` via `markRaw()` so Vue reactivity never corrupts the
  renderer's internal state (ADR-001); tear the navigator down (`destroy()`) on unmount.
- Open a **real EPUB** through the `format-epub` handler over a `PublicationSource` backed by the
  connector (`openResource`) and, once `offline-storage` lands, the OPFS cache; book bytes bypass the
  service worker (ADR-005).
- **Keyboard navigation** (←/→ page, Home/End jump) and **edge chevrons**; subscribe to the
  navigator's `locatorChanged` to track the current locator and hand each position to the sync engine
  (`sync-engine`).
- Wire the `Aa` button as the **trigger** for the reading-preferences panel (the panel is owned by
  `reading-preferences`), and wire the TOC / bookmark controls to chapter navigation and
  current-locator bookmarking.

## Capabilities

### New Capabilities

- `reader-navigation`: the Reader screen — the chrome around the foliate navigator (top bar, two-page
  parchment spread, running heads, edge chevrons, position bar), its mount / `markRaw` / destroy
  lifecycle, keyboard and chevron paging, and the `locatorChanged` → sync hand-off, all matched to
  `doc/web/03-reader-desktop-epub-spread.png`.

### Modified Capabilities

- None (greenfield).

## Impact

- Code: new `src/app/views/ReaderView.vue` and `src/app/components/reader/` (top bar, spread mount,
  chevrons, position bar / scrubber), plus a `useNavigator` composable owning the navigator lifecycle
  and the `locatorChanged` subscription.
- Consumes: `format-epub` (`open` + `createNavigator`), `app-shell` (route + design tokens),
  `core-domain-model` (`Locator` / `Publication`), and the connector (`openResource`) for bytes.
- Hands off to: `reading-preferences` (the `Aa` panel) and `sync-engine` (the locator outbox).
- No `core/` or `plugins/` changes — this is app chrome that consumes existing contracts.
