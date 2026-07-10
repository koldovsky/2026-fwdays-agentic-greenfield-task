## Why

Edda is offline-first: it must open an EPUB by parsing its **raw bytes client-side** (from an OPFS
cache or a connector stream), with no server-built manifest. ADR-002 picked **foliate-js** (vendored)
over Readium's web navigator for exactly this reason, accepting two costs: vendor a pinned SHA (there
is no real npm release) and own a **CFI↔Locator adapter** (ADR-003, `@readium/shared`). This change
delivers that **headless renderer layer** — the EPUB `FormatHandler`, the adapter, and the `Navigator`
(DESIGN.md §5.2) — so the later reader UI has a real engine to mount.

**Sequencing:** change 6 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on `add-book-detail`
(change 5) in the linear DAG; substantively builds on `core-domain-model`'s `Locator`/`Publication`
(change 2) and the `FormatHandler`/`Navigator` contracts in `core/contracts`. Unblocks
`add-reader-navigation` (change 7), which mounts and `markRaw()`s the `Navigator` this change returns.

## What Changes

- **Vendor foliate-js** as a pinned-SHA **git submodule** under `vendor/foliate-js` (MIT, no npm
  release — ADR-002), imported **lazily** via native dynamic `import()` so the engine is a code-split
  chunk and the plugin is `async` from day one (ADR-009).
- Add the **EPUB `FormatHandler`**: declares `FormatCapabilities` — media types `["application/epub+zip"]`,
  extensions `["epub"]`, `layout: 'reflowable'`, `search`, `tts`, `locatorScheme: 'cfi'`; sniffs EPUB
  input; and parses raw bytes into a Readium-aligned **`Publication`** (metadata + reading order/spine
  + table of contents).
- Read bytes from **OPFS or a stream**: the handler takes a bytes source that may be an OPFS-cached
  `File` (range reads, bypassing the SW — ADR-005) or a sequential stream from the connector; it parses
  identically from either and performs no network I/O itself.
- Add the **CFI↔Locator adapter** (`@readium/shared` — ADR-003): maps foliate's EPUB CFIs / DOM Ranges
  to and from the platform-neutral `core/model` `Locator` and **round-trips stably**, emitting plain
  serializable Locators so `core/model` keeps zero runtime dependencies.
- Add the **EPUB `Navigator`** created over a mounted `HTMLElement`: `goTo(locator)` /
  `currentLocation()`, `applyPreferences(ReadingPreferences)`, and a `locatorChanged` / `loaded` /
  `error` event surface (plus `destroy()`).
- Note the **`markRaw()` boundary** (ADR-001): the returned `Publication`/`Navigator` are imperative
  renderer objects holding foliate-js internal state; the plugin stays framework-neutral and consumers
  `markRaw()` them before placing them in reactive state.

## Capabilities

### New Capabilities

- `format-epub`: a headless EPUB `FormatHandler` over the vendored foliate-js engine — lazy-loaded
  client-side EPUB parsing into a Readium-aligned `Publication`, a tested CFI↔Locator adapter, and a
  `Navigator` (goTo/currentLocation, preferences, event surface) created over a mounted element.

### Modified Capabilities

- None (greenfield).

## Impact

- Code (plugin layer): `src/plugins/formats/epub/` — `index.ts` (FormatHandler: capabilities, sniff,
  open/parse, createNavigator), `manifest.ts` (`PluginManifest` + lazy `loader: () => import('./')`),
  `cfi-locator.ts` (the adapter), `navigator.ts` (web Navigator over an `HTMLElement`), and colocated
  Vitest tests (`epub.parse.test.ts`, `cfi-locator.test.ts`) plus a browser-environment Navigator test.
- Vendor/build: `vendor/foliate-js` pinned git submodule + `.gitmodules` (ADR-002); `@readium/shared`
  added to `package.json` (ADR-003); Vite code-splits the foliate chunk via dynamic `import()`.
- References (not edited here): `src/core/model` (`Locator`/`Publication`) and `src/core/contracts`
  (`FormatHandler`/`Navigator`). DESIGN.md §5.2's richer surface (`open`/`createNavigator`,
  `applyPreferences`/`on`/`destroy`) is an **additive** extension of the minimal stub contract — see
  design.md "Open Questions" and the cross-capability notes.
- Headless: no UI and no `doc/web/` screen — the reader UI (two-page spread) is `add-reader-navigation`
  (change 7); progress persistence is `add-offline-and-sync` (change 9).
