# Current state

Agent-maintained snapshot of the last session. Read at session start; update at session end.

## Last updated

2026-07-04T22:55:00Z

## Last session summary

Ran the full propose → review → implement → verify → sync → archive cycle for phase 8,
`add-quality-hardening` — the last capability in `docs/openspec-capabilities.md`'s
sequence. This was a measure-and-fix pass, not a feature change. Baselined the app first:
this Next.js version emits `.next/diagnostics/route-bundle-stats.json` with per-route
first-load JS; `/notes/[id]` was the heaviest route (630.3K) because `marked` + `dompurify`
(used only for the Markdown preview) loaded unconditionally. Ran real Lighthouse
(production build, via `npx lighthouse`, with a session cookie obtained through an actual
login for protected routes) rather than trusting assumptions: `/login` and `/notes/[id]`
already scored Performance 97/99 and Accessibility 98/96 *before* any fixes — but the
Accessibility runs surfaced two genuine, previously-unnoticed WCAG failures: opacity-dimmed
tag chips (`TagPicker`'s unassigned chips, `SearchView`'s unselected filter chips) dropping
contrast to 2.79:1, and `app/(auth)/layout.tsx` having no `<main>` landmark at all. Both got
folded into the change's scope and fixed, alongside the originally-planned work: lazy-load
the Markdown preview via dynamic `import()` gated on Preview mode (dropped `/notes/[id]`'s
first-load JS to 565.4K, ~65K saved, matching the isolated 28K preview chunk); fixed real
keyboard-inaccessibility in the vendored `Tag` component (bare `<span onClick>`, no
keyboard semantics — added `role="button"`/`tabIndex`/`onKeyDown`, recorded as a Local
adaptation in `DESIGN.md`); fixed `SidebarFolderRow`/`SidebarTagRow`'s rename/delete
actions being *absent from the DOM* unless mouse-hovered (`group-focus-within` now reveals
them for keyboard focus too); added a skip-to-content link (`tabIndex={-1}` on `<main>` so
focus actually moves there, not just scrolls); added `aria-pressed` to the editor's
Write/Preview toggle. Final re-measurement: `/login`, `/notes`, `/notes/[id]`, `/search` all
score Accessibility **100** with zero failing audits; Performance 97/99 on `/login`/
`/notes/[id]`. Verified with a real keyboard-only walkthrough (Playwright driving only
Tab/Enter) covering skip link → login → create/edit note → Preview toggle → tag-chip
assignment → sidebar rename → search tag filter, confirming no focus traps and everything
actually keyboard-reachable — not just Lighthouse-passing.

Lost real time to a self-inflicted measurement bug worth flagging for future sessions: a
stale `next start` process survived a `pkill -f "next start"` (its argv shows as
`next-server (v16.2.9)`, which doesn't match that pattern) and kept serving an old build's
HTML/chunk-hash mapping through several rebuilds, causing `ChunkLoadError`s that looked
like real regressions. Root-caused by checking `ps aux | grep next-server` directly and
confirming only one PID before trusting any Lighthouse/Playwright result. `tsc --noEmit`,
`npm run lint`, `npm run build` all clean at every step. Test users/notes created during
verification (including two "Keyboard test note" notes on the demo account) cleaned up
from the dev DB; production `next start` server stopped.

## Current focus

**All 9 phases (0–8) in `docs/openspec-capabilities.md` are now archived — the planned
implementation sequence is complete.** No active OpenSpec change. Next steps are
product-driven, not roadmap-driven: revisit the open items below (pagination, restore-from-
trash, nested folders, etc.) if/when product asks, or start a new capability outside the
original sequence if scope expands. If picking this back up, read this file plus
`docs/openspec-capabilities.md`'s "Requirement coverage checklist" (all FR/NFR/UI/SEC/DATA
IDs from `requirements.md` are covered) as the starting point.

## Completed recently

- Implemented and archived `add-quality-hardening` →
  `openspec/changes/archive/2026-07-04-add-quality-hardening/` (19/19 tasks, including 3
  tasks added mid-implementation from real Lighthouse findings); synced new
  `openspec/specs/quality-hardening/spec.md`
- Implemented and archived `add-search` → `openspec/changes/archive/2026-07-04-add-search/`
  (17/17 tasks); synced new `openspec/specs/search/spec.md`
- Checked off phases 0–8 (all of them) in `docs/openspec-capabilities.md`'s capability
  sequence checklist
- Noted: at some point this session, the entire `components/` directory was moved to
  `app/components/` (all imports updated to match) — already done and consistent
  repo-wide by the time this session picked it up; not something this session initiated,
  just verified clean (`tsc`/lint/build all passed against the new layout)

## Blockers / open questions

- Deployment target for the scheduled 30-day purge job is still undecided (Vercel Cron vs.
  external cron); `lib/notes/purge.ts` has the query ready but nothing invokes it on a
  schedule yet. Open since `data-model`, unrelated to any phase since.
- Local dev Postgres runs via `docker-compose.yml` (port 5453, `notely`/`notely`);
  `DATABASE_URL` lives in `.env` (gitignored) mirroring `.env.example`.
- `demo@notely.dev`'s `passwordHash` in the local dev DB had been a literal placeholder
  string (not a real bcrypt hash); repaired locally (this is the second session to touch
  this — repair should already be in place from the `add-search` session unless the DB was
  reset since).
- Pagination on `/notes` and `/search` remains unimplemented — flagged, not fixed, in both
  the `add-search` and `add-quality-hardening` sessions. Acceptable at current/seed data
  volume; revisit if note counts grow large enough to threaten NFR-001/003 for real.
- Cosmetic, still open: several vendored design-system components render icons via
  `<i data-lucide>` (not this project's problem to fully solve — `Tag.jsx`'s clickable-chip
  fix this session only touched the keyboard-semantics half, not its icon rendering, which
  wasn't in scope). Worth a real fix (install `lucide` and call `createIcons()` once,
  globally) if it keeps mattering.
- Restore-from-trash and permanent-delete remain out of scope (not in FR-024's wording).
- Sidebar has no per-folder/per-tag note counts by design decision.
- No nested/hierarchical folders (`data-model`'s `Folder` has no `parentId`) — flat by design.
- Bold, italic, links, images, tables, syntax highlighting, drag-drop image upload, and slash
  commands remain explicitly out of scope for the Markdown editor (confirmed with the user
  in the `markdown-editor` phase; re-confirmed indirectly this session — `**bold**` still
  gets sanitizer-stripped after the preview lazy-load refactor, exactly as before).
- No duplicate entry point from the notes list — editor-only, by design decision.
- Testing/ops gotchas for future sessions:
  - Playwright's default `text=` selector is case-insensitive substring match — assert
    exact text for anything that's a substring of another possible value.
  - Scope result-list assertions to `main` (e.g. `page.locator("main").getByText(...)`) —
    the sidebar shares text/link patterns with page content (e.g. "New note" links to
    `/notes/new` from the sidebar, separate from the page's own create-note button/form).
  - **Before trusting any Lighthouse/browser-automation result against a locally-run
    `next start`, run `ps aux | grep next-server` and confirm exactly one PID.**
    `pkill -f "next start"` does **not** match the actual process (`next-server
    (v16.2.9)`) — a stale server from an earlier build can silently keep serving through
    several rebuilds, producing `ChunkLoadError`s and stale accessibility/performance
    numbers that look like real regressions but aren't. Kill by PID, or fully verify the
    process list, not just the command you used to start it.

## Files touched

- `docs/openspec-capabilities.md` (checked off phases 0–8 — all complete)
- `openspec/specs/quality-hardening/spec.md` (new, synced from `add-quality-hardening`)
- `openspec/changes/archive/2026-07-04-add-quality-hardening/`
- `app/components/notes/note-editor.tsx` (lazy-loaded Markdown preview via dynamic
  `import()`; `aria-pressed` on Write/Preview toggle)
- `.agents/skills/notely-design/components/core/Tag.jsx` (keyboard semantics for clickable
  chips; recorded in `DESIGN.md`'s Local adaptations)
- `app/components/notes/tag-picker.tsx`, `app/components/notes/search-view.tsx` (replaced
  opacity-based dimming with non-opacity styling — real contrast fix)
- `app/components/layout/sidebar-folder-row.tsx`, `app/components/layout/sidebar-tag-row.tsx`
  (rename/delete actions now keyboard-reachable via `group-focus-within`)
- `app/components/layout/app-shell.tsx` (skip-to-content link; `<main>` gets
  `id="main-content"` + `tabIndex={-1}`)
- `app/(auth)/layout.tsx` (added `<main>` landmark)
- `DESIGN.md` (Local adaptations list entry for `Tag.jsx`)
