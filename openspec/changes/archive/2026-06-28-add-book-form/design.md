# Design: add-book-form

## Component
`BookForm({ action, book })` is a server-renderable component. It renders a `<form>`
with `action` set to a server action and `encType="multipart/form-data"` so the cover
file upload is included. All visible fields use DS components (`Input`, `Select`,
`Textarea`, `Button`) which associate their `label` prop with the control via an
auto-generated `htmlFor`/`id`, enabling accessible `getByLabelText` access.

## Create vs Edit
`editing = Boolean(book)`:
- Create: a `Slug` `Input` is rendered (editable, hint says it is generated from the title).
- Edit: the slug field is omitted; instead a hidden `slug` input carries `book.slug`, and a
  hidden `existingCover` input carries the current cover filename so the action can preserve
  it when no new file is uploaded.

## Cover
Two ways to set a cover: a `coverColor` `Select` (always present, defaults to `ink`) and a
`cover` file `Input`. When no file is uploaded, the chosen `coverColor` is stored.

## Pages
- `app/book/new/page.tsx` → `BookForm action={createBookAction}`.
- `app/book/[slug]/edit/page.tsx` → `force-dynamic`; loads `readBook(slug)`, `notFound()` if
  missing, then `BookForm action={updateBookAction} book={book}`.
