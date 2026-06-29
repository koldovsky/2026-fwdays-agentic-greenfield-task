# Design: add-note-store

## Context
Each book stores its notes as `notes/<id>.md` files under the book directory.
Notes carry a highlighter color, optional excerpt + page, links to other
books/notes, and a Markdown reflection body. C1 (storage I/O) and C2 (domain
model + colors) are already implemented.

## Goals
- Round-trip a `Note` through serialize/parse without loss.
- Tolerant parsing so malformed frontmatter never throws.
- Simple CRUD: read, list (sorted), save (create/overwrite), delete.

## Non-Goals
- Link parsing / backlink indexing (separate capability).
- Validating that linked targets exist.
- Guaranteeing `newNoteId` global uniqueness (best-effort random id).

## Decisions
- Use `gray-matter` for YAML frontmatter + body, matching the book store.
- Reuse `atomicWrite` for safe overwrites and `listFiles`/`readFileOr` from
  fs-utils so missing dirs/files yield empty/null rather than errors.
- Color validated via `isNoteColor`; fall back to `DEFAULT_NOTE_COLOR`.
- `id` is derived from the filename on read, not trusted from frontmatter.

## Risks
- `newNoteId` collisions are possible but unlikely; acceptable for now.
- Frontmatter type coercion relies on gray-matter parsing numbers/arrays as
  expected; guarded with `typeof`/`Array.isArray` checks.
