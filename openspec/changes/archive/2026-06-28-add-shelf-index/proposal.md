# Add shelf index (C11)

## Why
The app needs a home screen: the first useful demo slice. It shows every book
grouped into shelves by tag, each book rendered as a Design-System `BookCard`
that links to the book's page, plus an entry point to add a new book.

## What Changes
- Replace the scaffold `app/page.tsx` with a tag-grouped shelf index.
- Add `components/BookCardLink.tsx` wrapping the DS `BookCard` in a `next/link`
  to `/book/<slug>`.
- Add `components/TagShelf.tsx` rendering one shelf (heading + grid of cards) per tag.
- Reuse the existing `groupBooksByTag` query (C8) and `listBooks` loader.

## Impact
- Affected specs: `shelf-index`
- Affected code: `app/page.tsx`, `components/BookCardLink.tsx`, `components/TagShelf.tsx`
- Depends on: C8 (Queries), C10 (Design-System Integration)
