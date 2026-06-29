# Tasks: add-book-store

- [x] Write failing test `lib/content/books.test.ts`
- [x] Implement `parseBook` with tolerant validation and `malformed` flag
- [x] Implement `serializeBook` (frontmatter + body), omitting absent optionals
- [x] Implement `readBook` (returns null when missing)
- [x] Implement `listBooks` sorted by title
- [x] Implement `createBook` with unique slug resolution
- [x] Implement `updateBook` overwriting metadata + body
- [x] Run `npx vitest run lib/content/books.test.ts` until green
