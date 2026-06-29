# Proposal: add-queries

## Why
The library UI needs read-side aggregation across all content: the index page groups
books into shelves by tag, the book page renders backlinks, and the LinkPicker needs a
flat list of every linkable target. These cross-cutting reads belong in a dedicated
query layer rather than in pages or in the per-entity stores.

## What Changes
- Add `groupBooksByTag` to group books into one shelf per distinct tag (alphabetical),
  with multi-tag books appearing in every matching shelf and untagged books under
  `Untagged`.
- Add `loadBacklinkIndex` to read every book and its notes from disk and build the C6
  backlink index.
- Add `loadLinkTargets` to list every book and note as a selectable `{ value, label }`
  target for the LinkPicker.

## Capabilities
- New: `queries`

## Impact
- New files: `lib/content/queries.ts`, `lib/content/index-data.ts` (plus tests).
- Consumes existing stores: `lib/content/books.ts`, `lib/content/notes.ts`,
  `lib/content/links.ts`. No changes to those modules.
- Consumed by the index/shelf page, the book page, and the LinkPicker.
