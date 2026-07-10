## ADDED Requirements

### Requirement: Platform-neutral ProgressSyncStrategy interface

`core/contracts` SHALL define a `ProgressSyncStrategy` interface with
`getProgress(ref: BookRef): Promise<Locator | undefined>` and `setProgress(ref: BookRef, locator: Locator):
Promise<void>`, carrying no DOM, `fetch`, or `window` types so the future native client can re-express it.
`BookRef` carries the `(sourceId, bookId, mediaType)` progress key. The `Locator` exchanged SHALL serialize and
deserialize without loss so the same sync protocol is shared across web and native.

#### Scenario: Interface is platform-neutral

- **WHEN** the `ProgressSyncStrategy` interface is inspected
- **THEN** it references only platform-neutral model types (`BookRef`, `Locator`) and no DOM / `fetch` / `window`
  types

#### Scenario: Locator round-trips through serialization

- **WHEN** a `Locator` is serialized and then deserialized
- **THEN** the result is structurally equal to the original, so web and native exchange the identical shape

### Requirement: Komga native read-progress maps to and from Locator

`connector-komga` SHALL provide a `ProgressSyncStrategy` that reads and writes Komga's native read-progress and
maps it to and from a `Locator`. Writing a `Locator` via `setProgress` then reading it via `getProgress` SHALL
round-trip the reading position. This SHALL be integration-tested against the Docker Komga (`test/komga/`) as the
least-privilege reader `reader@edda.test`.

#### Scenario: Komga read-progress round-trips through the strategy

- **WHEN** a `Locator` is written via the Komga strategy's `setProgress` and then read back via `getProgress`
- **THEN** the returned `Locator` reflects the same reading position, verified against the Docker Komga server
  (reader `reader@edda.test`)

### Requirement: Capability gating and no-op strategy

A connector SHALL provide a working `ProgressSyncStrategy` only when its `progressSync` capability is true. A
connector with `progressSync: false` SHALL provide a local-only / no-op strategy whose `getProgress` returns
`undefined` and whose `setProgress` performs no remote write and does not error.

#### Scenario: No-op strategy for a connector without progress sync

- **WHEN** a connector reporting `progressSync: false` provides its strategy
- **THEN** `getProgress` returns `undefined`
- **AND** `setProgress` completes without a remote write or error, so progress stays local-only

### Requirement: Remote progress is read through the strategy for furthest-wins

The Komga strategy SHALL surface the server's current read-progress via `getProgress` so the sync engine can
read-before-write for furthest-progression-wins. When the server holds a position further than the local one,
`getProgress` SHALL return that further `Locator` so the engine keeps it. This SHALL be integration-tested
against the Docker Komga.

#### Scenario: Strategy surfaces a further remote position for reconciliation

- **WHEN** the Komga server holds read-progress further than the local position and the engine reads it via the
  strategy
- **THEN** `getProgress` returns the further remote `Locator`
- **AND** furthest-progression-wins (driven by the engine) keeps that remote position, verified against the
  Docker Komga server
