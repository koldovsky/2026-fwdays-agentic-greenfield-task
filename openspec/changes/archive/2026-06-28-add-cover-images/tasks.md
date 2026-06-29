# Tasks — Cover Images

- [x] Append `atomicWriteBuffer` to `lib/content/fs-utils.ts` (keep existing exports)
- [x] Add `saveCover` helper in `app/actions.ts` (write `cover<ext>`, return filename)
- [x] Record uploaded cover filename on the book in create/update book actions
- [x] Add cover-serving route `app/book/[slug]/[...cover]/route.ts` with content-type map
- [x] Reject request paths containing `..` with `400 Bad request`
