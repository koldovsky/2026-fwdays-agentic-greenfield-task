## Why

Notely can create, edit, organize, and delete notes, but there's no quick way to start a new
note from an existing one — a common workflow (templating a recurring note format, branching
an idea) currently requires manually re-typing content. FR-023 closes this with a duplicate
action.

## What Changes

- Add a `duplicateNote(id)` Server Action that copies a note's title, content, folder
  assignment, and tag assignments into a brand-new note owned by the same user, then navigates
  to the new note's editor.
- Duplicated titles get a `"Copy of "` prefix (empty titles stay empty — there's nothing to
  prefix).
- Add a "Duplicate" icon button in the note editor's header, next to the existing "Delete"
  button.
- Show a brief confirmation toast ("Note duplicated") on the new note's page after navigating,
  via a `duplicated=true` query param the editor reads once on mount and then strips from the
  URL.

**Non-goals:** a duplicate action reachable directly from the notes list (without opening the
note first) — the editor is the single surface for note-level actions in this app so far
(delete lives there too), and adding a second entry point isn't required by FR-023. Duplicating
a trashed note — trashed notes aren't editable/reachable via the editor in this app, so this
isn't a reachable scenario.

## Capabilities

### New Capabilities
- `note-actions`: duplicate a note, copying its folder and tags, with a confirmation toast
  (FR-023).

### Modified Capabilities
- (none — `notes-core`'s editor is extended, not changed at the requirement level;
  `folders-tags`' `Folder`/`Tag`/`NoteTag` models are read from, not modified)

## Impact

- **New code:** `components/ui/toast.tsx` (small hand-rolled auto-dismissing toast — the
  vendored `Toast` renders its status icon via `<i data-lucide>`, the same non-functional-icon
  gap worked around elsewhere in this project), `components/icons.tsx` additions
  (`IconCopy`, `IconCheck`).
- **Existing code touched:** `app/actions/notes.ts` (new `duplicateNote`),
  `components/notes/note-editor.tsx` (Duplicate button, toast-on-mount handling),
  `app/(dashboard)/notes/[id]/page.tsx` (reads `searchParams` for the `duplicated` flag).
- **Data:** no schema changes — reuses `Note`, `Folder`, `Tag`, `NoteTag` as-is.
