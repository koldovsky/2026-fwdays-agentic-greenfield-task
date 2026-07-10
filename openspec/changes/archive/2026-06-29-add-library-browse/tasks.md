## 1. Core domain model

- [x] 1.1 Extend `src/core/model/index.ts`: confirm `Locator` / `LocatorLocations` carry `progression`,
      `totalProgression`, `position`, `cfi`, `page` and the optional `text` (`before`/`highlight`/`after`);
      keep them DOM-free and network-free
- [x] 1.2 Add the `layout` discriminator (`reflowable | fixed | image-sequence | mixed`) to `Publication`
- [x] 1.3 Add the **library browse entry** view-model composing `BookRef` with `author?`, series/volume
      label?, thumbnail reference, a progress snapshot (`totalProgression?`, `position?`/`totalPositions?`),
      a derived format label, and a source label — all non-identity fields optional/derivable
- [x] 1.4 Add `src/core/model/serialization.ts`: versioned `serialize`/`parse` for `Locator`,
      `Publication`, and the browse entry, stamping an explicit `schemaVersion`, JSON-native values only

## 2. Fixture connector

- [x] 2.1 Add `src/plugins/connectors/fixture/` implementing the `Connector` interface from
      `core/contracts` (`id`, `progressSync`, `probe`, `browse`, `content`, `progressStrategy`)
- [x] 2.2 Seed its in-memory catalog to reproduce `doc/web/01-library-desktop.png` exactly — the three
      "Keep reading" books (with progress + chips) and the six "Recently added" books (with format badges)
- [x] 2.3 Provide a local-only / no-op `ProgressSyncStrategy` and an in-memory progress snapshot keyed per
      `(sourceId, bookId, mediaType)`

## 3. Library screen — header, search, sync pill

- [x] 3.1 Add the Library view + route; render the "Your library" heading and the counts line
      ("342 titles · 3 sources · 14 downloaded for offline") per `doc/web/01-library-desktop.png`
- [x] 3.2 Add the search box ("Search titles, authors…") with local title/author filtering (no network)
- [x] 3.3 Add the "Synced 2m ago" pill from a supplied last-sync time, composing the `design-system` pill

## 4. Keep reading row

- [x] 4.1 Build the "Keep reading" card (cover, title, author/volume line, format+source chips, progress
      bar) composing `design-system` primitives, matched to `doc/web/01-library-desktop.png`
- [x] 4.2 Format the progress readout: "<pct>% · <phrase>" for percent-tracked and "page <pos> / <total>"
      for page-tracked formats; render the "See all" affordance and the horizontal row

## 5. Recently added grid + toggle

- [x] 5.1 Build the "Recently added" cover (format badge EPUB/CBZ/PDF + spine label, title/author beneath)
      and the grid, matched to `doc/web/01-library-desktop.png`
- [x] 5.2 Add the grid/list segmented toggle (default grid) re-presenting the same entries as a list
      without losing/reordering them

## 6. Wiring

- [x] 6.1 Bind the Library to a `Connector` (the fixture here) via `browse()`; depend only on the
      interface so `add-connector-komga` can substitute Komga with no Library changes
- [x] 6.2 Assemble each browse entry from the connector's browse result + the per-`(sourceId, bookId,
      mediaType)` progress snapshot + derived source/format labels
- [x] 6.3 Vitest: model serialization round-trip + version conformance; Library component tests mounting
      on the fixture connector asserting the cards, readouts, chips, badges, search filter, and toggle

## 7. Verification (maker ≠ checker)

- [x] 7.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 7.2 Design-fidelity check: Playwright screenshot of the Library route compared against
      `doc/web/01-library-desktop.png` (regions, labels, exact strings: heading, counts, chips, readouts)
- [x] 7.3 Independent review pass (`/code-review` or a separate agent) on the diff; address findings
- [x] 7.4 `openspec validate add-library-browse --strict` passes
