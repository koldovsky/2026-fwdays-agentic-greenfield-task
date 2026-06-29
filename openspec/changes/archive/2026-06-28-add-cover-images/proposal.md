# Add Cover Images

## Why
Books need an optional cover image: uploaded with the book form and served back over
HTTP from the book folder, safely (no path traversal).

## What Changes
- Add `atomicWriteBuffer` to `lib/content/fs-utils.ts` for binary-safe atomic writes.
- Add a `saveCover` helper (used by the book actions in `app/actions.ts`) that writes an
  uploaded image into the book folder as `cover<ext>` and returns the filename.
- Add a route handler `app/book/[slug]/[...cover]/route.ts` that serves files from a
  book folder with the correct `image/*` content type, rejecting paths containing `..`.

## Impact
- Affected specs: cover-images (new capability)
- Affected code: `lib/content/fs-utils.ts` (append), `app/book/[slug]/[...cover]/route.ts`
  (new), `saveCover` in `app/actions.ts`.
- Depends on: storage I/O (`bookDir`, `atomicWriteBuffer`).
