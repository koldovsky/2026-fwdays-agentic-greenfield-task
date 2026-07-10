# Spec: Progress Sync Strategy

## Purpose

The `ProgressSyncStrategy` is the per-connector seam that decouples the server-neutral sync engine
from server-specific read-progress protocols. `core/contracts` defines the interface; each connector
provides an implementation that maps the server's native progress model to and from the
platform-neutral `Locator`. The Komga implementation maps Komga's coarse page/completed model to a
`Locator`, including a `{page}`→400→`{completed}` fallback for non-Divina EPUBs. Sourced from change
`add-offline-and-sync`.

## Requirements

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

### Requirement: Komga 400-fallback for non-Divina EPUBs

The Komga strategy's `setProgress` SHALL first attempt a page-based PATCH `{page, completed}`. When Komga
returns **400** for a non-Divina EPUB (the server rejects `{page}` for this format), the strategy SHALL retry
with `{completed}`-only and succeed. This fallback ensures EPUBs that cannot carry a 1-based page position still
have their completion state recorded.

#### Scenario: Non-Divina EPUB falls back to completed-only on 400

- **WHEN** `setProgress` is called for an EPUB book and Komga returns 400 on the page-based PATCH
- **THEN** the strategy retries the PATCH with `{completed}` only
- **AND** the request succeeds, recording the completion state on the server
