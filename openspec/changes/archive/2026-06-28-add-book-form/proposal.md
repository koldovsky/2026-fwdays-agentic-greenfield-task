# Change: add-book-form

## Why
Users need a way to create and edit books through the UI rather than hand-editing
Markdown files. This delivers capability C13 (requirements.md §3.3).

## What Changes
- Add `components/BookForm.tsx`: a server-rendered, DS-styled form (Input/Select/Textarea/Button)
  covering all book fields. Status and cover color are `Select`s; cover is a file input.
  The slug field is shown and editable only when creating; when editing, the slug is fixed
  and passed via a hidden field, along with any `existingCover`.
- Add `app/book/new/page.tsx`: the create page, wiring the form to `createBookAction`.
- Add `app/book/[slug]/edit/page.tsx`: the edit page, prefilling from `readBook` and wiring
  the form to `updateBookAction`.

## Impact
- Affected specs: `book-form`
- Affected code: `components/BookForm.tsx`, `app/book/new/page.tsx`, `app/book/[slug]/edit/page.tsx`
- Depends on: C9 (server actions), C10 (DS integration), C4 (book store)
