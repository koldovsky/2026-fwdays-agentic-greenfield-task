## Why

The shelf should feel like a real bookshelf: books standing vertically as colored
spines, highlighting on hover, and opening a quick summary popup on click — instead of
a flat grid of cover cards that navigates away immediately.

## What Changes

- Render each book as a vertical **spine** (colored by `coverColor`, vertical
  title + author, varied height) instead of a `BookCard` cover tile.
- **Hover** highlights a spine (lift + brighten).
- **Click** opens a **popup** (cover or generated color block, title, author, rating,
  status, tags, summary) with an "Open book" link to `/book/<slug>`. **BREAKING** for
  the shelf interaction: clicking no longer navigates directly.
- Tag grouping (shelves) is unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `shelf-index`: book tiles become vertical spines; click opens a summary popup
  (with an Open-book link) rather than navigating; hover highlights.

## Impact

- New: `components/BookSpine.tsx`, `components/BookPopup.tsx`,
  `components/ShelfClient.tsx`, `components/cover.ts` (+ tests).
- Modified: `app/page.tsx`, `app/globals.css` (spine/shelf styles).
- Removed: `components/BookCardLink.tsx`, `components/TagShelf.tsx`,
  `components/shelf.test.tsx` (replaced by the spine view).
- Data layer and `/book/[slug]` page unchanged.
