## 1. Route & data loading

- [x] 1.1 Mount a `BookDetailView` on the app-shell book route, reading `(sourceId, bookId)` from the
      route params (do not redefine the route — it is owned by `add-app-shell`)
- [x] 1.2 Load `BookMeta` via the active connector's `getBook(session, bookId)` (`core-domain-model`);
      handle loading and error states using the design-system global states
- [x] 1.3 Resolve the book's current `(sourceId, bookId, mediaType)` and read its progress `Locator`,
      treating "no locator" as a not-started state
- [x] 1.4 Read `Publication.toc` when a format handler is present; degrade to a placeholder when it is not
      (full population arrives with `add-format-epub`)

## 2. Header & two-column layout

- [x] 2.1 Build the header row: "← Back" control, monospace breadcrumb (`home server / fiction / austen`),
      share control, and "…" more control, per `doc/web/02-book-detail-desktop.png`
- [x] 2.2 Wire Back to return to the originating `library-browse` context
- [x] 2.3 Build the two-column composition (left: cover + action stack; right: identity, cards, chapters)
      and make it reflow without overlap at smaller desktop widths

## 3. Identity, metadata & description

- [x] 3.1 Render the large cover, the serif-display title, and the author from `BookMeta`
- [x] 3.2 Render the metadata pills (year / language / page count / genres) with design-system chips,
      omitting pills for facts absent from `BookMeta`
- [x] 3.3 Render the description paragraph

## 4. Progress & per-format cards

- [x] 4.1 Build the "YOUR PROGRESS" card: large percentage and progress bar from `Locator.totalProgression`,
      the derived "about 1h 12m left" estimate, and the "Last read … on …" line
- [x] 4.2 Build the "SYNCED PER FORMAT" card with the maket's exact text, surfacing the
      per-`(sourceId, bookId, mediaType)` keying invariant (`core-domain-model`)
- [x] 4.3 Ensure the displayed progress is the current media type's position (separate per format)

## 5. Reading actions

- [x] 5.1 Build the primary "Continue reading" button → navigate to `/reader/:sourceId/:bookId/:mediaType`
      carrying the saved locator (start when none)
- [x] 5.2 Build the "Offline" download button (request download via the offline-storage interface) and the
      bookmark toggle

## 6. Chapters / table of contents

- [x] 6.1 Render the "CHAPTERS" header with the chapter count and the numbered TOC rows (number, title,
      `p. <n>`) from `Publication.toc`, per `doc/web/02-book-detail-desktop.png`
- [ ] 6.2 Mark the current chapter with a play ▸ marker; activating a row opens the reader at that row's
      locator (deferred: needs a real `Publication.toc` + current locator-in-toc → `add-format-epub`
      change 6 / `add-reader-navigation` change 7; the row scaffold + placeholder are in place now)
- [x] 6.3 Render the graceful empty/placeholder state when no `Publication.toc` is available yet

## 7. Verification (maker ≠ checker)

- [x] 7.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 7.2 Design-fidelity check: Playwright screenshot of the book detail screen compared against
      `doc/web/02-book-detail-desktop.png` (header, two-column composition, cards, chapters)
- [ ] 7.3 Independent review pass (`/code-review` or a separate agent) on the diff; address findings
- [x] 7.4 `openspec validate add-book-detail --strict` passes
