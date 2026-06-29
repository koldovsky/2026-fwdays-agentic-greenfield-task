# Design: add-queries

## Context
Read-side aggregation across the whole library. Depends on the already-implemented
stores: C4 books (`listBooks`), C5 notes (`listNotes`), and C6 links
(`buildBacklinkIndex`, `Backlink`). Two modules: pure grouping (`queries.ts`) and
disk-backed loaders (`index-data.ts`).

## Goals / Non-Goals
- Goals: tag grouping for shelves; load the backlink index from disk; produce a flat
  list of link targets for the picker.
- Non-Goals: UI components (shelf/book pages, LinkPicker); write-side mutations;
  caching or memoization.

## Decisions
- `groupBooksByTag` is pure (no I/O): takes `Book[]`, returns shelves sorted by tag via
  `localeCompare`. Untagged books are bucketed under the literal `Untagged`.
- `loadBacklinkIndex` reads all books, fetches each book's notes in parallel
  (`Promise.all`), then delegates index construction to C6's `buildBacklinkIndex`.
- `loadLinkTargets` emits a `book:` target per book and a `note:<slug>/<id>` target per
  note, with a short preview label derived from the note excerpt or body.

## Risks
- Linear/sequential note reads in `loadLinkTargets` over a large library could be slow;
  acceptable for the expected content scale. Parallelize later if needed.
