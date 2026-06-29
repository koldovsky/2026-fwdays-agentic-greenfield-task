# C1 — Storage I/O

**OpenSpec change:** `add-storage-io`
**Owner:** `lib/content/fs-utils.ts`, `lib/content/paths.ts`
**Depends on:** — (foundation)
**Maps to:** requirements.md §2.1, §4 (atomic write, fs isolation)

## Purpose
The only module that touches the filesystem with low-level primitives: atomic file
writes, tolerant reads, and directory listings. Everything above it works through
these so the rest of the app never calls `node:fs` directly.

## Requirements

### Requirement: Atomic file writes
The system SHALL write files atomically so a crash mid-write never leaves a partial file.

#### Scenario: Write creates parent directories and the file
- **WHEN** writing to a path whose parent directories do not exist
- **THEN** the parents are created and the file contains exactly the given contents

#### Scenario: Write leaves no temp artifacts
- **WHEN** a write completes
- **THEN** only the target file exists (temp file was renamed over the target)

### Requirement: Tolerant reads
The system SHALL return a caller-provided fallback when a file is absent, and rethrow other errors.

#### Scenario: Missing file returns fallback
- **WHEN** reading a path that does not exist
- **THEN** the fallback value is returned (no throw)

### Requirement: Directory listing
The system SHALL list immediate subdirectories and files-by-extension, returning an empty list for a missing directory.

#### Scenario: Listing a missing directory
- **WHEN** listing a directory that does not exist
- **THEN** an empty array is returned

### Requirement: Configurable content root
The content root SHALL resolve from `BOOKSHELF_CONTENT_DIR`, falling back to `<cwd>/content`.

#### Scenario: Env override
- **WHEN** `BOOKSHELF_CONTENT_DIR` is set
- **THEN** all content paths resolve under it
