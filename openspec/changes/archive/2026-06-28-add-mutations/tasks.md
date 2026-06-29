# Tasks — Mutations

- [x] Write failing parser tests in `app/actions.test.ts`
- [x] Implement pure parsers `bookMetaFromForm` and `noteFromForm`
- [x] Implement `'use server'` actions: `createBookAction`, `updateBookAction`,
      `saveNoteAction`, `deleteNoteAction` (parse → store → revalidate → redirect)
- [x] Run `npx vitest run app/actions.test.ts` — green
