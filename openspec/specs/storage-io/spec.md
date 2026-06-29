# storage-io Specification

## Purpose
Low-level filesystem primitives: atomic writes, tolerant reads, and directory listings.
## Requirements
### Requirement: Atomic file writes
The system SHALL write files atomically so that a crash mid-write never leaves a partial
file: it MUST write to a temporary file in the target's directory and then rename it
over the target. It MUST create missing parent directories first.

#### Scenario: Write creates parent directories and the file
- **WHEN** writing to a path whose parent directories do not exist
- **THEN** the parent directories are created and the file contains exactly the given contents

#### Scenario: Write overwrites an existing file
- **WHEN** writing to a path that already has contents
- **THEN** the file's contents are replaced with the new contents

#### Scenario: Write leaves no temporary artifacts
- **WHEN** a write completes
- **THEN** only the target file exists in the directory (the temp file was renamed away)

### Requirement: Tolerant reads
The system SHALL return a caller-provided fallback value when a file is absent, and MUST
rethrow any other error.

#### Scenario: Missing file returns the fallback
- **WHEN** reading a path that does not exist
- **THEN** the provided fallback value is returned and no error is thrown

#### Scenario: Existing file returns its contents
- **WHEN** reading a path that exists
- **THEN** the file's text contents are returned

### Requirement: Directory listing
The system SHALL list immediate subdirectories and files filtered by extension, and MUST
return an empty list when the directory does not exist.

#### Scenario: Listing a missing directory
- **WHEN** listing subdirectories or files of a directory that does not exist
- **THEN** an empty list is returned (no error)

#### Scenario: Listing filters by kind
- **WHEN** a directory contains both subdirectories and files
- **THEN** the subdirectory listing returns only directories and the file listing returns only files matching the requested extension

### Requirement: Configurable content root
The content root SHALL resolve from the `BOOKSHELF_CONTENT_DIR` environment variable,
falling back to `<cwd>/content`. All per-book and per-note paths MUST derive from it.

#### Scenario: Environment override
- **WHEN** `BOOKSHELF_CONTENT_DIR` is set
- **THEN** the content root and all book/note paths resolve underneath it

#### Scenario: Default root
- **WHEN** `BOOKSHELF_CONTENT_DIR` is not set
- **THEN** the content root is `<cwd>/content`

