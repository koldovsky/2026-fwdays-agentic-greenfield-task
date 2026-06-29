## Context

First capability in the build sequence. Bookshelf persists books and notes as Markdown
files under a content root; this layer is the only place that calls `node:fs`, so its
correctness underpins data integrity for everything above it. Local single-device app,
no concurrency beyond a single user's sequential actions.

## Goals / Non-Goals

**Goals:**
- Crash-safe writes (no partial files).
- Reads that never crash a page just because a file is missing.
- A single content-root resolution point, overridable in tests.

**Non-Goals:**
- Binary file writes (cover images) — deferred to the `cover-images` capability, which
  will add a buffer-based variant.
- Locking / multi-writer concurrency — out of scope for a single-device app.

## Decisions

- **Atomic write = temp-in-same-dir + rename.** Writing to `.<name>.tmp-<pid>` beside the
  target and renaming is atomic on the same filesystem, unlike write-in-place. Chosen over
  a library dependency to keep the stack minimal.
- **Missing file → fallback, other errors → rethrow.** Distinguish `ENOENT` from real
  failures so callers get a clean "not found" path without masking bugs (e.g. permissions).
- **Listing returns `[]` for a missing directory.** Lets higher layers treat "no books yet"
  and "no notes yet" uniformly without existence checks.
- **Content root via `BOOKSHELF_CONTENT_DIR`.** A single env-overridable resolver makes the
  whole data layer testable against a temp directory.

## Risks / Trade-offs

- [Rename across filesystems fails] → Temp file is created in the **same directory** as the
  target, so the rename stays on one filesystem.
- [Text-only API] → Cover images need bytes; explicitly deferred to `cover-images` to keep
  this capability small and focused.

## Open Questions

- None. Binary-write needs are tracked by the `cover-images` capability.
