## Context

`data-model` shipped flat (non-hierarchical) `Folder` and `Tag` models plus the `NoteTag`
join table, with `Folder`'s relation to `Note` set `onDelete: SetNull` and `Tag`'s relation to
`NoteTag` set `onDelete: Cascade` (see `prisma/schema.prisma`). `app-foundation` shipped a
sidebar (`components/layout/sidebar.tsx`) with hardcoded placeholder rows from
`lib/nav-items.ts` (`placeholderFolders`, `placeholderTags`) rendered via
`SidebarPlaceholderRow` (a non-interactive, `aria-hidden` display row). `notes-core` shipped
the note list/editor pattern (Server Component fetches + scoped Server Actions) this change
reuses directly.

The Notely design system ships `FolderItem` and `Tag` components, but both render icons via
`<i data-lucide="...">`, which this project never wires up (confirmed non-functional in
`notes-core`'s implementation — see that change's discovered gap). Following the same
established pattern (`components/icons.tsx` hand-rolled SVGs, `NoteEmptyState` in
`components/notes/`), this change adds hand-rolled sidebar row components instead of the
vendored `FolderItem`, and uses the vendored `Tag` only in contexts where its icon dependency
is avoidable (removable/plain tag chips, which don't require the `data-lucide` icon path).

## Goals / Non-Goals

**Goals:**
- Folder CRUD (create, rename, delete) and tag CRUD (create, rename, delete), scoped to the
  authenticated user.
- Assign a note to at most one folder, and any number of tags, from the editor.
- Sidebar shows the user's real folders and tags (replacing placeholders), each linking to a
  notes list filtered to that folder or tag.
- Deleting a folder/tag never deletes notes — only the association is removed.

**Non-Goals:**
- Nested/hierarchical folders — `data-model`'s `Folder` has no `parentId`; this change doesn't
  add one. The PRD's early sketch of `Folder.parentId` was not carried into the `data-model`
  spec, so introducing it here would be scope creep outside any requirement ID.
- Full-text search or combined query+folder+tag+date filtering — that's `add-search` (phase 7).
  This phase only wires single-dimension filtering (by folder, or by tag).
- Sidebar note counts per folder/tag — not required by DATA-002/003 or FR-061/062; dropped to
  avoid an unrequired aggregate-count query path.
- Drag-and-drop note-to-folder assignment — the editor's dropdown picker satisfies FR-061's
  "filter notes by folder" prerequisite (a note must be assignable to see it filtered); a
  richer interaction isn't specified anywhere.

## Decisions

**1. Folder/tag data flows into the sidebar via the `(dashboard)` layout, not client fetching.**
`app/(dashboard)/layout.tsx` becomes an async Server Component that calls `verifySession()`
and `listFolders(userId)`/`listTags(userId)`, passing the results as props through `AppShell`
to both `Sidebar` instances (desktop + mobile drawer). This mirrors how `notes-core`'s list
pages fetch server-side rather than client-fetching, and avoids adding a new client-side data
layer just for sidebar content.
*Alternative considered:* fetch inside `Sidebar` itself via a client-side effect/SWR-style
hook. Rejected — no data-fetching library is in this project, and a naive `useEffect` fetch
would flash empty sidebar content on every navigation; Server Component props update for free
on `revalidatePath`.

**2. Every folder/tag mutation calls `revalidatePath("/notes", "layout")`.**
Since `(dashboard)/layout.tsx` is now where folder/tag data is fetched, and route groups don't
appear in the URL, the way to invalidate that layout's cached render is to revalidate a page
path that uses it with `type: "layout"`. `/notes` is chosen as the anchor path (it always
exists and is under the same layout as every other dashboard route).

**3. Sidebar rows are hand-rolled (`components/layout/sidebar-folder-row.tsx` /
`sidebar-tag-row.tsx`), not the vendored `FolderItem`.**
`FolderItem` renders `<i data-lucide={icon}>` whenever no `color` prop is passed, and `Folder`
has no `color` field in the schema (the PRD's placeholder mock had one; the real `data-model`
spec doesn't). Adding a `color` column purely to dodge a vendored-component icon limitation
would be schema scope creep. A small hand-rolled row (name + hover-reveal rename/delete
`IconButton`s using `components/icons.tsx`, matching the hover-reveal pattern `NoteCard`
already uses) sidesteps the issue entirely and keeps interaction (inline rename, delete
confirm) in code this project controls.

**4. Folder picker: native `Select` (already in the design system); Tag picker: custom chip
toggle, not a new dependency.**
`Select` is backed by a real `<option>` list, fully functional without lucide (only its
decorative chevron icon is affected, a `Select`-forwarded cosmetic style issue, non-blocking).
The design system's own "not built yet" list confirms there's no Autocomplete/multi-select
component, so a bespoke combobox isn't warranted for this scope — a list of toggleable `Tag`
chips (assigned tags shown removable, unassigned tags shown as plain click-to-add, an inline
input to create a brand-new tag) covers "Tag CRUD and assignment on notes" without new UI
primitives.

**5. Filtered list views reuse `NoteList` verbatim.**
`/folders/[id]` and `/tags/[id]` are Server Components that verify session, run a
folder-/tag-scoped variant of `listActiveNotes` (`listNotesByFolder`, `listNotesByTag`), and
render the exact same `components/notes/note-list.tsx` used by `/notes`. No new list-rendering
code — only new query functions.

**6. Assigning a folder/tag is immediate (no debounce), unlike title/content autosave.**
Folder reassignment (`Select onChange`) and tag toggle (`Tag onClick`) each fire their Server
Action directly on interaction — these are discrete, infrequent state changes (not continuous
typing), so there is no benefit to debouncing them the way FR-022 debounces text edits.

## Risks / Trade-offs

- **[Risk]** Deleting a folder or tag that's currently selected as an active filter
  (`/folders/[id]` or `/tags/[id]`) leaves the user on a 404/stale page. → **Mitigation**:
  deletion redirects to `/notes` when it succeeds, consistent with `notes-core`'s
  `softDeleteNote` → `/notes` redirect pattern.
- **[Risk]** Tag-picker chip list could grow unbounded for a user with many tags, with no
  search/filter in this phase. → **Mitigation**: accepted for this phase; flagged for revisit
  once real usage data exists — out of scope for FR-062's baseline requirement.
- **[Trade-off]** Flat folders (no nesting) mean a user cannot create sub-folders even though
  the PRD's narrative database sketch implied it. This is intentional — `data-model`'s actual
  spec never included `parentId`, so nesting was never in scope for any archived change; adding
  it now would require a fresh migration and design decision better handled as its own change
  if the product actually needs it.

## Migration Plan

No schema migration. Deploy is a normal code push: new Server Actions, new query functions,
new routes, sidebar/editor components swapped to real data. `lib/nav-items.ts`'s
`placeholderFolders`/`placeholderTags` exports are removed since nothing references them after
this change.

## Open Questions

- Should a note's folder/tag assignment live in the same editor route (`/notes/[id]`) or a
  separate "details" panel? **Decision for this change:** same route, in the editor's header
  area alongside the existing save-status/delete controls — no new route or panel needed, and
  it keeps the "one screen per note" model from `notes-core`.
