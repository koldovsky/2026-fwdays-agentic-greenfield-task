# Current state

Agent-maintained snapshot of the last session. Read at session start; update at session end.

## Last updated

2026-07-04T21:15:00Z

## Last session summary

Ran the full propose → review → implement → verify → sync → archive cycle for phase 7,
`add-search`. Added a generated, GIN-indexed `tsvector` column on `Note` (title weighted
above content) via a hand-written migration
(`prisma/migrations/20260704173453_add_search_vector`); `lib/search/queries.ts` runs one
`prisma.$queryRaw` combining `websearch_to_tsquery` full-text rank with folder, tag (OR
across selected tags), and `updatedAt` date-range filters, always scoped to `userId` and
`deletedAt IS NULL`. `GET /api/search` (route handler, not a server action — it's a
cancelable read, not a mutation) exposes it. `/search` (new sidebar nav entry) is a Server
Component that renders the first result set from the URL's query params, then hands off to
`components/notes/search-view.tsx` (client): 300ms-debounced input, `router.replace` keeps
the URL in sync with query/folder/tags/date-range state, and each debounced change
`fetch`es `/api/search` with an `AbortController` so a fast keystroke can't be overwritten
by a slower, earlier request's response. Results reuse the existing `NoteList`/`NoteCard`;
a no-results state reuses `NoteEmptyState` (added a `search` icon variant to it). Added
`IconSearch` to `components/icons.tsx` for both the nav entry and the search field's
leading icon (used the vendored `Input` component with a custom `leadingIcon` rather than
the vendored `SearchField`, which bakes in a non-rendering `<i data-lucide>` icon — same
recurring gap as every prior phase).

Two real problems surfaced and were fixed during implementation (not just planned around):
(1) leaving the generated `searchVector` column undeclared in `schema.prisma` broke every
subsequent non-interactive `prisma migrate dev` call (it kept proposing `DROP COLUMN`); fixed
by declaring it as `Unsupported("tsvector")` with a byte-for-byte-matching
`@default(dbgenerated("..."))` (matched via a throwaway `prisma db pull`) plus
`@@index([searchVector], type: Gin)`, verified via `prisma migrate diff` returning an empty
script and a clean "Already in sync" `migrate dev` run. (2) The vendored `Select`
component always injects its own hidden `<option value="">{placeholder}</option>`; my "All
folders" option also used `value=""`, so the two collided and the UI showed "Select…"
instead of "All folders" — fixed with `placeholder=""` on that `Select` usage.

Verified end-to-end in a real browser (Playwright + system Chrome, driving the existing
demo account after discovering and locally repairing a pre-existing, unrelated data issue —
`demo@notely.dev`'s `passwordHash` in the dev DB was a literal placeholder string, not a
real bcrypt hash): title-only and content-only query matches on the right note only,
trashed notes never appear, folder/tag/date-range filters each narrow correctly and combine
with an active query, the date-range filter correctly empties results and shows the
search-specific empty state, typing updates results live without a submit, and a page
reload preserves both the query and the filtered results via the synced URL. Registered a
throwaway second user with a sentinel-term note to confirm cross-user isolation in both
directions (each user's search only ever sees their own notes). Throwaway user and its
note/tag data were cleaned up from the dev DB afterward; dev server stopped. `tsc --noEmit`,
`npm run lint`, `npm run build` all clean; `/search` and `/api/search` both show up as
registered routes in the build output.

## Current focus

Start `add-quality-hardening` (phase 8) — the last capability, and the formal acceptance
gate for NFR-001 (page load < 2s), NFR-003 (Lighthouse ≥ 95), and NFR-004 (WCAG 2.2 AA).
Depends on all feature changes above, which are now all archived. Expect this phase to
involve bundle analysis, lazy-loading the markdown editor chunk, a Lighthouse CI run, and
an accessibility audit (focus, labels, contrast, keyboard nav) rather than new features.

## Completed recently

- Implemented and archived `add-search` → `openspec/changes/archive/2026-07-04-add-search/`
  (17/17 tasks); synced new `openspec/specs/search/spec.md`
- Implemented and archived `add-note-actions` → `openspec/changes/archive/2026-07-04-add-note-actions/`
  (all tasks complete); synced `openspec/specs/note-actions/spec.md`
- Implemented and archived `add-markdown-editor` → `openspec/changes/archive/2026-07-04-add-markdown-editor/`
  (all tasks complete); synced `openspec/specs/markdown-editor/spec.md`
- Implemented and archived `add-folders-tags` → `openspec/changes/archive/2026-07-04-add-folders-tags/`
  (all tasks complete); synced `openspec/specs/folders-tags/spec.md`
- Checked off phases 0–7 in `docs/openspec-capabilities.md`'s capability sequence checklist

## Blockers / open questions

- Deployment target for the scheduled 30-day purge job is still undecided (Vercel Cron vs.
  external cron); `lib/notes/purge.ts` has the query ready but nothing invokes it on a
  schedule yet. Open since `data-model`, unrelated to any phase since.
- Local dev Postgres runs via `docker-compose.yml` (port 5453, `notely`/`notely`);
  `DATABASE_URL` lives in `.env` (gitignored) mirroring `.env.example`.
- `demo@notely.dev`'s `passwordHash` in the local dev DB had been a literal placeholder
  string (not a real bcrypt hash) before this session — repaired locally to a real hash of
  `notely-demo-1` (matching `prisma/seed.ts`'s `DEMO_PASSWORD`) so the account is usable for
  manual verification again. If a future fresh `docker compose up` + reseed resets this,
  that's expected — the seed script itself was always correct.
- Cosmetic, still open: several vendored design-system components render icons via
  `<i data-lucide>`, needing a script this project never loads. Worked around case-by-case
  with hand-rolled `components/icons.tsx` SVGs each phase (now includes `IconSearch`).
  Worth a real fix (install `lucide` and call `createIcons()` once, globally) if this keeps
  recurring — it has, every phase so far.
- Search has no pagination (`LIMIT 50`, no "load more") and doesn't search trashed notes —
  neither is in FR-060..064; revisit if product wants either before `quality-hardening`.
- Restore-from-trash and permanent-delete remain out of scope (not in FR-024's wording) —
  flag if product wants them before `quality-hardening`.
- Sidebar has no per-folder/per-tag note counts by design decision — revisit if product wants
  them.
- No nested/hierarchical folders (`data-model`'s `Folder` has no `parentId`) — flat by design.
- Bold, italic, links, images, tables, syntax highlighting, drag-drop image upload, and slash
  commands remain explicitly out of scope for the Markdown editor (confirmed with the user);
  the sanitizer allowlist actively strips them even if hand-typed.
- No duplicate entry point from the notes list — editor-only, by design decision this session
  (matches where Delete already lives). Revisit if users want a faster list-level duplicate.
- Testing gotcha for future sessions: Playwright's default `text=` selector is a
  case-insensitive substring match — don't use it for status text that's a substring of
  another possible status (e.g. `"Saved"` vs `"Unsaved changes"`); assert exact text instead.
  Also scope result-list assertions to `main` (e.g. `page.locator("main").getByText(...)`) —
  the sidebar's "New note" link (`/notes/new`) matches any bare `a[href^="/notes/"]`
  selector, and sidebar folder/tag rows share text with in-page folder/tag filter controls.

## Files touched

- `docs/openspec-capabilities.md` (checked off phases 0–7)
- `openspec/specs/search/spec.md` (new, synced from `add-search`)
- `openspec/changes/archive/2026-07-04-add-search/`
- `prisma/schema.prisma` (added `Note.searchVector`), `prisma/migrations/20260704173453_add_search_vector/`,
  `prisma/migrations/20260704173933_sync_search_vector_unsupported_field/`
- `lib/search/queries.ts` (new)
- `app/api/search/route.ts` (new)
- `app/(dashboard)/search/page.tsx` (new)
- `components/notes/search-view.tsx` (new)
- `components/notes/note-empty-state.tsx` (added `search` icon variant)
- `components/icons.tsx` (added `IconSearch`, mapped in `navIconMap`)
- `lib/nav-items.ts` (added "Search" nav entry)
