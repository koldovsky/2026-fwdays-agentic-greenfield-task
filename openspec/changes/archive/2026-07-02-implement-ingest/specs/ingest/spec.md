# ingest — spec

## ADDED Requirements

### Requirement: Ingest loads local markdown corpus through DocSource

The system SHALL provide an ingest command, runnable inside the app container, that loads documents exclusively through the `DocSource` interface. The v1 implementation SHALL read all `.md` files under a given corpus directory recursively. Files that are not `.md` SHALL be ignored.

#### Scenario: Markdown files are discovered recursively

- **WHEN** ingest runs against a corpus directory containing `.md` files in nested subdirectories
- **THEN** every `.md` file under the directory is ingested and every non-`.md` file is skipped

#### Scenario: Empty corpus

- **WHEN** ingest runs against a directory with no `.md` files
- **THEN** the command completes successfully and the vector store contains zero chunks for that corpus

### Requirement: Chunking preserves structural block integrity

The system SHALL split documents along markdown structure (headings, paragraphs, tables, fenced code blocks, lists) and MUST NOT split blindly by character count. A table, fenced code block, or list group SHALL never be cut in the middle: when a section exceeds the size budget, it SHALL be split only on block boundaries, and an atomic block larger than the budget SHALL remain whole as a single chunk.

#### Scenario: Table stays intact

- **WHEN** a document containing a markdown table is ingested
- **THEN** the entire table appears within exactly one chunk, never split across chunks

#### Scenario: Code block stays intact

- **WHEN** a document containing a fenced code block is ingested
- **THEN** the entire code block appears within exactly one chunk

#### Scenario: Oversized section splits on block boundaries

- **WHEN** a section exceeds the size budget
- **THEN** it is stored as multiple chunks whose boundaries coincide with block boundaries and which together cover the section's full text

### Requirement: Chunks are stored with source metadata

The system SHALL store each chunk in the vector store with an embedding vector and metadata containing at minimum: the source file path relative to the corpus root, the nearest heading trail, and the chunk index within the file. This metadata MUST be sufficient for later answers to cite their source.

#### Scenario: Chunk carries source path and heading

- **WHEN** a `.md` file with headings is ingested
- **THEN** every stored chunk's metadata contains the file's relative path, a heading trail for the section the chunk came from, and the chunk's index

### Requirement: Ingest is idempotent

Re-running ingest over an unchanged corpus SHALL leave the vector store with the same set of chunks: no duplicates, same count, same content. When a source file changes, its chunks SHALL be replaced; chunks of sections that no longer exist SHALL NOT remain in the store.

#### Scenario: Re-ingest of unchanged corpus

- **WHEN** ingest runs twice in a row over the same corpus, starting from a clean vector store
- **THEN** the chunk count and chunk contents in the store after the second run equal those after the first run

#### Scenario: Shrunk file leaves no stale chunks

- **WHEN** a file is ingested, then edited so it produces fewer chunks, then ingest runs again
- **THEN** the store contains only the chunks of the new version of the file

### Requirement: Vector store runs as a separate service

The vector store SHALL run as its own docker-compose service, separate from the `app` service. The application SHALL access it only through the `VectorStore` interface over the network; no embedded/in-process vector store is permitted.

#### Scenario: Ingest against the compose vector store service

- **WHEN** `docker compose run --rm app` executes ingest
- **THEN** chunks are persisted in the vector store service's collection and are readable via the store's API

### Requirement: Ingest tests run in the container against clean store state

Ingest tests, including idempotency tests, SHALL be runnable via `docker compose run --rm app pytest` and SHALL execute against a clean vector store state, resetting the test collection before each test so results do not depend on prior runs.

#### Scenario: Idempotency test starts clean

- **WHEN** the idempotency test suite runs twice in a row
- **THEN** both runs pass, because each test resets its collection before executing
