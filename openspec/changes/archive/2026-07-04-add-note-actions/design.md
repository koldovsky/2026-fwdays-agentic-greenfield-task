## Context

`notes-core` established the editor as the single hub for note-level actions (it already hosts
Delete); `folders-tags` added `folderId` and `NoteTag` associations that a duplicate must copy
alongside title/content. The vendored `Toast` component renders its status icon via
`<i data-lucide>`, the same non-functional-icon gap already worked around repeatedly in this
project (`NoteEmptyState`, `SidebarFolderRow`/`SidebarTagRow`) — but unlike those cases, a toast
is prominent and appears center-of-attention after every duplicate action, so a blank icon
would be more noticeable here than in a corner hover button.

## Goals / Non-Goals

**Goals:**
- Duplicate a note (title, content, folder, tags) into a new note owned by the same user.
- Navigate to the new note after duplicating.
- Show a confirmation toast once, on the new note's page load.

**Non-Goals:**
- A duplicate entry point from the notes list — editor-only, matching where Delete already
  lives.
- Duplicating a trashed note — not reachable, since trashed notes have no editor link.
- A general-purpose toast system for other actions — this toast component is intentionally
  small and scoped to this one confirmation; if more toasts are needed later, revisit whether
  to build a shared queue/provider then.

## Decisions

**1. `duplicateNote(id)` is a single Server Action doing a read-then-create, not a raw SQL
copy.**
Reads the source note (scoped to the current user, active only) plus its `NoteTag` rows, then
creates a new `Note` with copied `title`/`content`/`folderId`, and `createMany`s matching
`NoteTag` rows pointing at the same tag ids (tags belong to the user, not the note, so they're
shared, not duplicated). This mirrors `createNote`'s existing shape (create + redirect) rather
than introducing a different persistence pattern.

**2. Title gets a `"Copy of "` prefix; empty titles stay empty.**
Matches the common convention (Google Docs, Finder, etc.) for a copied item's default name,
without producing an odd `"Copy of "` with nothing following it for untitled notes.

**3. Confirmation is carried across the redirect via a `?duplicated=true` query param, read
once and then stripped.**
`duplicateNote` ends with `redirect(\`/notes/${newNote.id}?duplicated=true\`)`. The note page
(`app/(dashboard)/notes/[id]/page.tsx`) reads `searchParams` server-side and passes
`showDuplicateToast` as an initial boolean prop to `NoteEditor`. On mount, if true, the editor
shows the toast and calls `router.replace` (no query param) so a manual refresh of that URL
doesn't re-trigger it.
*Alternative considered:* skip the redirect/query-param dance and call `duplicateNote`
directly from a client handler (not a `<form action>`), getting the new note id back
synchronously and doing a client-side `router.push` + toast with no URL round trip. Rejected —
`duplicateNote` needs `assertSameOrigin()` like every other mutating action, which works
identically whether invoked via a form or a direct call; the query-param approach keeps the
Server Action's shape consistent with `createNote`/`softDeleteNote` (create-or-mutate, then
`redirect()`), rather than introducing a third calling convention.

**4. `components/ui/toast.tsx` is hand-rolled, not the vendored `Toast`.**
Minimal: message, an auto-dismiss timeout (~3s), optional manual dismiss, using a new
`IconCheck` from `components/icons.tsx` instead of the vendored component's `<i data-lucide>`
status icon. Scoped to exactly this one use case — not a generalized toast queue/provider,
since nothing else in the app needs one yet.

## Risks / Trade-offs

- **[Risk]** If a user bookmarks or shares a URL with `?duplicated=true` still attached (before
  the client-side `router.replace` runs), reloading it would re-show the toast once more.
  → **Mitigation**: low-stakes, self-correcting (the replace happens within one render pass
  after mount); not worth additional guarding for a cosmetic confirmation message.
- **[Trade-off]** Copying `NoteTag` rows via `createMany` assumes tag ids still exist and
  belong to the user at duplicate time (true, since the source note's own tags were already
  validated when assigned). No extra ownership re-check needed on the tag ids themselves.

## Migration Plan

No schema migration. Deploy is a normal code push: new Server Action, new toast component,
editor button, and a `searchParams` read in the note page.

## Open Questions

None outstanding — scope and mechanics are fully determined by the decisions above.
