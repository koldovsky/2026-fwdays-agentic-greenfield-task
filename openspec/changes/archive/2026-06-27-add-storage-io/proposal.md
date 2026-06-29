## Why

Bookshelf stores everything as Markdown files on disk, so every higher capability
(book store, note store, covers) needs one small, safe filesystem layer underneath it.
Without atomic writes a crash mid-save corrupts a note or book; without tolerant reads
a missing file crashes a page. This is the foundation change — first in the sequence
(see `docs/openspec/README.md`).

## What Changes

- Introduce the `storage-io` capability: the only place that uses low-level `node:fs`.
- Atomic file writes (write a temp file in the same directory, then rename over the target).
- Tolerant reads (return a caller-provided fallback when a file is absent; rethrow other errors).
- Directory listing helpers (immediate subdirectories; files by extension) that return an empty list for a missing directory.
- Content-root resolution from `BOOKSHELF_CONTENT_DIR`, falling back to `<cwd>/content`, plus the per-book/per-note path builders.
- Establishes the fs-isolation boundary: above this layer, code works through typed helpers, not raw `fs`.

## Capabilities

### New Capabilities
- `storage-io`: low-level filesystem primitives — atomic write, read-or-fallback, list dirs/files, and content-path resolution.

### Modified Capabilities
<!-- none — this is the first capability -->

## Impact

- New code: `lib/content/fs-utils.ts`, `lib/content/paths.ts` (+ Vitest unit tests).
- Foundation for `book-store`, `note-store`, and `cover-images`.
- No new runtime dependencies (Node stdlib only). No user-facing change yet.
