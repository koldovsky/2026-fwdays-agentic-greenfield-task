## Why

Notes are currently only browsable through fixed lists (all notes, one folder, one tag,
trash). Once a user has more than a handful of notes there is no way to jump straight to
one by title/content, or to narrow the list by more than a single folder or tag at a time.
This is the last capability blocking `quality-hardening` (phase 8) on the critical path.

## What Changes

- Add a PostgreSQL full-text search index (generated `tsvector` column + GIN index) over
  `Note.title` and `Note.content`.
- Add a `/search` page with a live search field: results update while the user types
  (debounced), combined with optional folder, tag, and updated-date-range filters.
- Add a `GET /api/search` route handler that runs the combined query and returns matching
  notes scoped to the authenticated user, excluding soft-deleted notes.
- Add a "Search" entry to the sidebar primary navigation.

## Capabilities

### New Capabilities
- `search`: full-text search across note title/content with combinable folder, tag, and
  date-range filters, returning live results within the search page as the user types.

### Modified Capabilities
- none — `notes-core` and `folders-tags` data shapes are reused as-is; no existing
  requirement's behavior changes, this only adds a new way to query the same data.

## Impact

- **DB**: new Prisma migration adding a generated `tsvector` column + GIN index on `Note`;
  the column is not modeled in `schema.prisma` (see design.md) so it's written by hand.
- **New code**: `lib/search/queries.ts`, `app/api/search/route.ts`,
  `app/(dashboard)/search/page.tsx`, `components/notes/search-view.tsx`.
- **Modified code**: `lib/nav-items.ts` (add Search nav item), `components/icons.tsx` (add
  search icon + nav map entry).
- **No auth/session changes.** Read-only route handler, no CSRF surface (GET only).
