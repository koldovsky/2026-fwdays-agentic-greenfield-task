## Why

Notely's information architecture already advertises "Favorites", "Pinned", and "Archive"
sidebar sections (see `docs/PRD.md`'s Information Architecture diagram), and the `Note` model
already carries `isFavorite`/`isPinned` columns, but none of it is wired up: the three
corresponding routes render static placeholder pages, there is no way for a user to actually
favorite, pin, or archive a note, and `isArchived` doesn't exist on the schema yet. Users have
no way to mark important notes for quick access or move stale notes out of their main list
without deleting them.

## What Changes

- Add `isArchived` (boolean, default `false`) to the `Note` model via a new Prisma migration.
- Add three ownership-scoped server actions — toggle favorite, toggle pinned, toggle archived —
  following the existing `assignNoteFolder` pattern in `app/actions/notes.ts`.
- Wire favorite/pin toggle buttons into `NoteList` (via `NoteCard`'s existing
  `favorite`/`pinned`/`onToggleFavorite`/`onTogglePin` props) and add an archive toggle
  affordance to the note card.
- Add favorite/pin/archive toggle buttons to the note editor's action toolbar
  (`app/components/notes/note-editor.tsx`), alongside the existing duplicate/delete buttons.
- Replace the static `Favorites`, `Pinned`, and `Archive` placeholder pages with real views that
  list the current user's own, non-deleted notes filtered by the corresponding flag, each with
  an empty state — mirroring the existing Trash view.
- Archiving a note removes it from the main "All notes" list (like trash) but keeps it out of
  trash and does not affect its favorite/pinned state. Favoriting/pinning a note does not remove
  it from "All notes".
- Add new functional requirements `FR-025` (favorite), `FR-026` (pin), `FR-027` (archive) to
  `docs/requirements.md`, filling the gap between `FR-024` (soft-delete) and `FR-060` (search).

Out of scope for this change: search filtering by favorite/pinned/archived status (search
already selects these columns but adding filter UI/query support is a separate, unrequested
enhancement), bulk actions, and undo/toast notifications beyond what already exists for other
note actions.

## Capabilities

### New Capabilities

(none — this extends two existing capabilities rather than introducing a new one)

### Modified Capabilities

- `note-actions`: add favorite, pin, and archive toggle requirements alongside the existing
  duplicate requirement (all are secondary, per-note actions on top of the core lifecycle).
- `notes-core`: add Favorites view, Pinned view, and Archive view requirements alongside the
  existing Notes list view / Trash view requirements; clarify that the "Notes list view"
  requirement excludes archived notes (in addition to deleted ones).

## Impact

- `prisma/schema.prisma` + new migration: add `isArchived` column and index.
- `app/actions/notes.ts`: three new toggle actions.
- `lib/notes/queries.ts`: `listFavoriteNotes`, `listPinnedNotes`, `listArchivedNotes`; update
  `listActiveNotes` to exclude archived notes.
- `app/components/notes/note-list.tsx`, `note-editor.tsx`: wire toggle affordances.
- `app/(dashboard)/favorites/page.tsx`, `pinned/page.tsx`, `archive/page.tsx`: real data instead
  of `PlaceholderPage`.
- `docs/requirements.md`: new FR-025/026/027.
- `openspec/specs/note-actions/spec.md`, `openspec/specs/notes-core/spec.md`: delta specs.
