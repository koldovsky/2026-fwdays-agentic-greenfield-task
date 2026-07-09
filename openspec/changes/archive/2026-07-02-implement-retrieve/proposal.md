# implement-retrieve — proposal

## Why

Chunks of the ГущоЛіт corpus are now stored in qdrant (change `implement-ingest`), but nothing can search them. Retrieve is the bridge between ingest and answering: PRD FR-010 — a question in, relevant chunks out. Without it the answer capability (FR-020+) has no context to work with.

## What Changes

- New `Retriever` interface (PRD TC-002): "find what's relevant for a question". Code above it must not know the concrete implementation.
- v1 implementation: vector retrieval — embed the question with the same `EmbeddingProvider` used at ingest, run similarity search in the vector store, return top-k chunks with their source metadata (`source_path`, `heading`, `chunk_index`, `text`) and similarity score.
- `VectorStore` interface gains a `search(vector, limit)` method; `QdrantStore` implements it.
- Retrieval quality smoke tests against the fixture corpus: questions with known source files must retrieve a chunk from the right file in top-k.

## Capabilities

### New Capabilities

- `retrieve`: Given a user question, return the most relevant chunks from the vector store with source metadata and scores. Covers PRD FR-010.

### Modified Capabilities

<!-- none: ingest requirements are unchanged; VectorStore.search is an implementation-level addition, not a spec change to ingest -->

## Impact

- New code: `askdocs/retriever.py` (`Retriever` interface + `VectorRetriever`); `search()` added to `askdocs/store.py`.
- No infrastructure changes: same docker-compose services, same embedding model, same collection.
- Tests: integration tests against qdrant reusing the ГущоЛіт fixture corpus and the clean-store fixture.
- Downstream: `implement-answer` will consume `Retriever` output as LLM context.
