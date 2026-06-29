# Design: add-note-editor

## Component boundary
`NoteForm` is a `'use client'` component because it owns interactive state: the
selected highlighter `color` and the `links` textarea value. The chosen color is
mirrored into a hidden `color` input so the server action sees it in the `FormData`.
Excerpt, body, and page are uncontrolled (`defaultValue`) and read straight from the
submitted form.

`LinkPicker` is split out as its own client component. It owns only the transient
"currently selected target" and calls `onAppend(value)` so `NoteForm` keeps the
single source of truth for the links text. This keeps the picker reusable and the
form's links state authoritative.

## Pages
Both pages are server components with `dynamic = 'force-dynamic'` (they read the
filesystem via `loadLinkTargets` / `readNote`). The new page seeds `newNoteId()`; the
edit page loads the note and `notFound()`s when absent, and additionally wires
`deleteNoteAction`.

## Submission
Forms post directly to the C9 server actions (`saveNoteAction`, `deleteNoteAction`).
Delete is a separate `<form>` so it has its own action and does not submit the edit
fields.

## Testing
Component tests assert label↔control association via `getByLabelText` (DS `Input`/
`Textarea` wire `htmlFor`/`id`) and the swatch row via `getByRole('radiogroup')`.
