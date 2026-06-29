# Add Mutations (Server Actions)

## Why
The UI needs a single, server-side write path to create/update books and save/delete
notes. Form parsing must be pure and unit-testable, separate from the side-effecting
persist-and-navigate actions.

## What Changes
- Add `app/actions.ts` exporting `'use server'` actions: `createBookAction`,
  `updateBookAction`, `saveNoteAction`, `deleteNoteAction`.
- Add pure exported form parsers `bookMetaFromForm` and `noteFromForm`.
- Each action parses `FormData`, writes via the existing book/note stores, calls
  `revalidatePath`, and `redirect`s to the affected book (notes anchor to `#<id>`).

## Impact
- Affected specs: mutations (new capability)
- Affected code: `app/actions.ts` (new)
- Depends on: book store, note store, colors helpers, paths.
