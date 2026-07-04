## Context

`Note` (schema.prisma) has `title`, `content`, `folderId`, `deletedAt`, `updatedAt`, and a
`NoteTag` join table to `Tag`. Existing query helpers (`lib/notes/queries.ts`) already do
single-dimension filtering: `listNotesByFolder`, `listNotesByTag`. This phase adds one
combined query (text + folder + tags + date range) and a live UI for it. No schema fields
from the PRD's aspirational list (`color`, `isFavorite`, `isPinned`) are search filters —
those aren't part of FR-060..064 and stay out of scope, consistent with prior phases'
decision to build only what `requirements.md` actually lists.

## Goals / Non-Goals

**Goals:**
- FR-060: full-text search across `title` + `content`.
- FR-061/062: folder and tag filters, combinable with the text query (not just standalone
  list views, which already exist from `folders-tags`).
- FR-063: filter by date range.
- FR-064: results update while typing (debounced, cancels stale in-flight requests).
- NFR-002: keep the query itself sub-300ms via a GIN-indexed `tsvector` column; debounce
  input so we aren't racing the network on every keystroke.

**Non-Goals:**
- Searching trashed notes (`deletedAt != null`) — trash has its own view; not in FR-060..064.
- Fuzzy/typo-tolerant search, ranking tuning beyond Postgres's default `ts_rank`, or search
  across folder/tag names themselves.
- A global command-palette / Cmd+K launcher — this ships as a dedicated `/search` page
  reached from the sidebar, matching how every other list view in this app works.
- Any restore/permanent-delete affordance (already out of scope per `note-actions`).

## Decisions

### 1. Generated `tsvector` column via a hand-written migration, fully modeled in `schema.prisma`

Postgres full-text search needs a `tsvector` to index. Options:
- (a) Compute `to_tsvector(title || ' ' || content)` at query time — no index possible,
  degrades linearly with note count, risks NFR-002 as the table grows.
- (b) A generated, stored `tsvector` column with a GIN index. **Chosen.**

Prisma has no first-class syntax for `GENERATED ALWAYS AS (...) STORED`, so the column has
to be added by a hand-written migration (`prisma migrate dev --create-only`, then edit the
generated empty SQL file):

```sql
ALTER TABLE "Note" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'B')
  ) STORED;

CREATE INDEX "Note_searchVector_idx" ON "Note" USING GIN ("searchVector");
```

Title (`A`) outranks content (`B`) in `ts_rank`, so title matches sort first. All reads
against this column go through `prisma.$queryRaw` (see decision 3) since `Unsupported`
fields are invisible to the generated Prisma Client's typed query API.

**Important — this column must still be declared in `schema.prisma`, not omitted.**
Leaving it out (the initial approach) makes every future `prisma migrate dev` propose
`DROP COLUMN "searchVector"` (Prisma reconciles schema.prisma against migration history on
every invocation) and then hard-error non-interactively (`P1: environment is
non-interactive`) instead of prompting. The working shape, verified with
`prisma migrate diff --from-url ... --to-schema-datamodel ...` until it returned an empty
script:

```prisma
searchVector Unsupported("tsvector")? @default(dbgenerated("(setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::\"char\") || setweight(to_tsvector('english'::regconfig, COALESCE(content, ''::text)), 'B'::\"char\"))"))
// ...
@@index([searchVector], type: Gin)
```

The `@default(dbgenerated("..."))` string must match byte-for-byte what Postgres reports
back for the generated expression (confirmed via a throwaway `prisma db pull` against a
copy of the schema) — Prisma's drift-detector treats the `STORED` generated expression as
if it were a column default, and any mismatch (including an absent default) is proposed as
a fix. With this exact declaration, `prisma migrate dev` reports "Already in sync" and
`prisma migrate diff` against the live DB returns an empty script.

**Trade-off:** the schema.prisma comment on this field is load-bearing documentation, not
just style — the byte-for-byte matching requirement is not obvious from reading Prisma's
docs and will look like an unnecessary `@default` to a future reader.

### 2. Route Handler (`GET /api/search`), not a Server Action

Server Actions in this codebase are used for mutations (`createNote`, `updateNote`, ...),
called from forms/transitions. Live-search-while-typing is a read, fired on every
debounced keystroke, and benefits from being independently `fetch`-cancelable
(`AbortController`) — a plain `GET` Route Handler is the idiomatic fit (per
`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`) and needs no
CSRF token (SEC-003 only applies to state-changing requests; this project's
`assertSameOrigin()` guard is reserved for actions that write data).

`app/api/search/route.ts`:
- `verifySession()` (same DAL used everywhere) — 401 via redirect is fine since this is
  only ever called from an already-authenticated page.
- Parses `q`, `folderId`, `tagIds` (comma-separated), `from`, `to` from
  `request.nextUrl.searchParams`.
- Calls `searchNotes(userId, filters)` and returns `NextResponse.json({ notes })`.

### 3. `lib/search/queries.ts` — one raw query, ownership always scoped by `userId`

```ts
searchNotes(userId: string, filters: {
  query?: string;
  folderId?: string;
  tagIds?: string[];
  from?: Date;
  to?: Date;
})
```

- Builds a single `prisma.$queryRaw` (via `Prisma.sql` fragments) so text rank, folder,
  tag, and date filters combine in one indexed query rather than fetch-then-filter in JS.
- `deletedAt IS NULL` and `userId = ${userId}` are unconditional — no filter input can
  widen the scope to another user's notes or to trash (mirrors `getOwnedFolder`/
  `getOwnedTag`'s ownership pattern).
- Text query: `websearch_to_tsquery('english', ${query})` against `searchVector` — chosen
  over `plainto_tsquery` because it accepts natural typed input (quoted phrases, `-word`
  exclusion) without the caller needing tsquery syntax. When `query` is empty/absent, skip
  the text predicate entirely and just apply the other filters, ordered by `updatedAt desc`
  (so `/search` with only a folder filter behaves like the existing `listNotesByFolder`).
- Folder: exact `folderId = ${folderId}`. Tags: `EXISTS` against `NoteTag` for
  `tagId = ANY(${tagIds})` — **OR** semantics across selected tags (matches any of them),
  not AND-intersection; nothing in FR-062 asks for intersection and OR is the more
  discoverable default for a search UI.
- Date range: filters on `updatedAt` (not `createdAt`) — every other list in this app sorts
  by `updatedAt`, so "recently touched" is this app's working definition of "date" for a
  note; documented here since the PRD's "date/status" phrase is ambiguous.
- Result cap: `LIMIT 50` — no pagination in this phase (not in FR-060..064; revisit if
  product wants it).

### 4. Client: dedicated `/search` page, not a modal

`app/(dashboard)/search/page.tsx` (Server Component) reads the initial `q`/filters from its
`searchParams` prop, runs the first `searchNotes` call server-side (so the first paint has
results, no client round-trip, keeping NFR-001 intact), and passes `folders`/`tags` (for
filter pickers, reusing `listFolders`/`listTags`) plus the initial result set into
`components/notes/search-view.tsx` (`"use client"`).

`SearchView` owns query/filter state, mirrors it into the URL via `router.replace` (so
refresh/back-button preserve a search — same reasoning as the `duplicated` query-param
pattern from `add-note-actions`), debounces input 300ms (same `setTimeout` + `useRef`
pattern already used for autosave in `note-editor.tsx`), and on each debounced change fires
`fetch("/api/search?...")` with an `AbortController`, aborting the previous in-flight
request so slow-then-fast keystrokes can't resolve out of order.

Results render via the existing `NoteList`/`NoteCard` — no new card design needed.

### 5. Sidebar nav entry + icon

Add `{ id: "search", label: "Search", href: "/search", icon: "search" }` to
`primaryNavItems` (`lib/nav-items.ts`), and a hand-drawn `IconSearch` in
`components/icons.tsx` mapped into `navIconMap` — following this project's established
workaround for the vendored design system's `<i data-lucide>` icons not rendering (no
`lucide` script is loaded; every prior phase hand-rolled the icons it needed instead). The
vendored `SearchField` component has the same gap in its own leading/clear icons (it always
renders `<i data-lucide="search">`), so the search input on `/search` uses the vendored
`Input` component instead — same tokens, but with `leadingIcon={<IconSearch />}` passed in
as a real React node rather than baked-in markup — to avoid a
broken icon in the one place users look at it most.

## Risks / Trade-offs

- [Risk] Hand-written migration SQL isn't regenerated by `prisma migrate dev` on future
  schema changes to `Note` → Mitigation: the column is `GENERATED ALWAYS AS (...)`, derived
  purely from `title`/`content`; it only needs to change if those columns are dropped or
  renamed, which would already require a manual migration review.
- [Risk] `websearch_to_tsquery` returns nothing for pure-stopword or empty-after-parsing
  input (e.g. searching just "the") → Mitigation: acceptable Postgres default behavior; UI
  shows the existing empty state, not an error.
- [Risk] Debounce + abort logic duplicates a small amount of the autosave timer pattern →
  Mitigation: it's ~10 lines and the two call sites (save vs. search) have different enough
  semantics (fire-and-forget POST vs. cancelable GET) that a shared hook isn't worth the
  abstraction yet.

## Migration Plan

1. `prisma migrate dev --create-only --name add_search_vector`, hand-edit the generated
   empty SQL file to the `ALTER TABLE` + `CREATE INDEX` above, then `prisma migrate dev` to
   apply.
2. No data backfill needed — `GENERATED ALWAYS ... STORED` computes the column for existing
   rows as part of the `ALTER TABLE`.
3. Rollback: drop the index and column (`DROP INDEX`, `ALTER TABLE ... DROP COLUMN`) — safe,
   nothing else depends on `searchVector`.

## Open Questions

- None blocking. Pagination and searching trash are explicitly deferred (see Non-Goals);
  revisit if product asks before `quality-hardening`.
