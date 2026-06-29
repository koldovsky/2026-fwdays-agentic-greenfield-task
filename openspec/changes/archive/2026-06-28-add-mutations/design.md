# Design — Mutations

Two layers in `app/actions.ts`:

1. **Pure parsers** (`bookMetaFromForm`, `noteFromForm`): read `FormData`, trim strings,
   coerce/validate (status whitelist, rating 1–10, coverColor whitelist, note color via
   `isNoteColor`), omit empty optionals. No I/O, so they are directly unit-testable.
2. **Server actions** (`'use server'`): parse, call the book/note stores, then
   `revalidatePath` the affected paths and `redirect`. Note saves redirect to the note
   anchor `#<id>`.

Cover handling lives in `add-cover-images` (the `saveCover` helper and its
`atomicWriteBuffer` dependency).
