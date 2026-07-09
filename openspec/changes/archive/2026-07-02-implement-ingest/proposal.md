# implement-ingest — proposal

## Why

askdocs must answer questions strictly from a local `.md` corpus, but nothing exists yet to get documents into a searchable form. Ingest is the first capability: without it there is nothing for retrieval or answering to build on. This change implements PRD requirements FR-001–FR-004 (see `docs/prd.md`), under constraints TC-001–TC-006.

## What Changes

- New `ingest` command that reads local `.md` files, chunks them, embeds the chunks, and stores them in the vector store with source metadata (file path, heading/position) so answers can cite sources later (FR-001, FR-003).
- Chunking preserves the integrity of structural blocks — tables, code blocks, sections are never blindly split by a character count (FR-002).
- Introduce the `DocSource` interface with a v1 implementation for local `.md` files.
- Introduce the embedding provider and vector store behind interfaces; concrete choices are made in design.md.
- Ingest is idempotent: re-running against the same corpus does not create duplicate chunks in the store (FR-004).
- Docker-compose environment: `app` service (Python + askdocs code) and a separate vector store service. All runs (`ingest`, `pytest`) happen inside the container.
- Tests for ingest, including idempotency tests that run against a clean vector store state (ephemeral volume or teardown before the run).

## Capabilities

### New Capabilities

- `ingest`: Load documents from a `DocSource` (v1: local `.md` files), chunk them preserving structural blocks, embed them, and persist them to the vector store with source metadata, idempotently. Covers PRD FR-001–FR-004.

### Modified Capabilities

<!-- none: this is the first capability; no existing specs -->

## Impact

- New codebase: askdocs Python package with `DocSource` interface, chunking, embedding client, vector store client, and `ingest` entrypoint.
- New infrastructure: `docker-compose.yaml` with `app` and vector store services; Dockerfile for `app`. Host Python stays untouched.
- New test suite run via `docker compose run --rm app pytest`.
- Test corpus: fictional "ГущоЛіт" `.md` documents used as fixtures.
- Downstream: retrieval and answering capabilities (separate future changes) will depend on the stored chunks and their metadata format.
