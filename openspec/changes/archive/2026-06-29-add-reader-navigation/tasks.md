## 1. Reader route & shell

- [x] 1.1 Add `ReaderView.vue` at the full-bleed `/reader/:sourceId/:bookId/:mediaType` route (route
      shell owned by `app-shell`); render with no sidebar
- [x] 1.2 Build the top bar (← Library, centered serif title + author, right cluster: TOC, bookmark,
      Aa) per `doc/web/03-reader-desktop-epub-spread.png`
- [x] 1.3 Wire ← Library back-navigation to the library route and ensure leaving triggers navigator
      teardown

## 2. Navigator lifecycle (markRaw + mount/destroy)

- [x] 2.1 Add a `useNavigator` composable that, given a `Publication`, creates the foliate `Navigator`
      (from `format-epub`) against a plain `HTMLElement` template ref
- [x] 2.2 Store `Publication` / `Navigator` / `Session` via `markRaw()` (non-reactive) so Vue never
      wraps the renderer (ADR-001)
- [x] 2.3 On unmount / route change, call `Navigator.destroy()`, clear the mount element, and drop
      subscriptions
- [x] 2.4 Vitest: stored renderer refs are non-reactive; `destroy()` is called and the mount cleared on
      unmount

## 3. Opening a real EPUB

- [x] 3.1 Resolve `(sourceId, bookId, mediaType)` to a `PublicationSource` backed by the connector
      (`content`); ask `format-epub` to `open` it
- [x] 3.2 Render the first two-page spread; ensure book-byte range (`206`) reads bypass the service
      worker (ADR-005) — bytes come from `connector.content` as a buffer, not a SW-intercepted URL
- [x] 3.3 Integration test: open a real EPUB from `test-epubs/` (served through the fixture connector)
      and assert the first spread renders — `e2e/reader.spec.ts` (real Chromium; foliate needs a browser)

## 4. Spread, furniture & chevrons

- [x] 4.1 Render the two-page parchment spread on desktop (foliate two-column paginator) with a
      single-page fallback below the breakpoint
- [x] 4.2 Show running heads, per-page page numbers, and the chapter opener per
      `doc/web/03-reader-desktop-epub-spread.png`
- [x] 4.3 Add large edge prev/next chevrons that page the navigator

## 5. Paging, keyboard & position bar

- [x] 5.1 Keyboard navigation: ←/→ change pages, Home/End jump to start/end
- [x] 5.2 Build the bottom position bar — chapter label, draggable scrubber, and the
      "p. 1–2 / 432 · 6 min left in chapter" readout — per `doc/web/03-reader-desktop-epub-spread.png`
- [x] 5.3 Make the scrubber reflect total progression and seek on drag

## 6. Controls & cross-capability hooks

- [x] 6.1 Wire the Aa control to open the `reading-preferences` panel (trigger only; do not build the
      panel here) — `readerPreferencesStore` seam
- [x] 6.2 Wire TOC (from `Publication.toc` → `Navigator.goTo`) and bookmark (toggle at current locator)
- [x] 6.3 Subscribe to `locatorChanged`: update the current locator (position bar) and forward each
      `Locator`, keyed by `(sourceId, bookId, mediaType)`, to the `sync-engine` intake; restore to an
      initial locator on open

## Security (content isolation)

> SUPERSEDED by `add-reader-origin-isolation` (ADR-013). The in-app parse-and-strip + per-document CSP
> approach (ADR-012) repeatedly leaked and is replaced by rendering book content on a SEPARATE ORIGIN
> (the `reader-isolation` capability). `content-security.ts` + the CSP threading in `book-loader.ts` are
> deleted; the delta requirement above is revised to the separate-origin guarantee. S.1–S.3 below
> recorded the original (now-removed) ADR-012 mechanism and no longer reflect the implementation.

- [x] ~~S.1 Inject a strict per-document CSP into every framed (X)HTML resource at parse time
      (`content-security.ts` + the shared `book-loader.ts`); route the render path through that loader
      (`view.open(book)`), so the CSP is load-bearing and not just on the headless parse~~ — superseded by
      origin isolation (ADR-013); the renderer now runs on a credential-free origin, so there is nothing
      reachable to sanitise.
- [x] ~~S.2 Prove both ways: benign EPUB still renders + paginates (e2e); a probe EPUB embedding
      `localStorage.setItem('XSS',…)` renders WITHOUT setting it (e2e negative assertion)~~ — replaced by
      `e2e/reader.spec.ts` Test A/B under ADR-013 (benign paginates in the cross-origin frame; an XSS
      probe runs but is denied by the same-origin policy).
- [x] ~~S.3 Document it: ADR-012 in `doc/plans/stack.md` + a content-isolation requirement & scenarios in
      the change's delta spec~~ — ADR-012 is marked superseded by ADR-013; the delta requirement is
      revised to origin isolation (above).

## 7. Verification (maker ≠ checker)

- [x] 7.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 7.2 Design-fidelity check: Playwright screenshot of the Reader screen compared against
      `doc/web/03-reader-desktop-epub-spread.png` (top bar, two-page spread, running heads, edge
      chevrons, scrubber, and the page/time readout)
- [ ] 7.3 Independent review pass (`/code-review` or a separate agent) on the diff; address findings
- [x] 7.4 `openspec validate add-reader-navigation --strict` passes
