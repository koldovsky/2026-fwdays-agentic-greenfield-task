# Design — Shelf index (C11)

## Approach
The home page is a server component (`export const dynamic = 'force-dynamic'`)
so freshly created books appear without rebuilds. It loads books via `listBooks`
and groups them with the existing `groupBooksByTag` (C8) helper, which emits one
group per distinct tag alphabetically, places multi-tag books in each group, and
buckets untagged books under `Untagged`.

## Components
- `BookCardLink({ book })` — wraps the DS `BookCard` in a `next/link` to
  `/book/<slug>`. Maps `coverColor` → `cover` (default `ink`), builds `coverSrc`
  from `book.cover` when present, and forwards `title`, `author`, `rating`,
  `status`, `tags`.
- `TagShelf({ tag, books })` — a `<section>` with an `<h2>` tag heading and a
  `.grid` of `BookCardLink`s keyed by slug.

## Empty state
When `listBooks` returns no books, the page renders an invitation linking to
`/book/new` instead of any shelves.

## Add-book entry point
The header carries a DS `Button` wrapped in a link to `/book/new`.
