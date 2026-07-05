# Current state

Agent-maintained snapshot of the last session. Read at session start; update at session end.

## Last updated

2026-07-05T09:56:00Z

## Last session summary

Implemented note organization — favorite, pinned, and archived — as a new OpenSpec change,
`add-note-organization` (archived at
`openspec/changes/archive/2026-07-05-add-note-organization/`), the first piece of work since
all 9 original roadmap phases completed. This was mostly wiring up scaffolding that already
existed but was never connected: the Prisma `Note` model already had unused `isFavorite`/
`isPinned` columns, the sidebar already had Favorites/Pinned/Archive nav items and routes, and
those routes rendered a static `PlaceholderPage`. Added `isArchived` (new migration
`20260705094141_add_is_archived_to_note`, plus `@@index([userId, isArchived])`); three new
ownership-scoped server actions (`toggleNoteFavorite`/`toggleNotePinned`/`toggleNoteArchived`
in `app/actions/notes.ts`, following the existing `assignNoteFolder` pattern); new query
functions (`listFavoriteNotes`/`listPinnedNotes`/`listArchivedNotes` in
`lib/notes/queries.ts`); archived notes now excluded from `listActiveNotes`,
`listNotesByFolder`, `listNotesByTag`, and `searchNotes` (same base-condition treatment as
`deletedAt IS NULL`). Favorite/pin got a quick-toggle directly on the note card in
`NoteList` (the design-system `NoteCard` already had `favorite`/`pinned`/`onToggleFavorite`/
`onTogglePin` props sitting unused); archive is editor-only, consistent with the existing
precedent that delete/duplicate never appear on the card. All three also got toggle buttons
in the note editor's action toolbar using `IconButton`'s existing `active` prop. Replaced the
three placeholder pages with real server components reusing `NoteList` (added an optional
`emptyState` override prop rather than writing three near-duplicate list components) —
`app/components/layout/placeholder-page.tsx` was deleted as dead code once nothing referenced
it anymore. Added new FR-025/026/027 to `docs/requirements.md` (the PRD had anticipated this
feature — sidebar IA, DB fields — but requirements.md never assigned it requirement IDs until
now); extended `openspec/specs/note-actions/spec.md` and `openspec/specs/notes-core/spec.md`
accordingly.

Found and fixed a real bug via Playwright verification, not just typechecking: `NoteCard`'s
Favorite/Pin buttons called `e.stopPropagation()` but not `e.preventDefault()`. Harmless in
isolation, but `NoteList` wraps each card in a real `<Link href>` (kept intentionally, so
ctrl/cmd-click "open in new tab" still works) — clicking the star/pin correctly toggled the
flag but *also* navigated into the note editor, since `stopPropagation` only stops React's
synthetic bubbling, not the browser's native default action of following the enclosing
anchor. Fixed in the vendored design-system source
(`.agents/skills/notely-design/components/notes/NoteCard.jsx`) and recorded as Local
adaptation #6 in `DESIGN.md`. Verified end-to-end via a real login + Playwright script
(demo@notely.dev): favorite/pin/archive toggling from both the card and the editor, all three
new views showing the right notes, archived notes disappearing from All Notes/folder/tag/
search and reappearing on unarchive, rapid-triple-click toggle settling correctly, and
duplicating a favorited+pinned+archived note correctly starting the duplicate with fresh
(false) flags. Test notes cleaned up from the dev DB afterward; dev server stopped by PID.
`tsc --noEmit`, `npm run lint` (pre-existing unrelated warnings only), `npm run build` all
clean.

## Current focus

No active OpenSpec change. `add-note-organization` is the first post-roadmap capability;
further work is still product-driven — see open items below.

## Completed recently

- Implemented and archived `add-note-organization` →
  `openspec/changes/archive/2026-07-05-add-note-organization/`; extended
  `openspec/specs/note-actions/spec.md` (FR-025/026/027) and
  `openspec/specs/notes-core/spec.md` (Favorites/Pinned/Archive view requirements, and
  "Notes list view" now also excludes archived notes)
- Fixed a real `NoteCard` bug (missing `preventDefault` on Favorite/Pin buttons causing
  unwanted navigation when the card is wrapped in a `Link`) — Local adaptation #6 in
  `DESIGN.md`
- Deleted `app/components/layout/placeholder-page.tsx` (dead code once Favorites/Pinned/
  Archive became real views)
- Implemented and archived `add-quality-hardening` →
  `openspec/changes/archive/2026-07-04-add-quality-hardening/` (19/19 tasks); synced
  `openspec/specs/quality-hardening/spec.md`
- Implemented and archived `add-search` → `openspec/changes/archive/2026-07-04-add-search/`
  (17/17 tasks); synced `openspec/specs/search/spec.md`

## Blockers / open questions

- Deployment target for the scheduled 30-day purge job is still undecided (Vercel Cron vs.
  external cron); `lib/notes/purge.ts` has the query ready but nothing invokes it on a
  schedule yet. Open since `data-model`, unrelated to any phase since.
- Local dev Postgres runs via `docker-compose.yml` (port 5453, `notely`/`notely`);
  `DATABASE_URL` lives in `.env` (gitignored) mirroring `.env.example`.
- Pagination on `/notes` and `/search` remains unimplemented — flagged, not fixed, across
  multiple sessions now. Acceptable at current/seed data volume; revisit if note counts grow
  large enough to threaten NFR-001/003 for real.
- Search deliberately excludes archived notes (same base condition as `deletedAt IS NULL`),
  by design decision this session — a user who forgets they archived something and searches
  for it won't find it. No filter UI to include archived notes in search; out of scope unless
  product asks. Same applies to `isFavorite`/`isPinned` — selected in `NOTE_COLUMNS` for years
  now but still no filter UI/params in `SearchFilters` for either.
- Cosmetic, still open (unrelated to this session, but now affects more surface area):
  several vendored design-system components render icons via `<i data-lucide>`, which never
  render as actual glyphs without `lucide`'s `createIcons()` being called — this includes the
  new Favorite/Pin star/pin icons on `NoteCard` (functionally works — toggling, `aria-label`,
  and persisted state all verified via Playwright — but the icon glyph itself won't be
  visible in the browser). Worth a real fix (install `lucide`, call `createIcons()` once,
  globally) if it keeps mattering; the custom SVG icons in `app/components/icons.tsx` (used
  by the editor toolbar and sidebar) are unaffected since they don't rely on `data-lucide`.
- Restore-from-trash and permanent-delete remain out of scope (not in FR-024's wording).
- Sidebar has no per-folder/per-tag note counts by design decision.
- No nested/hierarchical folders (`data-model`'s `Folder` has no `parentId`) — flat by design.
- No manual reordering among pinned notes — pinned notes sort by `updatedAt` like everything
  else, by design decision this session.
- Bold, italic, links, images, tables, syntax highlighting, drag-drop image upload, and slash
  commands remain explicitly out of scope for the Markdown editor.
- No duplicate entry point from the notes list — editor-only, by design decision.
- Testing/ops gotchas for future sessions:
  - Playwright's default `text=` selector is case-insensitive substring match — assert
    exact text for anything that's a substring of another possible value.
  - Scope result-list assertions to `main` (e.g. `page.locator("main").getByText(...)`) —
    the sidebar shares text/link patterns with page content.
  - Playwright isn't in `package.json` — it's cached under
    `~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright` from an earlier `npx playwright`
    invocation. Running an ad hoc verification script needs to live in (or resolve modules
    from) that directory, since plain `node script.mjs` elsewhere fails with
    `ERR_MODULE_NOT_FOUND`.
  - Before trusting any Lighthouse/browser-automation result against a locally-run
    `next start`, run `ps aux | grep next-server` and confirm exactly one PID.
    `pkill -f "next start"` does **not** match the actual process (`next-server
    (v16.2.9)`) — a stale server from an earlier build can silently keep serving through
    several rebuilds, producing stale/misleading results. Kill by PID.

## Files touched

- `prisma/schema.prisma`, `prisma/migrations/20260705094141_add_is_archived_to_note/`
- `docs/requirements.md` (FR-025/026/027)
- `app/actions/notes.ts` (`toggleNoteFavorite`/`toggleNotePinned`/`toggleNoteArchived`)
- `lib/notes/queries.ts` (`listFavoriteNotes`/`listPinnedNotes`/`listArchivedNotes`; archived
  exclusion added to `listActiveNotes`/`listNotesByFolder`/`listNotesByTag`)
- `lib/search/queries.ts` (`isArchived` column + base-condition exclusion)
- `app/components/notes/note-list.tsx` (favorite/pin card wiring; optional `emptyState` prop)
- `app/components/notes/note-editor.tsx` (favorite/pin/archive toolbar buttons + state)
- `app/components/notes/note-empty-state.tsx` (star/pin/archive icon support)
- `app/(dashboard)/notes/[id]/page.tsx` (passes `initialFavorite`/`initialPinned`/
  `initialArchived` to the editor)
- `app/(dashboard)/favorites/page.tsx`, `pinned/page.tsx`, `archive/page.tsx` (real views,
  replacing `PlaceholderPage`)
- `app/components/layout/placeholder-page.tsx` (deleted — dead code)
- `.agents/skills/notely-design/components/notes/NoteCard.jsx` (`preventDefault` fix),
  `DESIGN.md` (Local adaptation #6)
- `openspec/specs/note-actions/spec.md`, `openspec/specs/notes-core/spec.md` (synced)
- `openspec/changes/archive/2026-07-05-add-note-organization/`
