## Context

`doc/web/03-reader-desktop-epub-spread.png` is the visual source of truth: a top bar over a warm
parchment canvas, a two-page spread of aged paper with running heads and a chapter opener, large
prev/next chevrons hugging the left and right edges, and a bottom position bar. By this change the
renderer already exists — `format-epub` (change 6) vendors foliate-js and exposes
`FormatHandler.open(source) → Publication` and `createNavigator(pub, mount, opts) → Navigator`
(DESIGN.md §5.2). The job here is the *shell*: mount that imperative renderer into Vue without letting
reactivity corrupt it, draw the maket's chrome around it, and route the navigator's locator stream to
the sync engine.

This is the first screen that holds a live, imperative, DOM-owning object (`Navigator`) for its whole
lifetime, so the reactivity-safety and teardown rules below are load-bearing, not stylistic.

## Goals / Non-Goals

**Goals:**
- The Reader screen of `doc/web/03` end-to-end — top bar, two-page parchment spread, running heads,
  edge chevrons, bottom position bar — opening a real EPUB.
- A safe navigator lifecycle: `markRaw()` the renderer objects, mount into a raw `HTMLElement`,
  `destroy()` on unmount.
- Page navigation (chevrons + ←/→ + Home/End) and a `locatorChanged`-driven current locator that is
  handed to the sync engine.
- Clear, named seams for the `Aa` preferences panel, TOC, and bookmark controls.

**Non-Goals:**
- The reading-preferences panel itself (themes / typeface / size / paged-vs-scroll) — owned by
  `reading-preferences`. Here `Aa` is only the trigger, and `Navigator.applyPreferences` is called by
  that change, not this one.
- The foliate renderer, CFI↔Locator mapping, and EPUB parsing — owned by `format-epub`.
- The durable progress outbox, furthest-progression-wins reconcile, and OPFS offline caching — owned
  by `sync-engine` / `offline-storage`. This change only emits locators and consumes a
  `PublicationSource`.
- Mobile/phone reader layout (`doc/mobile/`) and the CBZ/PDF readers.

## Decisions

- **`markRaw()` every imperative renderer object (`Publication`, `Navigator`, `Session`).** Store them
  as plain refs (e.g. `shallowRef` holding `markRaw(obj)`, or a closure variable in the composable),
  never inside a reactive `ref`/`reactive`. *Rationale:* Vue's reactive proxy wraps nested objects,
  but foliate keeps internal state by identity (live `Range`s, DOM nodes, iframe documents);
  proxying it desynchronizes pagination and breaks `goTo`. *Alternative:* deep-reactive refs —
  rejected (ADR-001): proven to corrupt foliate-js state.
- **Own the navigator lifecycle in a `useNavigator` composable.** Create the navigator on mount, after
  the mount `HTMLElement` exists; on unmount or route change call `destroy()`, clear the element, and
  drop subscriptions. *Alternative:* lifecycle inline in the view — rejected; harder to test and easy
  to leak a navigator across route changes.
- **The mount target is a plain, non-reactive `HTMLElement`** obtained via a template ref and passed
  to `createNavigator(pub, el, opts)`. Foliate owns that subtree after mount; Vue must not render
  children into it. *Alternative:* let Vue manage the spread DOM — rejected; the renderer owns it.
- **The two-page spread is foliate's paginator in two-column (spread) mode**, sized to the parchment
  surface; the reader passes a "two-page on desktop, single-page below a width breakpoint" layout
  option and lets foliate paginate. Running heads, per-page page numbers, and the chapter opener match
  `doc/web/03`. *Alternative:* the reader re-implements pagination — rejected; foliate is the renderer.
- **`Aa` / TOC / bookmark are chrome hooks, not renderer features.** `Aa` emits an "open preferences"
  intent that the `reading-preferences` panel listens for (the cross-capability seam); TOC reads
  `Publication.toc` and calls `Navigator.goTo(locator)`; bookmark captures `Navigator.currentLocator()`
  and toggles a stored bookmark. None of these reach into foliate internals.
- **`locatorChanged` → sync is one-directional and decoupled.** The reader subscribes to
  `Navigator.on('locatorChanged', …)`, updates a reactive *current-locator* view-model for the
  position bar, and forwards the `Locator` to the sync engine's intake keyed by
  `(sourceId, bookId, mediaType)`. The reader never writes to a server and never owns the outbox —
  `sync-engine` does. *Alternative:* the reader calls `connector.setProgress` directly — rejected;
  this violates the per-connector sync invariant (the engine owns scheduling + furthest-wins).
- **Bytes come from a `PublicationSource`, not the reader.** The reader asks `format-epub` to `open` a
  source backed by the connector's `openResource` now, and by the OPFS cache once `offline-storage`
  lands; either way book-byte range reads bypass the service worker (ADR-005). *Alternative:* the
  reader fetches bytes itself — rejected; the format handler reads ranges through the host bridge.

## Risks / Trade-offs

- [Reactive wrapping silently corrupts foliate state] → `markRaw()` the renderer objects, plus a unit
  test asserting the stored refs are non-reactive and that repeated navigation does not corrupt the
  spread.
- [Navigator leaks across route changes / re-mounts] → the `useNavigator` composable `destroy()`s and
  clears the mount on unmount; a test asserts `destroy()` is called and the element is emptied.
- [Coupling the reader to the sync engine before it exists] → the reader emits locators only through a
  narrow intake; `sync-engine` (change 9) implements durability. Until then the hand-off is a no-op
  sink, exercised by a spy in tests.
- [Two-page spread breaks at narrow widths] → a width breakpoint falls back to a single page; the
  desktop maket check pins the two-page case.

## Open Questions

- Whether "6 min left in chapter" is computed by the reader (from positions/words remaining in the
  current chapter) or supplied by `format-epub` — treated here as a reader-side estimate over the
  chapter's remaining progression; the final source is confirmed when `format-epub` lands.
- Initial-locator restore: at change 7 the reader navigates to a supplied initial `Locator` if one is
  available; full furthest-progression-wins reconcile across devices is `sync-engine` (change 9).
