## 1. Dexie storage layer

- [x] 1.1 Define a Dexie 4 database with typed `downloads` (registry / metadata) and `outbox` tables, both keyed
      per `(sourceId, bookId, mediaType)`, with a versioned migration (`stack.md` ADR-005)
- [x] 1.2 Registry entry shape: size, state, downloadedAt, offline-available flag; outbox entry shape
      `OutboxEntry { ref, locator, queuedAt }` collapsed to the furthest pending `Locator` per key
- [x] 1.3 Vitest: registry and outbox persist across a simulated reload; the same title in two media types yields
      two entries; a schema migration applies cleanly

## 2. OPFS byte storage

- [x] 2.1 Stream a book download into an OPFS file without buffering the whole book; mark complete in the registry
      only on success and clean up partials on failure
- [x] 2.2 Range reads via `File.slice`; hot writes via a `FileSystemSyncAccessHandle` in a dedicated Worker
- [x] 2.3 `src/platform/web/` storage adapter exposing the read / range API the format handler consumes
- [x] 2.4 Vitest: a streamed download writes to OPFS; a range read returns the requested slice; the
      sync-access-handle write runs in the Worker, not on the main thread

## 3. Book bytes bypass the Service Worker

- [x] 3.1 Serve book-byte / range reads directly from OPFS; ensure the read path never goes through a SW-scoped
      `fetch` (relies on the byte-route denylist owned by `app-shell` in `sw.ts`)
- [x] 3.2 Test: a `206` range read is served from OPFS and is not intercepted or cached by the SW (ADR-005)

## 4. Downloads UI (offline surfaces)

- [x] 4.1 Downloads list view (route owned by `app-shell`) listing offline-available books with size / state
- [x] 4.2 Drive the sidebar Downloads badge count and the library "N downloaded for offline" count from the
      registry; add a per-book offline-available indicator
- [x] 4.3 Remove-download action: delete OPFS bytes + registry entry and decrement the counts
- [x] 4.4 Design check: the Downloads badge, the "N downloaded for offline" count, and the offline indicator
      match `doc/web/01-library-desktop.png` (surfaces built to the maket's structure/labels; pixel capture is Gate 2's 8.2)

## 5. Sync engine (core, server-independent)

- [x] 5.1 Implement the `SyncEngine` over `core/sync`: `enqueue(OutboxEntry)` (collapse to the furthest per key)
      and `drain(strategy)` (read remote via `getProgress`, apply `furthestWins`, write via `setProgress`)
- [x] 5.2 Drain scheduling: trigger on `online` and on focus / `visibilitychange`; single-flight; no drain while
      offline
- [x] 5.3 Idempotent retry with backoff; keep the entry until a write is confirmed; never regress remote
- [x] 5.4 Persist `lastSyncedAt` on a successful drain and expose it for the "Synced Xm ago" indicator (rendered
      by `library-browse`)
- [x] 5.5 Vitest: queued-offline progress drains on a simulated reconnect; furthest-wins keeps the further
      `Locator` (both directions); a no-op strategy drains locally without error; retry does not double-write

## 6. Progress-sync strategy (interface + Komga)

- [x] 6.1 Confirm / finalize the platform-neutral `ProgressSyncStrategy` in `core/contracts`
      (`getProgress` / `setProgress` over `BookRef` / `Locator`; no DOM / `fetch` / `window`)
- [x] 6.2 Komga `ProgressSyncStrategy` in `src/plugins/connectors/komga/`: map Komga native read-progress ↔
      `Locator`; gate provision on `progressSync`; provide a no-op strategy when `progressSync: false`
- [x] 6.3 Conformance test: `Locator` serialize / deserialize round-trip is lossless (the native-reuse guarantee)
- [x] 6.4 Integration test vs Docker Komga (`pnpm komga:provision`, reader `reader@edda.test`): write-then-read
      read-progress round-trips; a further server position is returned by `getProgress`

## 7. End-to-end acceptance (headline)

- [x] 7.1 Integration / e2e harness that downloads a book, cuts the network, pages through it, reconnects, and
      asserts the server reconciles furthest-progression-wins (vs Docker Komga, `test-epubs/`)

## 8. Verification (maker ≠ checker)

- [x] 8.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [ ] 8.2 Playwright design-fidelity: capture the library / sidebar and compare the Downloads badge, the
      "N downloaded for offline" count, and the "Synced Xm ago" indicator against `doc/web/01-library-desktop.png`
- [ ] 8.3 Independent review pass (`/code-review` or a separate agent) on the diff; address findings
- [x] 8.4 `openspec validate add-offline-and-sync --strict` passes
