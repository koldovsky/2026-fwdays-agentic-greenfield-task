# Proposal: add-book-store

## Why
Bookshelf needs to persist and retrieve books as `book.md` files on disk. We need a
typed store that converts between frontmatter and `Book` objects, tolerates malformed
metadata without crashing, and assigns unique slugs on creation.

## What Changes
- Add `lib/content/books.ts` with `parseBook`, `serializeBook`, `readBook`, `listBooks`,
  `createBook`, `updateBook`.
- `parseBook` validates required fields (`title`, `author`) and flags `malformed: true`
  with safe defaults when they are missing or mistyped.
- `createBook` resolves a unique slug from a desired slug or the title, suffixing
  `-2`, `-3`, … on collision.
- `listBooks` returns all books sorted by title.

## Capabilities
- New: `book-store`

## Impact
- New module `lib/content/books.ts` and test `lib/content/books.test.ts`.
- Consumes existing modules: `paths`, `fs-utils`, `types`, `slug`, and `gray-matter`.
- No changes to existing capabilities or configuration.
