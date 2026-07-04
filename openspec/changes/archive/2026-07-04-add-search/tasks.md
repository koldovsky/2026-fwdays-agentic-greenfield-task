## 1. Database: search index

- [x] 1.1 Run `prisma migrate dev --create-only --name add_search_vector` and hand-edit the
      generated SQL to add the generated `searchVector` `tsvector` column (weighted `title`
      `A` / `content` `B`) and a GIN index on it, per design.md decision 1
- [x] 1.2 Apply the migration (`prisma migrate dev`) against local Postgres and confirm the
      column/index exist (`\d "Note"` in psql) — also declared the field in `schema.prisma`
      (`Unsupported("tsvector")` + matching `@default(dbgenerated(...))` + `@@index(type:
      Gin)`) since leaving it undeclared broke every subsequent `prisma migrate dev` call;
      verified `prisma migrate diff` against the live DB now returns an empty script

## 2. Search query

- [x] 2.1 Add `lib/search/queries.ts` with `searchNotes(userId, filters)` — raw SQL query
      combining `websearch_to_tsquery` rank, folder, tag (OR across `tagIds`), and
      `updatedAt` date-range filters, always scoped to `userId` and `deletedAt IS NULL`,
      `LIMIT 50`, per design.md decision 3
- [x] 2.2 Handle the no-query case (only filters, or no filters at all) by skipping the text
      predicate and ordering by `updatedAt desc`

## 3. API route

- [x] 3.1 Add `app/api/search/route.ts` — `GET` handler: `verifySession()`, parse
      `q`/`folderId`/`tagIds`/`from`/`to` from the URL, call `searchNotes`, return
      `NextResponse.json({ notes })`

## 4. Search page and live UI

- [x] 4.1 Add `app/(dashboard)/search/page.tsx` (Server Component): read `searchParams`,
      run the initial `searchNotes` call server-side, fetch `listFolders`/`listTags` for
      filter pickers, render `SearchView`
- [x] 4.2 Add `components/notes/search-view.tsx` (`"use client"`): text field using the
      vendored `Input` with `leadingIcon={<IconSearch />}` (not the vendored `SearchField`,
      which bakes in a non-rendering `<i data-lucide>` icon — see design.md decision 5),
      folder select, toggleable tag-chip filter, from/to date inputs
- [x] 4.3 Debounce input 300ms and sync query/filters into the URL via `router.replace`
      (mirrors the `duplicated`-flag query-param pattern from `add-note-actions`)
- [x] 4.4 Fetch `/api/search` on each debounced change with `AbortController`, aborting the
      previous in-flight request; render results with the existing `NoteList`
- [x] 4.5 Render `NoteEmptyState` when a query/filter combination returns no results (added
      a `search` icon variant to `NoteEmptyState`'s icon map)

## 5. Navigation

- [x] 5.1 Add `IconSearch` to `components/icons.tsx` and map it in `navIconMap`
- [x] 5.2 Add a `{ id: "search", label: "Search", href: "/search", icon: "search" }` entry
      to `primaryNavItems` in `lib/nav-items.ts`

## 6. Verification

- [x] 6.1 Manual (Playwright + system Chrome): search matches title-only ("welcome") and
      content-only ("first", "expand") terms on the right note only; trashed "Old draft"
      never appears; a second, freshly registered user's sentinel-term note never appears
      in the first user's results and vice versa
- [x] 6.2 Manual: folder filter ("Personal") narrows to 1/2 notes correctly; tag filter
      ("idea") narrows to 1/2 notes correctly; date-range filter (from far-future date)
      narrows to zero and shows the empty state — found and fixed a real bug along the way
      (see note below)
- [x] 6.3 Manual: typing updates results without a submit; URL stays in sync with the
      debounced query/filters and a reload preserves both the input value and the result
      set (confirms no stale/out-of-order state after settling)
- [x] 6.4 Spot-check NFR-002: with the small seeded dataset, `/api/search` responses were
      visually instantaneous (well under 300ms); no dedicated load-test added, matching
      this project's existing "spot-check" bar for NFR-002-style checks in prior phases
- [x] 6.5 `tsc --noEmit`, `npm run lint`, `npm run build` all pass — build output confirms
      `/search` (page) and `/api/search` (route) are both registered

**Bug found and fixed during 6.2**: the vendored `Select` always injects its own hidden
`<option value="">{placeholder}</option>` (default placeholder text "Select…"). My "All
folders" option also used `value=""`, so the two same-valued options collided and the
select displayed "Select…" instead of "All folders" whenever the folder filter was cleared.
Fixed by passing `placeholder=""` to suppress the vendored component's own placeholder
option in `components/notes/search-view.tsx`, since the "All folders" option already serves
that role.
