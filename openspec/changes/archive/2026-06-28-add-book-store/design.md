# Design: add-book-store

## Context
Books are stored as `content/books/<slug>/book.md` with YAML frontmatter plus a markdown
body. The store sits on top of the storage I/O (C1), domain model (C2), and slug (C3)
modules and uses `gray-matter` for frontmatter parsing/serialization.

## Goals
- Lossless round-trip between `Book` and `book.md`.
- Never throw on malformed frontmatter; surface a `malformed` flag instead.
- Deterministic, collision-free slug assignment on create.

## Non-Goals
- Notes (handled by a separate capability).
- Cover image generation, search, or indexing.

## Decisions
- Validation is field-by-field with safe coercion: unknown `status` -> `toread`,
  out-of-range/non-numeric `rating` -> undefined, non-string tags filtered out.
- `malformed` is driven solely by missing/mistyped required fields (`title`, `author`).
- `serializeBook` omits optional fields when absent so round-trips stay clean.
- Unique slug resolution reads existing book directories and appends `-N` (N >= 2).

## Risks
- Concurrent creates could race on slug uniqueness; acceptable for a single-user local app.
- `localeCompare` sort order depends on runtime locale; acceptable for display ordering.
