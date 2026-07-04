## 1. Note mutations (server actions)

- [x] 1.1 Add `NoteFormSchema`-equivalent Zod validation for note title/content (in
      `app/lib/definitions.ts` or a new `app/lib/notes/definitions.ts`) — reasonable max
      lengths, title/content optional-empty allowed
- [x] 1.2 Create `app/actions/notes.ts` with `createNote()`: calls `assertSameOrigin()` and
      `verifySession()`, inserts an empty `Note` for the current user, returns the new note id
- [x] 1.3 Add `updateNote(id, { title, content })` to `app/actions/notes.ts`: verifies session,
      validates input, updates via `prisma.note.updateMany({ where: { id, userId,
      deletedAt: null } })`, returns a typed result (`{ ok: true, updatedAt }` or
      `{ ok: false, error }`)
- [x] 1.4 Add `softDeleteNote(id)` to `app/actions/notes.ts`: verifies session, sets
      `deletedAt: new Date()` via `updateMany({ where: { id, userId, deletedAt: null } })`,
      redirects or returns a result for the caller to navigate away
- [x] 1.5 Confirm every action rejects when the row-scoped `updateMany`/`create` affects 0 rows
      for a foreign user's note id (covers FR-021/FR-024 cross-user scenarios)

## 2. Notes list view

- [x] 2.1 Replace `app/(dashboard)/notes/page.tsx` placeholder with a Server Component that
      calls `verifySession()` + `listActiveNotes(userId)` from `lib/notes/queries.ts`
- [x] 2.2 Build `components/notes/note-list.tsx` rendering a grid of `NoteCard` (from
      `@notely-design/components`) linking each card to `/notes/[id]`
- [x] 2.3 Wire the empty state (`EmptyState`, icon `inbox`) with a "New note" action when
      `listActiveNotes` returns zero notes
- [x] 2.4 Wire "New note" action (list empty state and a persistent header button) to a
      form/button that calls `createNote()` and redirects to `/notes/[id]`

## 3. Editor view and autosave

- [x] 3.1 Add `components/ui/textarea.tsx`: minimal styled `<textarea>` using the same token
      classes as the design system's `Input` (`"use client"` if it needs local state/handlers)
- [x] 3.2 Change "New note" triggers (notes list header, empty state) to submit a
      `<form action={createNote}>` rather than navigating to a GET route (`assertSameOrigin()`
      needs a real Origin-bearing submission — see design.md decision 6a). Replace
      `app/(dashboard)/notes/new/page.tsx` with a client component that auto-submits a hidden
      form to `createNote` via `requestSubmit()` on mount, so the route still works for
      existing links/bookmarks and redirects to `/notes/[id]`
- [x] 3.3 Add `app/(dashboard)/notes/[id]/page.tsx`: Server Component that verifies session,
      loads the note scoped to the current user (404/redirect if missing or not owned), passes
      it to a client editor component
- [x] 3.4 Build `components/notes/note-editor.tsx` (`"use client"`): title `Input` +
      content `Textarea`, local state for both fields
- [x] 3.5 Implement 1000ms debounce on title/content changes that calls `updateNote()`;
      use `useTransition`/`useOptimistic` (or equivalent local state) to reflect
      idle/saving/saved/error status without blocking typing
- [x] 3.6 Flush any pending debounced save on unmount/route change/`visibilitychange` so edits
      aren't lost when the user navigates away mid-debounce
- [x] 3.7 Render a small save-status indicator in the editor (e.g. "Saving…" / "Saved" /
      "Couldn't save — retry") wired to the state from 3.5
- [x] 3.8 Add a delete action in the editor (icon button) that calls `softDeleteNote()` and
      navigates back to `/notes`

## 4. Trash view

- [x] 4.1 Replace `app/(dashboard)/trash/page.tsx` placeholder with a Server Component that
      calls `verifySession()` + `listTrashedNotes(userId)` from `lib/notes/queries.ts`
- [x] 4.2 Render trashed notes as read-only `NoteCard`s (no link into the editor, since deleted
      notes aren't editable this phase)
- [x] 4.3 Wire the empty state (`EmptyState`, icon `trash-2`) for zero trashed notes

## 5. Navigation and cleanup

- [x] 5.1 Confirm sidebar "All notes" and "Trash" links (`lib/nav-items.ts` /
      `components/layout/sidebar-nav.tsx`) already point at `/notes` and `/trash` — update if
      needed (already correct, no change needed)
- [x] 5.2 Remove now-unused `PlaceholderPage` usages for notes/new/trash if
      `components/layout/placeholder-page.tsx` is still used elsewhere (leave the component
      itself if other placeholder routes still use it) — still used by favorites/archive/pinned,
      component kept as-is

## 6. Verification

- [x] 6.1 Manual/browser check: create a note, edit title and content, confirm autosave fires
      ~1s after typing stops and status indicator updates correctly — verified via Playwright
      driving system Chrome against `npm run dev`; status reached "Saved", content persisted
      after reload
- [x] 6.2 Manual/browser check: navigate away from the editor mid-debounce and confirm the
      pending edit was still saved (reload and verify content) — verified: typed content,
      immediately clicked "All notes" before the 1s debounce fired, revisited the note, edit
      was present
- [x] 6.3 Manual/browser check: soft-delete a note, confirm it disappears from `/notes` and
      appears in `/trash` — verified
- [x] 6.4 Manual/browser check: two different user accounts cannot see or edit each other's
      notes (direct URL to another user's note id is rejected) — verified: second registered
      user hitting the first user's `/notes/[id]` URL got a 404
- [x] 6.5 Run `npm run lint`, `tsc --noEmit`, and `npm run build` clean — all three pass with
      zero errors (pre-existing warnings in vendored `.agents/skills/notely-design` files only)
