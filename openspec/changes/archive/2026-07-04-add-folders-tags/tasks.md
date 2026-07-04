## 1. Folder mutations and queries

- [x] 1.1 Add `lib/folders/definitions.ts`: `FolderInputSchema` (Zod, name required,
      reasonable max length)
- [x] 1.2 Add `lib/folders/queries.ts`: `listFolders(userId)`, `getOwnedFolder(userId, id)`
- [x] 1.3 Add `app/actions/folders.ts`: `createFolder(name)`, `renameFolder(id, name)`,
      `deleteFolder(id)` — each calls `assertSameOrigin()` + `verifySession()`, scopes every
      write by `userId` (`updateMany`/`deleteMany` with `userId` in `where`), and calls
      `revalidatePath("/notes", "layout")` on success

## 2. Tag mutations and queries

- [x] 2.1 Add `lib/tags/definitions.ts`: `TagInputSchema` (Zod, name required, reasonable max
      length)
- [x] 2.2 Add `lib/tags/queries.ts`: `listTags(userId)`, `getOwnedTag(userId, id)`
- [x] 2.3 Add `app/actions/tags.ts`: `createTag(name)`, `renameTag(id, name)`,
      `deleteTag(id)` — same session/origin/ownership-scoping and revalidation pattern as
      folders

## 3. Note-folder and note-tag assignment

- [x] 3.1 Add `assignNoteFolder(noteId, folderId | null)` to `app/actions/notes.ts`: verifies
      session, confirms `folderId` (if not null) belongs to the current user, updates the note
      via `updateMany({ where: { id, userId, deletedAt: null } })`
- [x] 3.2 Add `addNoteTag(noteId, tagId)` / `removeNoteTag(noteId, tagId)` to
      `app/actions/notes.ts`: verify session, confirm the note and tag both belong to the
      current user before creating/deleting the `NoteTag` row
- [x] 3.3 Add `lib/notes/queries.ts` helper(s) needed to load a note's current folder and tag
      ids for the editor (extend `getOwnedNote` to include `tags`/`folder` relations, or add a
      dedicated query)

## 4. Sidebar: real folders and tags

- [x] 4.1 Convert `app/(dashboard)/layout.tsx` to an async Server Component: call
      `verifySession()`, `listFolders(userId)`, `listTags(userId)`, pass results as props
      through `AppShell` to `Sidebar`
- [x] 4.2 Update `AppShellProps`/`SidebarProps` to accept `folders`/`tags` arrays instead of
      importing `placeholderFolders`/`placeholderTags` from `lib/nav-items.ts`
- [x] 4.3 Build `components/layout/sidebar-folder-row.tsx` and `sidebar-tag-row.tsx`: name +
      link to `/folders/[id]` or `/tags/[id]`, hover-reveal rename/delete `IconButton`s (reuse
      `components/icons.tsx`, added `IconPencil` for rename), active-state styling matching
      `SidebarNavLink`
- [x] 4.4 Wire "New folder" / "New tag" rows to an inline create form (expand to an `Input` +
      submit on Enter/blur, calling `createFolder`/`createTag`) via new
      `components/layout/sidebar-create-row.tsx`
- [x] 4.5 Remove `placeholderFolders`/`placeholderTags` from `lib/nav-items.ts` once nothing
      references them (also removed the now-dead `SidebarPlaceholderRow`)

## 5. Filtered list views

- [x] 5.1 Add `listNotesByFolder(userId, folderId)` and `listNotesByTag(userId, tagId)` to
      `lib/notes/queries.ts`
- [x] 5.2 Add `app/(dashboard)/folders/[id]/page.tsx`: verifies session, confirms the folder
      belongs to the user (404 otherwise), renders folder name as header + `NoteList`
- [x] 5.3 Add `app/(dashboard)/tags/[id]/page.tsx`: same pattern for tags

## 6. Editor pickers

- [x] 6.1 Build `components/notes/folder-picker.tsx`: `Select` listing the user's folders plus
      a "No folder" option, calling `assignNoteFolder` on change
- [x] 6.2 Build `components/notes/tag-picker.tsx`: assigned tags as removable `Tag` chips,
      unassigned tags as click-to-add chips, small inline input to create+assign a brand-new
      tag in one step (via new `createAndAssignTag` action in `app/actions/notes.ts`, since
      `createTag` alone doesn't return an id to chain an immediate assignment)
- [x] 6.3 Mount both pickers in `components/notes/note-editor.tsx`'s header area, passing the
      note's current folder/tag state and the user's full folder/tag lists as props from
      `app/(dashboard)/notes/[id]/page.tsx`

## 7. Verification

- [x] 7.1 Manual/browser check: create a folder and a tag, confirm both appear in the sidebar
      — verified via Playwright driving system Chrome
- [x] 7.2 Manual/browser check: assign a note to a folder and a tag from the editor, confirm
      it appears in `/folders/[id]` and `/tags/[id]` — verified
- [x] 7.3 Manual/browser check: delete a folder that has a note in it, confirm the note
      remains in `/notes` with no folder, and the folder disappears from the sidebar —
      verified
- [x] 7.4 Manual/browser check: delete a tag that's assigned to a note, confirm the note
      remains and the tag no longer appears on it — verified
- [x] 7.5 Manual/browser check: a second user cannot see or assign the first user's folders
      or tags (direct URL to `/folders/[id]`/`/tags/[id]` with another user's id is rejected)
      — verified: second user hitting the first user's `/folders/[id]` URL got a 404
- [x] 7.6 Run `npm run lint`, `tsc --noEmit`, and `npm run build` clean — all three pass with
      zero errors (pre-existing vendored-file warnings only). Also spot-checked rename for
      both folders and tags (not explicitly listed above but covered by the delta spec's
      "Renaming a folder"/"Renaming a tag" scenarios) — both verified working
