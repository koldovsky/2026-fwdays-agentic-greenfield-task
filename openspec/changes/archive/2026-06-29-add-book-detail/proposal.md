## Why

Once a reader picks a book in the Library, they need a place to decide whether and how to read it:
see the cover, title, author, and metadata; read the blurb; check how far they already are; and jump
back in. Screen 02 of the maket (`doc/web/02-book-detail-desktop.png`) is that place. It is also where
Edda's most subtle invariant becomes visible to the user: **progress is keyed per format**, so the same
title read as EPUB on a phone and as PDF on a desktop keeps two separate positions. This change builds
that screen as a read-only presentation surface over the existing domain model, plus the actions that
launch the reader and offline download.

**Sequencing:** change 5 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on `add-source-flow`
(chain predecessor) and consumes `core-domain-model` (`BookMeta`/`Publication`/`Locator`) from
`add-library-browse` and the chrome/routing from `add-app-shell`. Unblocks `add-format-epub`, after
which the Chapters section's table of contents is fully populated; its "Continue reading" action is the
entry point the later reader changes (`add-reader-navigation`) light up.

## What Changes

- Add the **book detail screen** at the app-shell book route, with the maket's two-column composition:
  a header row (← Back, monospace breadcrumb `home server / fiction / austen`, share, "…" more), a left
  column (large cover + the action stack), and a right column (identity, metadata, cards, chapters).
- Render **book identity & metadata** from the connector's `getBook` (`BookMeta`): serif title, author,
  a row of metadata pills (`1813`, `English`, `432 pages`, `Fiction · Romance`), and the description.
- Render the **"YOUR PROGRESS" card** — a large `38%`, an estimated `about 1h 12m left`, a progress bar,
  and `Last read 2h ago on Phone` — from the `Locator` keyed for the book's current format.
- Render the **"SYNCED PER FORMAT" explainer card** that surfaces the per-`(sourceId, bookId, mediaType)`
  progress-keying invariant from `core-domain-model` (the EPUB-on-Phone vs PDF-on-Desktop example).
- Add the **reading actions**: a primary "Continue reading" that opens the reader route keyed by
  `(sourceId, bookId, mediaType)`, an "Offline" (download) button, and a bookmark toggle.
- Render the **"CHAPTERS" section** ("61 chapters") as numbered table-of-contents rows (chapter number,
  title, page like `p. 162`) with a play ▸ marker on the current chapter, sourced from `Publication.toc`
  (fully populated once `add-format-epub` lands).

## Capabilities

### New Capabilities

- `book-detail`: the Book detail screen (screen 02) — header, cover, identity/metadata, progress and
  per-format cards, reading actions, and the chapters table of contents — rendered to the maket over the
  shared domain model.

### Modified Capabilities

- None (greenfield).

## Impact

- Code: a new `BookDetailView` and its sub-components (header, identity/metadata, progress card,
  per-format card, action stack, chapters list) under `src/app/`, mounted on the app-shell book route.
- Data (read-only, owned elsewhere): `BookMeta` via `Connector.getBook`; `Publication.toc` via a format
  handler; the progress `Locator` for the current `(sourceId, bookId, mediaType)`. This change defines no
  new connector, format, or sync behavior — it consumes those contracts and degrades gracefully when a
  provider (e.g. `format-epub` for the TOC, the sync engine for live progress) is not yet present.
- No `core/contracts`, `core/model`, or `plugins/` changes (this is a screen built on existing
  contracts).
