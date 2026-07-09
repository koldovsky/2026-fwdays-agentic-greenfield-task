# sync

## Purpose

Continuously reconcile a mounted `.md` directory with the vector store: added, changed, and deleted files are reflected automatically via a poll-and-diff watch loop. Covers PRD FR-060.

## Requirements

### Requirement: Continuous reconciliation of the mounted directory

The system SHALL provide a sync operation that reconciles a mounted `.md` directory with the vector store, and a watch loop that repeats it at a configurable interval. After a reconciliation pass, the set of stored chunks SHALL correspond to the current on-disk `.md` files.

#### Scenario: New file is indexed

- **WHEN** a new `.md` file appears in the directory and a reconciliation pass runs
- **THEN** the store contains chunks for that file with its source path

#### Scenario: Watch loop repeats reconciliation

- **WHEN** the watch loop runs
- **THEN** it performs reconciliation passes at the configured interval

### Requirement: Edited files are re-indexed, deletions are removed

When a file changes, its chunks SHALL be replaced to match the new content. When a file is deleted from disk, its chunks SHALL be removed from the store so answers no longer cite content that no longer exists.

#### Scenario: Edited file is updated

- **WHEN** an already-indexed file is edited and a reconciliation pass runs
- **THEN** the store reflects the new content and contains no chunks from the previous version

#### Scenario: Deleted file leaves no chunks

- **WHEN** an indexed file is deleted from disk and a reconciliation pass runs
- **THEN** the store contains no chunks for that file

### Requirement: Unchanged files are not re-embedded

A reconciliation pass over an unchanged directory SHALL NOT re-embed or duplicate content; it MUST be idempotent with respect to the store.

#### Scenario: No-op pass changes nothing

- **WHEN** a reconciliation pass runs twice over an unchanged directory
- **THEN** the second pass reports no additions, updates, or deletions and the stored chunks are unchanged

### Requirement: Watcher is resilient to transient failures and bad config

The sync watch loop SHALL survive a failed reconciliation pass — logging it and continuing — so continuous sync is not silently killed by a transient error. Invalid interval configuration SHALL fall back to the default rather than crashing startup.

#### Scenario: A failed pass does not stop the watcher

- **WHEN** a reconciliation pass raises an error during the watch loop
- **THEN** the error is logged and the loop continues with subsequent passes

#### Scenario: Invalid interval falls back to default

- **WHEN** the configured sync interval is non-numeric or not positive
- **THEN** the watcher uses the default interval instead of failing to start
