# implement-sync — proposal

## Why

Ingest is a one-shot: you run it, and the index is a snapshot. But documentation changes — files get edited, added, deleted. PRD FR-060 wants the mounted corpus directory kept continuously in sync with the vector store, so answers always reflect the current docs without a manual re-ingest. This also fixes a real gap: current ingest never removes chunks of files that were deleted from disk.

## What Changes

- New `askdocs/sync.py`: a reconciliation pass `sync_once(source, embedder, store)` and a `watch(...)` loop.
  - **Added/changed files** → re-ingested (delete-by-source + upsert), reusing the idempotent ingest path.
  - **Deleted files** (present in the store but gone from disk) → their chunks removed from the store.
  - Change detection compares per-file chunk content-hashes on disk vs. in the store, so unchanged files are not re-embedded (embedding is the expensive step).
- `watch()` polls at a configurable interval (`ASKDOCS_SYNC_INTERVAL`, default 5s). Polling, not inotify: bind-mount filesystem events are unreliable across the macOS-host → Linux-container boundary, so a poll+diff loop is the robust choice.
- New entrypoint `python -m askdocs.sync <corpus-dir>` runs the watch loop; an env-configurable corpus (`ASKDOCS_CORPUS`, default `/corpus`).
- Tests: reconciliation tested against qdrant — add → present, edit → updated, delete → gone, no-op tick re-embeds nothing.

## Capabilities

### New Capabilities

- `sync`: Continuously reconcile a mounted `.md` directory with the vector store — added, changed, and deleted files are reflected automatically. Covers PRD FR-060.

### Modified Capabilities

<!-- none: reuses ingest; deletion-of-vanished-files is new behavior owned by sync, not a change to ingest's spec -->

## Impact

- New code: `askdocs/sync.py` (reconciliation + watch loop + entrypoint).
- No new dependencies (polling uses the stdlib; reuses existing DocSource/embedder/store).
- Tests against qdrant using the clean-store fixture and tmp corpora.
- Downstream: enables `docker compose up` to launch a self-refreshing system (FR-052, next change).
