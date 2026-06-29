# Proposal: add-note-store

## Why
Books need attached notes (highlights, reflections, links) persisted as
`notes/<id>.md` files alongside each book. We need a typed store to parse,
serialize, list, save, and delete notes with tolerant defaults so malformed
frontmatter never crashes the app.

## What Changes
- Add `lib/content/notes.ts` with `parseNote`, `serializeNote`, `readNote`,
  `listNotes`, `saveNote`, `deleteNote`, and `newNoteId`.
- Notes are stored as Markdown files with YAML frontmatter (color, optional
  excerpt + page, links) and a Markdown body (the reflection).
- Tolerant parsing: invalid/missing color defaults to `yellow`, absent links
  become `[]`, absent excerpt/page are omitted.

## Capabilities
- New: `note-store`

## Impact
- New file `lib/content/notes.ts` (+ test). Depends on existing
  `lib/content/{paths,fs-utils,types,colors}.ts`. No changes to other
  capabilities. Uses `gray-matter` for frontmatter.
