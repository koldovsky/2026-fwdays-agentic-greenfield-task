## Context

Edda normalises every format onto a Readium-aligned `Publication` + `Locator` (DESIGN.md §4) so
progress, TOC, bookmarks, and search work the same everywhere. EPUB is the first format. Because Edda
is **offline-first**, it cannot use Readium's web navigator (which needs a server-built manifest); it
must parse raw bytes in the browser. ADR-002 therefore vendors **foliate-js** (MIT, no npm release) and
accepts owning a **CFI↔Locator adapter**; ADR-003 keeps `@readium/shared` for the model vocabulary and
the adapter so the contract — and native-toolkit compatibility — survives even though rendering is
foliate.

This change is the **headless renderer layer** described in DESIGN.md §5.2 (`FormatHandler` /
`Navigator`). It produces a `Publication` and a `Navigator`; it does **not** render a reader screen
(that is `add-reader-navigation`, change 7) or persist progress (`add-offline-and-sync`, change 9).
`core/model` and `core/contracts` are platform-neutral (no DOM, no `fetch`); foliate-js and
`@readium/shared` are web libraries that live entirely in this **plugin** layer, which emits plain
`core/model` shapes back across the boundary.

Both real fixtures in `test-epubs/` are first-class test inputs: a large light-novel EPUB
(`The Eminence in Shadow - Volume 01 [Yen Press][Kobo].epub`, EPUB 3.0, title "The Eminence in Shadow,
Vol. 1", 59-item spine, nav.xhtml + NCX) and a small one (`blaise-pascal_pensees.epub`, title
"Pensées", Blaise Pascal, NCX TOC).

## Goals / Non-Goals

**Goals:**
- A `FormatHandler` that declares EPUB `FormatCapabilities`, sniffs EPUB input, and parses raw bytes
  **client-side** into a Readium-aligned `Publication` (metadata, reading order/spine, TOC) for **both**
  `test-epubs/` fixtures.
- A bytes-source abstraction that reads from an **OPFS** file (range reads) or a **stream**, parsing
  identically and performing no network I/O.
- A **tested CFI↔Locator adapter** (via `@readium/shared`) that round-trips stably and emits plain
  `core/model` Locators.
- A web **`Navigator`** over a mounted `HTMLElement`: `goTo`/`currentLocation`,
  `applyPreferences`, a `locatorChanged`/`loaded`/`error` event surface, and `destroy`.
- foliate-js **vendored** as a pinned git submodule and **lazy-loaded** via dynamic `import()`.
- Keep `core/model` + `core/contracts` platform-neutral — the plugin owns all web/DOM dependencies.

**Non-Goals:**
- The reader UI, two-page spread, or mounting/`markRaw()`-ing the Navigator in a Vue view (change 7).
- Reading themes, typefaces, text-size, paged/scroll — the readium-css `ReadingPreferences` **values**
  are owned by `add-reading-preferences` (change 8); this Navigator only **applies** whatever it is
  handed.
- Progress sync, the outbox, or furthest-wins (`add-offline-and-sync`, change 9). The Navigator only
  **emits** locators; it never persists them.
- PDF/CBZ formats (`format-pdf` in change 10; CBZ later).
- Registry resolution, the media-type sniffer wiring, and capability dispatch (`plugin-registry`,
  `core/sniff`, `capability-dispatch` are owned elsewhere). This change declares capabilities + a lazy
  loader; resolution is **referenced**, not built.

## Decisions

- **Vendor foliate-js as a pinned-SHA git submodule under `vendor/foliate-js` (ADR-002).** foliate-js
  has no real npm release; a submodule pinned to an exact commit makes the build reproducible and keeps
  the MIT source auditable and patchable in-tree, with a clear update path. The plugin imports it by
  relative path. *Alternative: copy the sources in, or an npm tarball* — rejected; copy-paste loses
  provenance and the upgrade path, and no published package exists. *Alternative: Readium's web
  navigator* — rejected; it needs a server-built manifest, incompatible with offline client-side parse.
- **Lazy chunk via native dynamic `import()` (ADR-009).** The foliate engine is loaded with
  `await import('…/vendor/foliate-js/…')` on first `open`, so it is code-split out of the initial
  bundle and the plugin is `async` from day one — "installing" a format is importing a lazy chunk, not
  downloading remote code. *Alternative: a static top-level import* — rejected; bloats the initial
  bundle and defeats the install-on-demand model the dispatcher relies on.
- **CFI↔Locator adapter uses `@readium/shared` internally but emits plain `core/model` Locators
  (ADR-003).** foliate speaks EPUB CFI and DOM `Range`s; the adapter converts CFI ⇄ the neutral
  `Locator`, carrying the CFI in `locations.cfi`. `@readium/shared` provides the Locator/Publication
  vocabulary and CFI helpers but stays **inside** the plugin; the adapter outputs plain serializable
  `core/model` shapes so `core/model` keeps zero runtime deps and the native (Kotlin) client
  re-expresses the identical shape. *Alternative: store `@readium/shared` `Locator` class instances in
  the model* — rejected; pulls a web runtime into the neutral core and breaks serialization conformance.
- **Round-trip stability is the adapter's contract.** `cfi → Locator → cfi` returns the original CFI
  and a DOM `Range → Locator → Range` resolves to the same selection; verified against **real CFIs from
  both fixtures**. The `Locator` is the unit the sync engine stores, so an unstable round-trip silently
  corrupts saved progress. The adapter is **pure** and unit-tested independently of the renderer.
  *Alternative: store opaque foliate CFIs without a neutral Locator* — rejected; breaks
  per-`(sourceId,bookId,mediaType)` progress and native reuse.
- **Bytes-source abstraction: OPFS file vs stream, range reads (ADR-005).** The handler accepts a
  source that yields bytes/ranges — offline from an OPFS-cached `File` via `File.slice` (bypassing the
  Service Worker, since Workbox cannot cache a `206`), online from a connector stream
  (`Connector.openResource`). The handler issues range reads and is agnostic to origin. *Alternative:
  require a fully-buffered `Uint8Array`* — rejected; a 14 MB EPUB should not be fully buffered when a
  ranged read suffices, and it couples the handler to one storage backend.
- **Web `Navigator` over a mounted `HTMLElement`; the neutral contract stays DOM-free.**
  `createNavigator(pub, mount, opts)` is a **web-platform factory** returning a `Navigator` that
  implements the neutral `goTo`/`currentLocation` contract **plus** web-only
  `applyPreferences`/`on`/`destroy`. The `HTMLElement` mount and the event surface are web concerns
  that live in the plugin; `core/contracts.Navigator` stays DOM-free (the Kotlin client has no
  `HTMLElement`). *Alternative: put `HTMLElement` on the `core/contracts` Navigator* — rejected;
  violates the platform-neutrality invariant.
- **`markRaw()` boundary owned by consumers; the plugin is framework-neutral (ADR-001).**
  `Publication`/`Navigator` are imperative objects holding foliate-js internal state; a Vue reactive
  proxy would corrupt that state. The plugin imports no Vue and returns plain instances; the consuming
  reader (change 7) `markRaw()`s them before storing them in reactive state. *Alternative: have the
  plugin `markRaw()` its own returns* — rejected; couples a framework-neutral plugin to Vue. The same
  rule applies to connector `Session`s (owned by the connector changes).

## Risks / Trade-offs

- [foliate-js submodule SHA drifts, or upstream changes break parsing] → Pin an exact commit in
  `.gitmodules`; any bump is a deliberate, reviewed change gated by the both-fixture parse + CFI
  round-trip tests as the regression suite.
- [An unstable CFI round-trip silently corrupts saved reading progress] → Round-trip tests against real
  CFIs from **both** fixtures are part of the spec; the adapter is pure and tested without the renderer.
- [The 14 MB light-novel EPUB inflates test runtime / memory] → Prefer ranged/streamed reads over
  full-buffering; keep large-fixture assertions to metadata/spine/TOC plus a single CFI round-trip.
- [A consumer forgets `markRaw()` and Vue reactivity corrupts foliate state] → The contract documents
  the boundary and a test asserts the returned objects are non-reactive and that the package imports no
  UI framework, so the failure surfaces at the boundary, not deep in the renderer.
- [foliate renders into an `<iframe>`, so the Navigator needs a real DOM] → Parse + adapter are pure
  and run in Vitest (node/jsdom); Navigator behaviour (`goTo`/`currentLocation`, preferences, events)
  is exercised in a **browser environment** (Vitest browser mode or Playwright), noted in tasks.

## Open Questions

- **Contract surface.** The stub `core/contracts.FormatHandler` exposes only `parse(bytes)` and
  `Navigator` only `goTo`/`currentLocation`. DESIGN.md §5.2 adds `sniff`/`open`/`createNavigator`,
  `capabilities`, and `applyPreferences`/`on`/`destroy`. This change treats the richer surface as an
  **additive extension** and declares it; whether the extra members land in `core/contracts` (neutral
  parts) versus a web-platform sub-interface is a cross-capability decision for the orchestrator to
  reconcile (this change does not edit `core/contracts`).
- **`ReadingPreferences` shape** is owned by `add-reading-preferences` (change 8); until it is defined,
  `applyPreferences` targets DESIGN.md's `ReadingPreferences` (font / size / theme / columns / RTL).
- **foliate "book"/"Session" object exposure** — leaning toward keeping it internal to the Navigator so
  only `Publication` + `Navigator` cross the boundary; revisited when the reader UI lands (change 7).
