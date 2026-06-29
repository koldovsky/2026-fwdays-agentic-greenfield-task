# Tasks: add-note-store

- [x] Write failing test `lib/content/notes.test.ts`
- [x] Implement `parseNote` / `serializeNote` with tolerant defaults
- [x] Implement `readNote` (null when missing)
- [x] Implement `listNotes` (sorted by id)
- [x] Implement `saveNote` (create/overwrite via atomic write)
- [x] Implement `deleteNote` (remove file)
- [x] Implement `newNoteId`
- [x] Run `npx vitest run lib/content/notes.test.ts` until green
