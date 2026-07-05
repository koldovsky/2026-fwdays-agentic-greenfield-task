## Context

`isFavorite`/`isPinned` already exist on `Note` (unused), `isArchived` does not. The
`/favorites`, `/pinned`, `/archive` routes and sidebar nav items already exist but render a
static `PlaceholderPage`. The design-system `NoteCard` already accepts `favorite`/`pinned`/
`onToggleFavorite`/`onTogglePin` props with built-in `stopPropagation()` handling, and
`IconButton` already accepts an `active` prop for toggled/selected state — no design-system
changes are needed for this feature. The established action pattern in `app/actions/notes.ts`
is: `assertSameOrigin()` → `verifySession()` → an ownership-scoped `updateMany`/`findFirst` →
`revalidatePath(...)` → return `NoteRelationResult` (no redirect, unlike delete/duplicate).

## Goals / Non-Goals

**Goals:**
- Let a user mark their own notes as favorite, pinned, or archived, and unmark them.
- Give each state a real list view (Favorites, Pinned, Archive) mirroring the existing Trash
  view, with correct empty states.
- Keep "All notes" as the primary view, hiding archived notes from it (parallel to how it
  already hides deleted notes) while still showing favorited/pinned notes there.
- Add FR-IDs for these behaviors to `docs/requirements.md` so they're traceable like every
  other capability.

**Non-Goals:**
- Search filtering by favorite/pinned/archived (search already selects `isFavorite`/
  `isPinned`; adding filter UI/params for them is a separate, unrequested enhancement).
- Bulk toggle actions, keyboard shortcuts for toggling, or new toast/undo affordances beyond
  what already exists.
- Nested/priority ordering among pinned notes (pinned notes sort by `updatedAt` like
  everything else — no manual reordering).

## Decisions

- **Reuse the existing `NoteRelationResult` type** (`{ ok: true } | { ok: false; error }`) for
  three new actions in `app/actions/notes.ts`: `toggleNoteFavorite`, `toggleNotePinned`,
  `toggleNoteArchived`. Each: `assertSameOrigin()` → `verifySession()` → look up the note
  scoped to `{ id, userId, deletedAt: null }` → flip the boolean → `revalidatePath("/notes",
  "layout")` plus the action's own view (`/favorites`, `/pinned`, `/archive`) — same shape as
  `assignNoteFolder`. No redirect: toggling should keep the user where they are.

- **Favorite/pin get a quick-toggle on the note card; archive does not.** `NoteCard` already
  has `favorite`/`pinned` props with built-in click handling — wiring `NoteList` to pass
  `favorite={note.isFavorite}`, `pinned={note.isPinned}`,
  `onToggleFavorite={toggleNoteFavorite.bind(null, note.id)}`,
  `onTogglePin={toggleNotePinned.bind(null, note.id)}` is a cheap, already-designed-for
  addition. `NoteList` stays a Server Component — binding a server action's first argument
  and passing the bound reference as a prop to the (already `"use client"`) `NoteCard` is the
  same supported pattern already used for `formAction={createNote}` elsewhere in this app.
  Archive has no such prop on `NoteCard` (and would functionally remove the note from the list
  being viewed, unlike a passive favorite/pin flag), so it's deliberately editor-only —
  consistent with the existing precedent that delete/duplicate (also list-removing or
  data-copying actions) are editor-only, never on the card.

- **All three get a toggle in the note editor's action toolbar**, next to the existing
  duplicate/delete `IconButton`s, using `IconButton`'s existing `active` prop (e.g.
  `active={isFavorite}`) so the pressed/toggled state is visually obvious without any
  design-system change. This requires adding `initialFavorite`/`initialPinned`/
  `initialArchived` props to `NoteEditor` and passing them from `NotePage`
  (`getOwnedNote` already returns the full `Note` row, so no query change needed there).

- **`isArchived` hides a note from "All notes", folder views, and tag views, and from search
  results — the same base condition as `deletedAt IS NULL`.** `listActiveNotes`,
  `listNotesByFolder`, `listNotesByTag` all add `isArchived: false`; `searchNotes`'s base
  `conditions` array gets `"Note"."isArchived" = false` alongside the existing
  `"deletedAt" IS NULL`, and `NOTE_COLUMNS` picks up `"Note"."isArchived"` for consistency with
  the already-selected `isFavorite`/`isPinned`. Rationale: Archive is presented in the IA as a
  sibling destination to Trash/All Notes, so a note the user archived to get it out of the way
  shouldn't resurface in general search. Favorited/pinned notes are not hidden anywhere —
  those flags are additive, not a visibility state.

- **New query functions** `listFavoriteNotes`, `listPinnedNotes`, `listArchivedNotes` in
  `lib/notes/queries.ts`, following the exact shape of `listTrashedNotes`
  (`{ userId, deletedAt: null, isFavorite: true }` etc., ordered by `updatedAt desc`).

- **New views replace the placeholder pages**, following the `TrashPage`/`TrashedNoteList`
  pattern exactly (heading + list component + empty state), reusing `NoteList` itself (it
  already handles the empty state and grid) rather than introducing three near-duplicate list
  components — the favorite/pin toggle wiring described above lives in `NoteList` and applies
  equally to all views that use it.

- **New FR-IDs**: `FR-025` (favorite), `FR-026` (pin), `FR-027` (archive) added to
  `docs/requirements.md`'s Notes section, between `FR-024` (soft-delete) and the Search
  section — filling the gap the original requirements doc left for a feature the PRD already
  anticipated but never assigned an ID.

- **Migration**: `isArchived Boolean @default(false)` on `Note`, plus `@@index([userId,
  isArchived])` for the new Archive view's query (mirrors the existing `@@index([deletedAt])`
  precedent for a boolean-ish filter column).

## Risks / Trade-offs

- [Risk] Excluding archived notes from search could surprise a user who forgot they archived
  something and searches for it. → Mitigation: out of scope to solve now (no filter UI
  requested); Archive has its own list view and is one click away in the sidebar, same as
  Trash today.
- [Risk] `NoteList` reused across four views (All notes, Favorites, Pinned, Archive) — a bug
  in its toggle wiring affects all of them at once. → Mitigation: it already has this
  blast-radius today for its create/empty-state logic; the toggle handlers are per-note
  bound actions, not view-specific, so there's no view-conditional logic to get wrong.
- [Risk] Migration adds a NOT NULL boolean column with a default to a table that may have
  existing rows. → Mitigation: `@default(false)` backfills existing rows automatically in
  Postgres for a fixed-default column add; same low-risk shape as the original `isFavorite`/
  `isPinned` migration.

## Migration Plan

1. `prisma migrate dev --name add_is_archived_to_note` (adds column + index).
2. No data backfill needed (`@default(false)` covers existing rows).
3. No rollback complexity: this is purely additive (new column, new actions, new routes going
   from placeholder to real); nothing existing changes shape.
