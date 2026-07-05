## Context

`app-foundation` shipped placeholder pages at `app/(dashboard)/notes/page.tsx`,
`app/(dashboard)/notes/new/page.tsx`, and `app/(dashboard)/trash/page.tsx` (all rendering
`PlaceholderPage`). `data-model` shipped the `Note` Prisma model (with `deletedAt`), plus
`lib/notes/queries.ts` (`listActiveNotes`, `listTrashedNotes`) and `lib/notes/purge.ts`
(30-day retention, not yet scheduled). `auth` shipped `app/lib/dal.ts`
(`verifySession()`/`getUser()`, session cookie backed) and the Server Action pattern used by
`app/actions/auth.ts` (`assertSameOrigin()` first, Zod validation, typed `FormState` return).

This change wires those pieces together into a working note lifecycle: list, create, edit
with autosave, and soft-delete/trash. The Notely design system (`@notely-design/components`)
has `NoteCard`, `EmptyState`, and `Toast` but no `Textarea` — the component inventory's "not
built yet" list confirms this, so one is added locally per the same pattern as other custom
pieces (plain component + CSS tokens, `"use client"`).

## Goals / Non-Goals

**Goals:**
- Create, view, edit, and soft-delete notes, scoped strictly to the authenticated user.
- Autosave note edits 1s after the user stops typing, with optimistic UI and a visible
  save-status indicator (idle / saving / saved / error).
- Trash view listing soft-deleted notes; no permanent-delete or restore UI yet (not in FR-024
  or the Phase 3 deliverables — restore is not called out in requirements.md and is deferred).
- Replace the three placeholder pages with real, data-backed views.

**Non-Goals:**
- Folder/tag assignment, filtering, or pickers (`folders-tags`, phase 4).
- Markdown rendering, keyboard shortcuts, or HTML sanitization (`markdown-editor`, phase 5) —
  content is stored and edited as plain text this phase.
- Duplicate action (`note-actions`, phase 6).
- Full-text/filtered search (`search`, phase 7).
- Scheduling the `purgeExpiredNotes` job — still an open question from `data-model`, out of
  scope here.
- Restoring a note out of trash, or a "permanently delete" action — not required by FR-024.

## Decisions

**1. Server Actions for all note mutations, not a REST API.**
The PRD sketches a REST-shaped API (`POST /api/notes`, etc.), but `auth` already established
Server Actions (`app/actions/auth.ts`) as this project's mutation pattern, and Next's own docs
in `node_modules/next/dist/docs/` recommend Server Actions for form-driven mutations. Using
the same pattern keeps CSRF handling (`assertSameOrigin()`), session verification, and
validation consistent across the app. New file: `app/actions/notes.ts` with `createNote`,
`updateNote`, `softDeleteNote`.
*Alternative considered:* Route Handlers under `app/api/notes/`. Rejected — would duplicate
the CSRF/session-check boilerplate already solved for auth, for no benefit since there's no
external API consumer yet.

**2. Ownership enforced at the query layer, not just at the route.**
Every read/write in `app/actions/notes.ts` and `lib/notes/queries.ts` includes `userId` from
`verifySession()` in the `WHERE` clause (Prisma `findFirst`/`updateMany` with `userId` in the
filter, not `findUnique` by `id` alone). This mirrors the `auth` spec's "Data access without a
verified session is rejected" scenario and prevents one user from reading/editing/deleting
another user's note by guessing an id.
*Alternative considered:* Fetch by id then compare `note.userId === session.userId` in app
code. Rejected — an easy place to forget the check on a new code path; filtering in the query
itself makes the unauthorized case return "not found" uniformly with no extra code.

**3. Autosave: client-side debounce + optimistic local state, no CRDT/conflict resolution.**
The editor keeps note title/content in local component state. A 1000ms debounce (matching
FR-022 exactly) fires `updateNote` after the user stops typing. The UI shows "Saved"
immediately on keystroke (optimistic) and reconciles to "Saving…" → "Saved" / "Error — retry"
based on the actual server-action result. Single-tab, single-writer is assumed — no
last-write-wins conflict UI, since multi-tab/multi-device concurrent editing isn't in
requirements.md for this phase.
*Alternative considered:* `useOptimistic` + `useTransition` wired directly to the debounced
action. Adopted as the implementation mechanism (not an alternative, this is the plan) — it's
the idiomatic React/Next primitive for this exact optimistic-update-plus-pending-state shape.

**4. Soft-delete is a field flip, not a route change.**
`softDeleteNote(id)` sets `deletedAt: new Date()` via `prisma.note.updateMany({ where: { id,
userId, deletedAt: null } })`. The note list (`listActiveNotes`) filters `deletedAt: null`;
trash (`listTrashedNotes`) filters `deletedAt: { not: null } }`. Both query functions already
exist from `data-model` — this change only adds the mutation and wires the two list views to
them.

**5. New `Textarea` primitive, not a third-party rich-text lib.**
The design system doesn't ship one yet. A minimal `components/ui/textarea.tsx` — a styled
`<textarea>` using the same token classes (`t-body`, `var(--radius-md)`, etc.) as `Input` —
covers FR-021 for this phase. `markdown-editor` (phase 5) replaces this with a real editor
component later; no need to over-build it now.

**6a. "New note" is triggered via a form submission to the `createNote` Server Action, not a
GET navigation to `/notes/new`.**
`assertSameOrigin()` (established by `auth` for SEC-003) requires the request's `Origin`
header to be present and match `Host`. Browsers reliably send `Origin` on POST-style Server
Action invocations (form submissions, direct action calls from client code) but not on plain
top-level GET navigations. Rendering `createNote()` as a page-load side effect on a GET
`/notes/new` route would therefore fail the origin check unpredictably. Instead, the "New
note" header button and empty-state action are `<form action={createNote}>` wrapping a
submit `Button` — a real Server Action POST. `/notes/new` is kept as a route (for any
existing link/bookmark) but renders a client component that auto-submits a hidden form to
`createNote` on mount via `requestSubmit()`, so it still goes through a genuine form
submission rather than a bare GET side effect.
*(Discovered during implementation — task 3.2 in tasks.md originally assumed a GET-triggered
page; adjusted here and in tasks.md to keep the CSRF check meaningful.)*

**6. List and editor are separate routes, not a split-pane single page.**
`/notes` → grid/list of `NoteCard`s; `/notes/new` → editor pre-filled empty; `/notes/[id]` →
editor pre-filled with the note. This matches the existing placeholder route structure
(`notes/new/page.tsx` already exists) and keeps each route's data-loading concern narrow.
Trash lives at the pre-existing `/trash` route and lists read-only `NoteCard`s (no editor link
— deleted notes aren't editable in this phase).

## Risks / Trade-offs

- **[Risk]** Debounce timer reset on every keystroke could mean a notes-heavy typist's edits
  are never saved before navigating away. → **Mitigation:** also trigger an immediate save on
  route change / component unmount (flush pending debounce) and on `visibilitychange`/`blur`.
- **[Risk]** Optimistic UI could show "Saved" while the server action is still failing (e.g.
  network drop). → **Mitigation:** save-status indicator explicitly reconciles to an "Error"
  state with a manual "Retry" affordance if the action throws or returns an error field; it is
  not purely fire-and-forget.
- **[Risk]** Concurrent edits across two tabs could silently overwrite each other
  (last-write-wins on `updateNote`). → **Mitigation:** accepted for this phase per Non-Goals;
  flagged here for future revisit if multi-tab editing becomes a real requirement.
- **[Trade-off]** Plain-text content in this phase means notes created now display literally
  (no Markdown rendering) until `markdown-editor` ships. Acceptable since `content` is stored
  as a plain string either way — no migration needed when Markdown rendering is added later.

## Migration Plan

No schema migration — `Note` model already has every field this phase needs. Deploy is a
normal code push: replace the three placeholder pages, add `app/actions/notes.ts`, add
`components/notes/*` and `components/ui/textarea.tsx`. No feature flag needed since there are
no existing notes/users depending on the placeholder behavior.

## Open Questions

- Should creating a note (`/notes/new`) insert a row immediately (so autosave has an id to
  target from keystroke one), or hold the first save until the user has typed something?
  **Decision for this change:** insert immediately with empty title/content on navigating to
  `/notes/new` and redirect to `/notes/[id]`, so autosave logic is identical between "new" and
  "existing" notes and there's no separate create-vs-update branch in the editor component.
  An empty note left untouched is harmless and consistent with soft-delete/trash handling
  already in place.
