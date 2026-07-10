## Context

This change realizes the offline-first + progress-sync core the rest of Edda assumes. Three ADRs pin the
design: `stack.md` ADR-005 (**OPFS for bytes, Dexie for structure; bytes bypass the SW**), ADR-008 (**custom
sync engine**, because no query library does furthest-progression-wins against a server we do not own), and
ADR-011 (**progress sync is a connector-scoped Strategy** with the **core engine as the context**).
`architecture.md` → *Progress sync* and `DESIGN.md` §4–§5.1 fix the shapes: progress *is* the `Locator`, keyed
per `(sourceId, bookId, mediaType)`, and the connector's optional `getProgress`/`setProgress` are formalized
into a named, swappable `ProgressSyncStrategy`. Stubs already exist — `core/sync/index.ts` (`OutboxEntry`,
`furthestWins`, `SyncEngine`) and `core/contracts/index.ts` (`ProgressSyncStrategy`) — and this change specifies
the behavior that fills them in. The UI surfaces (Downloads badge, "N downloaded for offline", "Synced Xm ago")
are visible in `doc/web/01-library-desktop.png`.

## Goals / Non-Goals

**Goals:**
- Stream a book to OPFS and read every resource back offline via `File.slice` range reads, with hot writes
  through a `FileSystemSyncAccessHandle` confined to a Worker.
- Book-byte (`206`) reads bypass the Service Worker entirely.
- A durable, typed Dexie store (registry + outbox) with versioned migrations, keyed per
  `(sourceId, bookId, mediaType)`.
- A core sync engine that drains the outbox on reconnect / focus, retries idempotently, and reconciles
  furthest-progression-wins by reading remote *through the strategy* before writing.
- A platform-neutral `ProgressSyncStrategy` plus a Komga implementation, gated by `progressSync`.
- The end-to-end acceptance: open a downloaded book, move through it network-cut, reconnect, reconcile.

**Non-Goals:**
- Server-specific code in the engine — it references only `ProgressSyncStrategy` + `Locator`.
- OPDS / Kavita / Calibre strategies (later; Calibre / bare-OPDS report `progressSync: false` → no-op here).
- Cross-source unified progress (`goals.md` non-goal) — each `(sourceId, bookId, mediaType)` is independent.
- The Downloads sidebar item, its badge slot, the Downloads route, and the SW denylist *config* — chrome owned
  by `app-shell`; this change provides the data and the list view.
- A quota / eviction policy beyond manual remove, and Background Sync registration (see Open Questions).

## Decisions

- **Stream downloads to OPFS; never fully buffer a book in memory.** Pipe the connector's download stream into
  an OPFS writable so memory stays flat and the file is the single source of bytes. *Alternative:* hold the book
  as an in-memory `Blob` or an IndexedDB blob — rejected; large books blow the memory budget and IndexedDB blob
  range reads are slow and awkward.
- **Hot writes through a `FileSystemSyncAccessHandle` in a Worker; reads via `File.slice` on any thread.**
  `createSyncAccessHandle()` is only valid off the main thread and gives the fast writes a download stream
  needs; reads are random-access via `getFile().slice(start, end)` and work anywhere. *Alternative:*
  `createWritable()` on the main thread for everything — rejected; slower for hot append and blocks the UI
  thread.
- **Book bytes bypass the Service Worker (ADR-005).** The byte read path is OPFS → `File.slice`, never a
  `fetch()` the SW can see; `app-shell` additionally denylists byte routes in `sw.ts`. Workbox cannot correctly
  cache a `206`, so any interception corrupts range reads. *Alternative:* cache book bytes in Cache Storage /
  route them through Workbox — rejected per ADR-005 (`206` range semantics break).
- **Dexie 4 typed tables + versioned migrations; compound key `[sourceId+bookId+mediaType]`.** Two tables:
  `downloads` (registry / metadata) and `outbox` (pending `Locator`s). Dexie gives typed schemas and safe
  `version().stores()` migrations, and the compound key is exactly the progress key. *Alternative:* raw
  IndexedDB or `localStorage` — rejected; no typed migrations, and Dexie is the decided structured-storage
  stack (ADR-005).
- **Custom sync engine, not a query/cache library (ADR-008).** Pinia Colada covers the read side; the outbox +
  furthest-progression-wins write side is bespoke because no library reconciles against a server we do not own.
  *Alternative:* a generic sync/replication library — rejected; none implement furthest-wins for an arbitrary
  self-hosted server.
- **Core owns the queue and the policy; the connector owns the server mechanics (ADR-011).** The engine is the
  Strategy *context* (outbox, scheduling, retry, furthest-wins) and touches the server only through the injected
  `ProgressSyncStrategy`; the Komga strategy (provided by `connector-komga`) maps Komga's native read-progress
  ↔ `Locator`. *Alternative:* let each connector own its own queue / scheduling — rejected; duplicates the
  durable-outbox machinery per server and breaks the platform-neutral sync protocol the native client reuses.
- **Drain triggers: `online` + focus / `visibilitychange`, debounced and single-flight.** React immediately to
  regained connectivity and to the user returning, without wasteful polling; one drain at a time avoids races.
  *Alternative:* fixed-interval polling — rejected; wasteful when idle and slow to react on reconnect.
- **Idempotency via read-before-write + latest-per-key outbox collapse.** Each key keeps one pending `Locator`
  (the furthest); a drain reads remote, applies `furthestWins`, writes only when local is further, and removes
  the entry only after a confirmed write — so a replayed drain is a no-op. *Alternative:* an append-only op-log
  with dedupe ids — rejected; overkill for "latest position per book" and grows unbounded offline.
- **Reconcile on `locations.totalProgression` (0..1), never on wall-clock time.** Clocks across devices are
  unreliable; progression is the monotonic, comparable quantity (matches `core/sync`'s `furthestWins`).
  *Alternative:* last-write-wins by timestamp — rejected; clock skew silently regresses a reader's furthest
  position.

## Risks / Trade-offs

- [`FileSystemSyncAccessHandle` misused on the main thread throws / corrupts] → confine sync handles to a
  dedicated Worker; the main thread only ever reads via `File.slice`.
- [The SW accidentally intercepts a book-byte request → corrupt `206`] → rely on `app-shell`'s explicit
  byte-route denylist *and* keep the read path off `fetch`; a test asserts a range read bypasses the SW.
- [The outbox grows unbounded while a server is unreachable] → collapse to the furthest pending `Locator` per
  key (one row per book), with bounded retries and backoff.
- [Komga's per-book read-progress is coarser than an EPUB CFI locator] → the strategy maps `Locator` ↔ Komga's
  position; a sub-resource fragment may be lost on round-trip, but `totalProgression` stays monotonic so
  furthest-wins is still correct.
- [OPFS fills up / quota exceeded] → the registry tracks per-book sizes and the Downloads list supports remove;
  automatic LRU eviction is deferred (Open Questions).
- [Reconnect storms re-drain repeatedly] → single-flight + debounce; idempotent drains make extra triggers
  harmless.

## Open Questions

- Background Sync API (`SyncManager`) for drains while the app is closed, vs the in-app `online` / focus
  triggers — start in-app; add Background Sync later.
- Partial-download **resume** across sessions vs restart-from-zero — lean restart for v1; resume is an
  enhancement.
- OPFS **quota / eviction** policy when storage is full — manual remove for v1; LRU / auto-evict deferred.
- Whether to surface a richer sync state (syncing / error) beyond "Synced Xm ago" — deferred to a later polish
  pass.
