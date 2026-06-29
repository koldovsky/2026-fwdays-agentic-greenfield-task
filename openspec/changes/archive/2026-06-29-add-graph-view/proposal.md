## Why

Notes link books and other notes, but there was no way to see the whole web of
connections at a glance. A graph view visualizes it.

## What Changes

- Add a `/graph` page: an SVG chord diagram of books arranged on a circle, with an edge
  between two books whenever a note in one references the other (or its notes).
- Nodes are colored by the book's cover color and link to the book page; node size
  reflects its number of connections. Unconnected books are omitted.
- Add a "Graph" link in the shelf header.

## Capabilities

### New Capabilities
- `graph`: a page visualizing the book/note link graph.

## Impact

- New: `lib/content/graph.ts` (+ test), `app/graph/page.tsx`; `coverSolid` in `components/cover.ts`.
- Modified: `app/page.tsx` (header link). Built on the existing link data; no data changes.
