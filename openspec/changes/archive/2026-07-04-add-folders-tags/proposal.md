## Why

Notely's data model already supports organizing notes into a folder and tagging them
(`DATA-002`, `DATA-003`), and the sidebar has static placeholder folder/tag rows from
`app-foundation`. There is no way yet for a user to actually create a folder or tag, assign
one to a note, or see notes filtered down to a single folder or tag. This change makes that
real, closing FR-061 and FR-062's UI-wiring scope ahead of full combined search in `add-search`
(phase 7).

## What Changes

- Add folder CRUD (create, rename, delete) and tag CRUD (create, rename, delete), scoped to
  the authenticated user.
- Replace the sidebar's static placeholder folder/tag rows with the user's real folders and
  tags, each linking to a filtered notes view.
- Add `/folders/[id]` and `/tags/[id]` routes: the same notes-list UI from `notes-core`,
  filtered to that folder or tag.
- Add a folder picker (dropdown) and a tag picker (chip toggle + inline create) to the note
  editor, so a note's `folderId` and tag assignments can be changed from the editor.
- Deleting a folder does not delete its notes (`folderId` reverts to null, per the existing
  `onDelete: SetNull` relation from `data-model`). Deleting a tag removes its assignments but
  not the notes (existing `onDelete: Cascade` on `NoteTag`).

**Non-goals (later phases or explicitly out of scope):** nested/hierarchical folders (the
`data-model` spec defines a flat `Folder` with no `parentId` — this change keeps that flat
shape, not the `parentId` sketched in the PRD's early data model), full-text search, combined
multi-filter search (query + folder + tag + date), and per-folder/per-tag note counts in the
sidebar (not required by any requirement ID in this phase, dropped to keep scope tight).

## Capabilities

### New Capabilities
- `folders-tags`: folder CRUD, tag CRUD, note-folder/note-tag assignment, and folder/tag
  filtered note list views (DATA-002, DATA-003, FR-061, FR-062).

### Modified Capabilities
- (none — `notes-core`'s note list/editor components are reused, not changed at the
  requirement level; `data-model`'s schema and relations are used as-is)

## Impact

- **New code:** `app/actions/folders.ts`, `app/actions/tags.ts`, `lib/folders/queries.ts`,
  `lib/tags/queries.ts`, `app/(dashboard)/folders/[id]/page.tsx`,
  `app/(dashboard)/tags/[id]/page.tsx`, `components/notes/folder-picker.tsx`,
  `components/notes/tag-picker.tsx`, sidebar folder/tag row components.
- **Existing code touched:** `app/(dashboard)/layout.tsx` (fetch folders/tags server-side and
  pass to `AppShell`), `components/layout/app-shell.tsx` and `components/layout/sidebar.tsx`
  (accept and render real folders/tags instead of `lib/nav-items.ts` placeholders),
  `components/notes/note-editor.tsx` (mount folder/tag pickers), `lib/notes/queries.ts` (add
  folder-/tag-filtered list queries), `lib/nav-items.ts` (drop now-unused
  `placeholderFolders`/`placeholderTags`).
- **Data:** no schema changes — `Folder`, `Tag`, `NoteTag` models and their cascade behavior
  already exist from `data-model`.
