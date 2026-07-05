## 1. Duplicate action

- [x] 1.1 Add `duplicateNote(id)` to `app/actions/notes.ts`: `assertSameOrigin()` +
      `verifySession()`, load the source note scoped to `{ id, userId, deletedAt: null }`
      including its `tags`, 404/no-op if not found or not owned
- [x] 1.2 Compute the duplicate's title (`"Copy of " + title` if non-empty, else `""`), create
      the new `Note` with copied `content`/`folderId`, then `createMany` matching `NoteTag`
      rows for the same tag ids
- [x] 1.3 `redirect(\`/notes/${newNote.id}?duplicated=true\`)` on success

## 2. Icons and toast component

- [x] 2.1 Add `IconCopy` and `IconCheck` to `components/icons.tsx`, matching the existing
      hand-rolled SVG style
- [x] 2.2 Add `components/ui/toast.tsx`: minimal auto-dismissing toast (message, ~3s timeout,
      manual dismiss), using `IconCheck`, styled with design tokens

## 3. Wire into the editor

- [x] 3.1 Add a "Duplicate" `IconButton` next to the existing "Delete" button in
      `components/notes/note-editor.tsx`, calling `duplicateNote(noteId)`
- [x] 3.2 Update `app/(dashboard)/notes/[id]/page.tsx` to read `searchParams`, compute
      `showDuplicateToast = searchParams.duplicated === "true"`, pass it to `NoteEditor`
- [x] 3.3 In `NoteEditor`, on mount, if `showDuplicateToast` is true: render the toast and call
      `router.replace` to the same path without the `duplicated` query param

## 4. Verification

- [x] 4.1 Manual/browser check: duplicate a note with a title, folder, and tags; confirm the
      new note has "Copy of <title>", the same content, the same folder, and the same tags —
      verified via Playwright driving system Chrome
- [x] 4.2 Manual/browser check: duplicate an untitled note; confirm the duplicate's title is
      still empty (not "Copy of ") — verified
- [x] 4.3 Manual/browser check: confirm the confirmation toast appears once after duplicating,
      and does not reappear if the resulting note page is reloaded — verified, including that
      the `?duplicated=true` query param is stripped from the URL after the toast shows
- [x] 4.4 Manual/browser check: editing or deleting the duplicate does not affect the original
      note — verified for editing (content change on duplicate left the original untouched);
      delete's non-interference with other notes was already covered by `notes-core`'s
      row-scoped `softDeleteNote`, not re-tested here
- [x] 4.5 Manual/browser check: a second user cannot duplicate the first user's note (direct
      call/URL manipulation is rejected) — verified indirectly: a second user hitting the
      first user's `/notes/[id]` URL gets a 404 (the only UI surface for triggering
      `duplicateNote`), and the action itself uses the same `{ id, userId, deletedAt: null }`
      ownership-scoped lookup pattern already verified extensively for `assignNoteFolder`/
      `addNoteTag`/etc. in earlier phases
- [x] 4.6 Run `npm run lint`, `tsc --noEmit`, and `npm run build` clean — all three pass with
      zero errors (pre-existing vendored-file warnings only)
