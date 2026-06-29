# Design — Cover Images

**Storage.** `atomicWriteBuffer(filePath, Buffer)` mirrors the existing `atomicWrite` but
for binary data: write to a temp file then rename, so a partial write is never observed.

**Upload.** `saveCover(slug, FormData)` reads the `cover` file part; if present and
non-empty, writes it as `cover<ext>` into `bookDir(slug)` and returns the filename, which
the book action records on the book's `cover` field.

**Serving.** The catch-all route `app/book/[slug]/[...cover]/route.ts` joins the segments,
rejects any path containing `..` with `400`, reads the file from `bookDir(slug)`, maps the
extension to an `image/*` content type (default `application/octet-stream`), and returns
the bytes. Missing files yield `404`.
