# Change: add-note-editor

## Why
Readers need to create, edit, and delete notes against a book: choose a highlighter
color, capture a quoted excerpt and a reflection, set a page, and link to existing
books/notes. This is requirements.md §3.3 (note CRUD + LinkPicker).

## What Changes
- Add `components/NoteForm.tsx` — a `'use client'` form holding the selected
  highlighter color and links state, submitting through the C9 server actions.
- Add `components/LinkPicker.tsx` — picks an existing book/note target and appends
  its `book:`/`note:` string into the links field.
- Add `app/book/[slug]/notes/new/page.tsx` — new-note page (seeds `newNoteId()`).
- Add `app/book/[slug]/notes/[noteId]/edit/page.tsx` — edit page (prefill, save, delete).

## Capability
- `note-editor` (C14)

## Dependencies
- C9 server actions (`saveNoteAction`, `deleteNoteAction`)
- C10 design system (`HighlighterPicker`, `Input`, `Textarea`, `Button`)
- C5 note store (`readNote`, `newNoteId`)
- C8 queries (`loadLinkTargets`)
