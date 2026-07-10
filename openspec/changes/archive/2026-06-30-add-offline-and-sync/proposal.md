## Why

Edda's headline promise — "open a downloaded book, move through it, reconnect, and progress reconciles
furthest-wins on the server, all with the network cut" (`goals.md` → What "good" looks like) — is exactly the
slice this change builds. The reader (changes 6–8) can render an EPUB, but only from bytes it can reach:
nothing yet stores those bytes for offline use, and progress made offline has nowhere durable to wait until the
server is reachable again. This change adds the offline-first **byte store**, the server-independent **sync
engine**, and the connector-scoped **progress strategy** that together make the v1 experience work end-to-end
with no network.

**Sequencing:** change 9 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on `add-reading-preferences` (a
complete, readable reader to read offline) and, functionally, on `add-connector-komga` (Komga content +
downloads + the native read-progress API the strategy maps). Unblocks `add-extensions-and-capability-install`.

## What Changes

- Add **offline storage**: stream a book download to **OPFS**, serve range reads via `File.slice` (hot writes
  through a `FileSystemSyncAccessHandle` in a Worker), and keep a durable **Dexie 4** download registry keyed
  per `(sourceId, bookId, mediaType)` with typed migrations. Book bytes **bypass the Service Worker** — `206`
  partial reads are served straight from OPFS (ADR-005), relying on the byte-route denylist that `app-shell`
  installs. Surfaces a **Downloads list**, drives the sidebar **Downloads badge** count, the library's
  "**N downloaded for offline**" count, and a per-book **offline-available** indicator.
- Add the **sync engine**: a durable Dexie-backed **outbox** of `Locator` updates, **drain scheduling** on
  reconnect / app focus, **idempotent retry**, and **furthest-progression-wins** reconciliation that reads
  remote progress *through the strategy* before writing. It is the Strategy **context** (ADR-008 / ADR-011) and
  owns nothing server-specific; its last successful drain backs the "**Synced Xm ago**" indicator.
- Add the **progress-sync strategy** capability: the platform-neutral `ProgressSyncStrategy` interface in
  `core/contracts`, plus **Komga's implementation** (map Komga's native read-progress ↔ `Locator`) provided by
  `connector-komga` and gated by its `progressSync` capability; a connector with `progressSync: false` provides
  a **local-only / no-op** strategy. Integration-tested against the throwaway Docker Komga (`test/komga/`,
  reader `reader@edda.test`).

## Capabilities

### New Capabilities

- `offline-storage`: stream-to-OPFS byte store + `File.slice` range reads + a Worker sync-access-handle, a Dexie
  download registry, and the Downloads list / badge / offline-count / offline-available UI.
- `sync-engine`: the server-independent Strategy context — durable outbox, drain scheduling, idempotent retry,
  furthest-progression-wins reconciliation, and the "Synced Xm ago" last-drain signal.
- `progress-sync-strategy`: the platform-neutral `ProgressSyncStrategy` contract plus Komga's native
  read-progress ↔ `Locator` implementation (and the `progressSync: false` no-op strategy).

### Modified Capabilities

- None (greenfield).

## Impact

- Code: `src/core/sync/` (outbox + scheduler + furthest-wins reconciler), `src/core/contracts/index.ts`
  (`ProgressSyncStrategy`), `src/platform/web/` (OPFS storage + download streamer + sync-access-handle Worker),
  `src/plugins/connectors/komga/` (Komga `ProgressSyncStrategy`), a Dexie schema module, and `src/app/`
  Downloads view + stores. `sw.ts` carries the book-byte denylist (defined by `app-shell`).
- Storage: a new OPFS layout for book bytes; new Dexie tables `downloads` and `outbox` with typed migrations.
- Cross-capability: `app-shell` owns the Downloads nav item, its badge slot, the Downloads route, and the SW
  denylist; this change feeds the badge count and the list content. `library-browse` renders the
  "N downloaded for offline" count (from `offline-storage`) and the "Synced Xm ago" indicator (from
  `sync-engine`). No new runtime dependencies (OPFS is a platform API; Dexie is already in the stack).
