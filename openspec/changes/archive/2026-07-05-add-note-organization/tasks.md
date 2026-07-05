## 1. Requirements traceability

- [x] 1.1 Add FR-025 (favorite), FR-026 (pin), FR-027 (archive) to `docs/requirements.md`'s
      Notes section, between FR-024 and the Search section

## 2. Data model

- [x] 2.1 Add `isArchived Boolean @default(false)` to the `Note` model in
      `prisma/schema.prisma`, plus `@@index([userId, isArchived])`
- [x] 2.2 Run `prisma migrate dev --name add_is_archived_to_note` and commit the generated
      migration

## 3. Server actions

- [x] 3.1 Add `toggleNoteFavorite(id)`, `toggleNotePinned(id)`, `toggleNoteArchived(id)` to
      `app/actions/notes.ts`, following the `assignNoteFolder` pattern (ownership-scoped
      lookup, flip the boolean, `revalidatePath`, return `NoteRelationResult`, no redirect)
- [x] 3.2 `toggleNoteFavorite`/`toggleNotePinned` revalidate `/notes` (layout) plus
      `/favorites`/`/pinned` respectively; `toggleNoteArchived` revalidates `/notes` (layout)
      plus `/archive`

## 4. Query layer

- [x] 4.1 Add `isArchived: false` to `listActiveNotes`, `listNotesByFolder`,
      `listNotesByTag` in `lib/notes/queries.ts`
- [x] 4.2 Add `listFavoriteNotes`, `listPinnedNotes`, `listArchivedNotes` to
      `lib/notes/queries.ts`, following the `listTrashedNotes` shape
- [x] 4.3 Add `"Note"."isArchived"` to `NOTE_COLUMNS` and `"Note"."isArchived" = false` to the
      base `conditions` array in `lib/search/queries.ts`'s `searchNotes`

## 5. Notes list + card toggles

- [x] 5.1 Wire `NoteList` (`app/components/notes/note-list.tsx`) to pass `favorite`, `pinned`,
      `onToggleFavorite={toggleNoteFavorite.bind(null, note.id)}`,
      `onTogglePin={toggleNotePinned.bind(null, note.id)}` to each `NoteCard`

## 6. Note editor toggles

- [x] 6.1 Add `initialFavorite`, `initialPinned`, `initialArchived` props to `NoteEditor`
      (`app/components/notes/note-editor.tsx`) and pass them from
      `app/(dashboard)/notes/[id]/page.tsx` (from the `getOwnedNote` row)
- [x] 6.2 Add favorite/pin/archive `IconButton`s (using `IconStar`/`IconPin`/`IconArchive`
      from `app/components/icons.tsx`, `active={...}` reflecting current state) to the
      editor's action toolbar, next to duplicate/delete, each backed by a `useTransition` +
      the corresponding toggle action, with local optimistic state so `active` updates
      immediately

## 7. Favorites / Pinned / Archive views

- [x] 7.1 Replace `app/(dashboard)/favorites/page.tsx` with a real page: fetch via
      `listFavoriteNotes(userId)`, render `<NoteList notes={notes} />` under a "Favorites"
      heading, mirroring `app/(dashboard)/trash/page.tsx`
- [x] 7.2 Replace `app/(dashboard)/pinned/page.tsx` the same way with `listPinnedNotes`
- [x] 7.3 Replace `app/(dashboard)/archive/page.tsx` the same way with `listArchivedNotes`
- [x] 7.4 Confirm `NoteList`'s empty state (currently generic "No notes yet" / create CTA)
      reads sensibly for these three views, or pass view-specific empty-state copy/icon if not

## 8. Verification

- [x] 8.1 `tsc --noEmit`, `npm run lint`, `npm run build` all clean
- [x] 8.2 Manual walkthrough: favorite/pin/archive a note from the list card and from the
      editor; confirm Favorites/Pinned/Archive views show the right notes; confirm an
      archived note disappears from All Notes, its folder, its tags, and search; confirm
      unarchiving restores it everywhere; confirm another user's notes can't be toggled
- [x] 8.3 Sync specs to `openspec/specs/note-actions/spec.md` and
      `openspec/specs/notes-core/spec.md`, then archive the change
- [x] 8.4 Update `docs/current-state.md`
