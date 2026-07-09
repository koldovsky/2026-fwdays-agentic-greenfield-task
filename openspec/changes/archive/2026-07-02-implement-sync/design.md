# implement-sync — design

## Context

Ingest, retrieve, answer, cli, eval are shipped. Ingest is idempotent and already replaces a file's chunks on re-ingest (delete-by-source + upsert), but it only acts on files it currently sees — it never removes chunks for files deleted from disk. PRD FR-060 asks for continuous sync of a mounted directory. The corpus is a Docker bind mount from the host.

## Goals / Non-Goals

**Goals:**

- A reconciliation pass that makes the store match the current disk state: adds, edits, and deletions all reflected.
- A watch loop that repeats it at an interval, runnable as the app's long-lived process.
- Deterministic, store-backed tests for each case.

**Non-Goals:**

- Sub-second latency or event-driven precision — near-real-time (seconds) is enough for docs.
- Watching non-.md files or non-local sources (PRD FR-100, proposed).
- Wiring it into `docker compose up` — that is FR-052, the next change (this change makes the watcher; the next makes it the default command).

## Decisions

### D1: Poll + diff, not inotify

`watch()` scans the corpus on a timer and reconciles. Rationale: filesystem events on Docker bind mounts are unreliable across the macOS→Linux boundary (inotify frequently doesn't fire for host edits), so event-driven watching would silently miss changes — the opposite of "continuous sync". Polling is O(files) of cheap CPU per tick and is correct regardless of the mount. `watchdog` (inotify) rejected for this reason and to avoid a dependency. Interval via `ASKDOCS_SYNC_INTERVAL` (default 5s).

### D2: Change detection by per-file chunk content-hashes

Embedding is the only expensive step, so a tick must not re-embed unchanged files. Each file's identity is the set of its chunk `content_hash`es. `sync_once`:

1. Read disk via `DocSource`; for each file, chunk it and compute its set of content-hashes.
2. Read the store's current `(source_path, content_hash)` set via `get_all()`.
3. For each disk file whose hash-set differs from the store's for that source → re-ingest that file (delete-by-source + embed + upsert).
4. For each `source_path` in the store but not on disk → delete-by-source.

Chunking runs every tick (cheap, pure), embedding runs only on real changes. No extra per-file marker is stored — the existing `content_hash` payload is sufficient.

### D3: Deletion is sync's responsibility, not ingest's

Ingest's contract stays "index what you're given". Removing chunks for vanished files is a sync-only behavior (a full-directory view is required to know a file is gone). This keeps ingest's spec unchanged and puts the new behavior in the sync capability where it belongs.

### D4: `sync_once` returns a summary; `watch` is a thin loop

`sync_once(...) -> SyncSummary(added, updated, deleted)` does one pass and is the unit of testing. `watch(...)` just calls it, logs the summary when non-empty, sleeps, repeats — with a `max_iterations` parameter so a test can run one tick deterministically without a background thread. Rationale: all real logic is in the testable pass; the loop is trivially correct.

## Risks / Trade-offs

- [Poll interval adds latency between a save and the index update] → seconds-scale, acceptable for docs; interval is configurable.
- [A tick that overlaps a half-written file could index a partial file] → next tick reconciles to the final content (content-hash differs), so it self-heals; acceptable for v1.
- [Large corpora make per-tick chunking cost grow] → still far cheaper than embedding; if it ever matters, a file mtime pre-filter can be added without changing the interface.

## Open Questions

- None blocking.
