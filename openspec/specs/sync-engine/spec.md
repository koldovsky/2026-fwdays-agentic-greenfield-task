# Spec: Sync Engine

## Purpose

The sync engine is the server-independent, durable outbox that drives furthest-progression-wins
reconciliation of reading progress between the local device and a connector's server. It owns the
outbox persistence (Dexie-backed), drain scheduling, single-flight execution, idempotent retry, and
the `furthestWins` reconciliation policy on `locations.totalProgression`. It reaches the server only
through an injected `ProgressSyncStrategy` — all server-specific protocol code lives in the
connector, never here. Sourced from change `add-offline-and-sync`.

## Requirements

### Requirement: Durable progress outbox

Reading-progress updates SHALL be enqueued as `Locator`s into a durable, Dexie-backed outbox, keyed per
`(sourceId, bookId, mediaType)`, that survives reloads and crashes. For a given key the outbox SHALL retain the
furthest-progressed pending `Locator` rather than an unbounded log of every update.

#### Scenario: Offline progress persists in the outbox across a restart

- **WHEN** progress is recorded while offline and the app is restarted before any drain
- **THEN** the pending `Locator` is still queued in the outbox after restart

#### Scenario: Outbox collapses to the furthest pending locator per book

- **WHEN** several progress updates for the same book are enqueued before a drain
- **THEN** the outbox holds a single pending entry for that key carrying the furthest-progressed `Locator`

### Requirement: Drain scheduling

The engine SHALL drain the outbox automatically when connectivity is regained (the `online` event) and when the
app regains focus / visibility, and SHALL NOT attempt to drain while offline. Draining SHALL be single-flight,
with no overlapping drains.

#### Scenario: Queued-offline progress drains on reconnect

- **WHEN** progress was queued while offline and the connection is regained
- **THEN** the engine drains the outbox and writes the pending progress through the connector's strategy

#### Scenario: No drain attempt while offline

- **WHEN** the app is offline
- **THEN** the engine does not attempt to write progress and the entry remains queued

### Requirement: Idempotent retry

A drain that fails (a network error or a server error) SHALL be retried with backoff, leaving the entry queued
until a write is confirmed. Re-draining an entry that has already been applied SHALL be a no-op so retries never
double-write or regress progress.

#### Scenario: Failed drain retries without losing the entry

- **WHEN** a drain fails partway
- **THEN** the pending entry remains in the outbox and is retried later with backoff

#### Scenario: Re-applying an already-synced entry is a no-op

- **WHEN** a drain re-processes an entry whose `Locator` already equals the remote position
- **THEN** no duplicate write occurs and remote progress is unchanged

### Requirement: Furthest-progression-wins reconciliation through the strategy

Before writing, the engine SHALL read the current remote progress *through the `ProgressSyncStrategy`*
(`getProgress`) and compare it with the pending local `Locator` on `locations.totalProgression`, keeping the
further-progressed `Locator` (furthest-progression-wins). The engine SHALL NOT write a `Locator` that regresses
remote progress, and SHALL adopt a further remote position locally.

#### Scenario: Local further than remote writes local

- **WHEN** the pending local `Locator` is further than the remote one read via the strategy
- **THEN** the engine writes the local `Locator` through the strategy

#### Scenario: Remote further than local keeps remote

- **WHEN** the remote `Locator` read via the strategy is further than the pending local one
- **THEN** the engine does not regress the server and keeps the remote `Locator`
- **AND** it adopts that remote position locally

### Requirement: Server-independent Strategy context

The sync engine SHALL depend only on the `ProgressSyncStrategy` interface and the platform-neutral `Locator`; it
SHALL contain no server URLs, endpoints, auth, or protocol code. With a no-op strategy (a connector reporting
`progressSync: false`), enqueue and drain SHALL succeed locally without error and without any remote write.

#### Scenario: Engine carries no server-specific code

- **WHEN** the engine drains the outbox
- **THEN** it reaches the server only through the injected `ProgressSyncStrategy`, with no server-specific logic
  of its own

#### Scenario: No-op strategy keeps the engine working locally

- **WHEN** the active connector's strategy is the local-only / no-op strategy
- **THEN** enqueue and drain complete without error and perform no remote write

### Requirement: Last-synced indicator

The engine SHALL record the timestamp of the last successful drain and SHALL expose it so the UI can render a
"Synced Xm ago" indicator. `library-browse` renders this indicator on the library screen.

#### Scenario: Synced indicator reflects the last successful drain

- **WHEN** a drain completes successfully
- **THEN** the engine updates its last-synced timestamp
- **AND** the library screen shows a "Synced Xm ago" indicator reflecting it, matching the "Synced 2m ago" pill
  in `doc/web/01-library-desktop.png`

### Requirement: End-to-end offline-to-reconnect acceptance

The offline-storage, sync-engine, and progress-sync-strategy capabilities together SHALL satisfy Edda's headline
acceptance: a downloaded book opens and is read with the network cut, progress accrued offline is queued, and on
reconnect the engine reconciles furthest-progression-wins on the server through the Komga strategy. This SHALL be
exercised as an integration test against the throwaway Docker Komga (`test/komga/`, reader `reader@edda.test`).

#### Scenario: Read offline, reconnect, reconcile furthest-wins on the server

- **WHEN** a user opens a downloaded book, moves through it with the network cut, and then reconnects
- **THEN** the progress queued while offline drains to the server
- **AND** the server's read-progress reconciles to the furthest-progressed `Locator` (furthest-progression-wins),
  verified against the Docker Komga server
