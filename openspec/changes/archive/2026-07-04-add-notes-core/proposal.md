## Why

Notely has authentication and a persistence layer but no way for a signed-in user to actually
create, read, edit, or remove a note. This change delivers the minimum viable note lifecycle —
the product's core value proposition — so a logged-in user can capture and manage notes end to
end.

## What Changes

- Add a note list view (dashboard "All Notes") showing a signed-in user's own, non-deleted notes.
- Add a note editor view for creating a new note and editing an existing one (plain-text content
  in this phase; rich Markdown editing arrives in the `markdown-editor` capability).
- Add server actions for note CRUD: create, update (title/content), and soft-delete, all scoped
  to the authenticated user via the existing session DAL.
- Add debounced autosave: edits save automatically after 1 second of inactivity, with optimistic
  UI (edits appear saved instantly; a save-status indicator reflects idle/saving/saved/error).
- Add a Trash view listing soft-deleted notes (`deletedAt` set), scoped to the 30-day retention
  window already enforced by the `data-model` capability's purge query.
- Add empty states for zero notes and empty trash.

**Non-goals (later phases):** folder/tag assignment and pickers (`folders-tags`), Markdown
rendering/shortcuts/sanitization (`markdown-editor`), duplicate action (`note-actions`), and
full-text/filtered search (`search`). The editor in this phase is a plain textarea.

## Capabilities

### New Capabilities
- `notes-core`: create, edit, autosave, and soft-delete notes for the authenticated user,
  including the note list and trash views (FR-020, FR-021, FR-022, FR-024).

### Modified Capabilities
- (none — `auth` and `data-model` are consumed as-is; no requirement changes to either)

## Impact

- **New code:** `app/(dashboard)/notes/` routes (list, `[id]` editor, `new`), `app/(dashboard)/trash/`
  route, `app/actions/notes.ts` server actions, `app/lib/notes/*` (queries, autosave debounce
  helper), note list/editor/trash components under `components/notes/`.
- **Existing code touched:** dashboard shell/sidebar (wire "All Notes" and "Trash" links to real
  routes), `app/lib/dal.ts` (reuse `verifySession()`/`getUser()` for scoping queries).
- **Data:** uses the existing `Note` model (`prisma/schema.prisma`) — no migration needed;
  `deletedAt` soft-delete field and purge helper (`lib/notes/purge.ts`, if present from
  `data-model`) already exist.
- **Dependencies:** none new — reuses Prisma client, session DAL, Zod, Notely design system
  components already in the project.
