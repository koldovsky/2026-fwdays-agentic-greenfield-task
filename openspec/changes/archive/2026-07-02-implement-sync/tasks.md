# implement-sync — tasks

## 1. Sync implementation

- [x] 1.1 Implement `askdocs/sync.py`: `SyncSummary(added, updated, deleted)` dataclass and `sync_once(source, embedder, store)` — diff per-file chunk content-hashes (disk via DocSource vs store via get_all), re-ingest changed/new files, delete-by-source for files gone from disk
- [x] 1.2 Implement `watch(source, embedder, store, interval, max_iterations=None)` loop calling `sync_once`, and `python -m askdocs.sync <corpus-dir>` entrypoint (env `ASKDOCS_CORPUS`, `ASKDOCS_SYNC_INTERVAL`)

## 2. Tests

- [x] 2.1 Reconciliation tests against qdrant (clean-store fixture, tmp corpus): new file → indexed; edited file → updated with no stale chunks; deleted file → chunks gone
- [x] 2.2 Idempotency test: two passes over an unchanged directory — second reports empty `SyncSummary` and store is unchanged
- [x] 2.3 Watch-loop test: `watch(..., max_iterations=1)` performs exactly one reconciliation pass

## 3. Done criteria

- [x] 3.1 Full suite green via `docker compose run --rm app pytest`
