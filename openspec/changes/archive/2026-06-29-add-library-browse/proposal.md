## Why

The app shell (change 1) gives Edda its chrome but no content: every screen still renders empty
regions. The Library home (`doc/web/01-library-desktop.png`) is the first real screen — and it is the
one that forces the **platform-neutral domain model** into existence (a Readium-aligned `Locator` /
`Publication`, and the browse reference the library cards render). Building the Library against an
**in-memory fixture connector** (the same `Connector` interface the Komga REST connector will later
implement) makes the screen real and unit-testable with no server, and proves the connector seam
before any network code exists.

**Sequencing:** change 2 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on `add-app-shell`
(design system + chrome). Unblocks `add-connector-komga` (which swaps the fixture for a real
`Connector`) and every later screen that renders books (book detail, reader, downloads).

## What Changes

- Add the **core domain model** (`src/core/model`): the Readium-aligned, platform-neutral `Locator`
  and `Publication`, the `BookRef` identity with per-`(sourceId, bookId, mediaType)` progress keying,
  the richer **library browse entry** the cards render, and a **versioned JSON serialization** that
  round-trips identically and carries no DOM/network types (the native client re-expresses the same
  shape; conformance tests are the guarantee). This extends the existing stubs in `src/core/model`.
- Add the **Library home screen** (`library-browse`) exactly as in `doc/web/01-library-desktop.png`:
  the "Your library" heading + counts line, a "Search titles, authors…" box with **local** filtering,
  a "Synced 2m ago" pill, a "Keep reading" row of progress cards (cover, title, author/volume line,
  progress readout, format+source chips, progress bar, a "See all" link), a "Recently added" cover
  grid (format badge + spine label + title/author), and a grid/list toggle.
- Add an **in-memory fixture connector** implementing the existing `Connector` contract from
  `core/contracts`, seeded to reproduce the books and labels in the maket. The Library depends only on
  the `Connector` interface; `add-connector-komga` (change 3) substitutes the Komga connector with no
  Library changes.

## Capabilities

### New Capabilities

- `core-domain-model`: the platform-neutral, Readium-aligned vocabulary (`Locator`, `Publication`,
  `BookRef` + progress keying, the library browse entry) plus a versioned, conformance-tested JSON
  serialization the future native client reads/writes identically.
- `library-browse`: the Library home screen — header/counts/search/sync-pill, the "Keep reading" row,
  the "Recently added" grid, and the grid/list toggle — rendering from a `Connector` (a fixture here).

### Modified Capabilities

- None (greenfield). This change references `design-system` and `app-shell` (change 1) for chrome and
  primitives, and the `Connector` / `ProgressSyncStrategy` interfaces in `core/contracts`, but creates
  no `MODIFIED` deltas; later changes reference `core-domain-model` rather than modifying it.

## Impact

- Code: extends `src/core/model/index.ts` (add the browse entry, the `layout` discriminator, and the
  serialization helpers); new `src/core/model/serialization.ts`; new fixture connector under
  `src/plugins/connectors/fixture/` (implements `core/contracts` `Connector`); new Library view +
  components under `src/app/` (Library route, Keep-reading card, recently-added cover, grid/list
  toggle) composing `design-system` primitives.
- Tests: model serialization round-trip / version conformance tests; Library component tests that mount
  on the fixture connector and assert the cards/grid; a Playwright design-fidelity check vs
  `doc/web/01-library-desktop.png`.
- No server, networking, or persistence (the fixture is in-memory). Durable offline storage and live
  sync are owned by `add-offline-and-sync` (change 9); real catalog data by `add-connector-komga`
  (change 3).
