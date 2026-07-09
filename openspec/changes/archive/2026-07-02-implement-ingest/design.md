# implement-ingest — design

## Context

Fresh repository: only `openspec/` exists, no application code. This change bootstraps the askdocs codebase with its first capability, ingest, implementing PRD requirements FR-001–FR-004 under constraints TC-001–TC-006 (see `docs/prd.md`). Constraints from `openspec/project.md`:

- Everything runs in Docker via docker-compose; host Python stays untouched.
- Vector store is a separate service in docker-compose (not embedded).
- `DocSource`, `Retriever`, `LLMProvider` are mandatory interfaces; code above them must not know the concrete implementation. Ingest touches `DocSource` and the embedding/vector-store layer; `Retriever` and `LLMProvider` come in later changes.
- Test corpus is the fictional "ГущоЛіт" domain, so correct behavior is only demonstrable from the corpus.

## Goals / Non-Goals

**Goals:**

- `docker compose run --rm app python -m askdocs.ingest <path>` loads local `.md` files, chunks, embeds, and upserts them into the vector store with source metadata sufficient for later citation (file path + heading).
- Idempotent re-ingest: same corpus twice → same set of stored chunks, no duplicates.
- Green tests inside the container, including idempotency tests against a clean store state.

**Non-Goals:**

- Retrieval, answering, CLI chat — separate future changes.
- Rerankers, knowledge graphs, agents, multiple providers.
- Watching the filesystem / incremental sync beyond content-hash-based upsert.
- Non-markdown sources.

## Decisions

### D1: Vector store — Qdrant as a separate service

Qdrant runs as its own container (`qdrant/qdrant` image), satisfying the "separate service, not embedded" rule. It has a simple Python client, native upsert-by-ID (key for idempotency), and payload storage for metadata. Alternatives: Chroma in client/server mode (weaker upsert semantics, less stable server API), pgvector (drags in Postgres schema management for no benefit at this scale), Milvus (operationally heavy). The concrete store lives behind a thin `VectorStore` interface (`upsert(chunks)`, `count()`, later `search()`), so this choice is swappable.

### D2: Embeddings — local sentence-transformers inside the app container

Use `sentence-transformers` with `paraphrase-multilingual-MiniLM-L12-v2` (the corpus is Ukrainian, so the model must be multilingual). Behind an `EmbeddingProvider` interface (`embed(texts) -> vectors`). Rationale: no API keys or network in tests, deterministic vectors, free. Alternative — OpenAI/Voyage API embeddings — rejected for v1 because ingest tests would need secrets and mocking, weakening the "green tests" criterion. The model is baked into the app image at build time so `docker compose run` works offline.

### D3: Chunking — structure-aware, block integrity preserved (FR-002)

Chunking is driven by markdown structure, never by a blind character count:

1. Parse each `.md` into a block sequence (headings, paragraphs, tables, fenced code blocks, lists) using a markdown parser (`markdown-it-py`).
2. Group blocks into sections by heading (`#`–`###`); a section is the default chunk.
3. If a section exceeds the size budget (~1500 characters, a soft target), split it **only on block boundaries** — a table, fenced code block, or list item group is never cut in the middle. An atomic block that alone exceeds the budget stays whole as its own chunk (oversize is allowed; integrity beats the budget).
4. Each chunk carries metadata: `source_path` (relative to corpus root), `heading` (nearest heading trail, e.g. `Двигун > Паливна система`), and `chunk_index`.

Alternatives: fixed-size splitting with overlap — rejected, violates FR-002 (cuts tables/code mid-block); token-based splitting — same problem plus a tokenizer dependency. Overlap is unnecessary when boundaries are semantic. This keeps citations meaningful ("file + section").

### D4: Idempotency — deterministic IDs + content hash

Chunk ID = UUID5 of `(source_path, chunk_index)`; payload includes `content_hash` (SHA-256 of chunk text). Ingest upserts by ID, so re-running over an unchanged corpus rewrites identical points — count and content stay stable. Changed files naturally overwrite their chunks. Stale chunks of a shrunk/deleted file are removed by deleting all points for a `source_path` before upserting its new chunks. Alternative — query-then-insert — rejected: racy and slower than native upsert.

### D5: Layout and interfaces

```text
askdocs/
  sources.py    # DocSource interface + LocalMarkdownSource
  chunking.py   # pure functions: markdown -> chunks
  embeddings.py # EmbeddingProvider interface + SentenceTransformersProvider
  store.py      # VectorStore interface + QdrantStore
  ingest.py     # pipeline: DocSource -> chunk -> embed -> upsert; __main__ entry
tests/
  corpus/       # ГущоЛіт fixture .md files
docker-compose.yaml, Dockerfile, requirements.txt
```

The ingest pipeline depends only on the three interfaces, honoring the architectural boundary. `Retriever`/`LLMProvider` interfaces are NOT stubbed here — they belong to their own changes.

### D6: Test strategy — real Qdrant, ephemeral state

Tests run via `docker compose run --rm app pytest` against the real Qdrant service. Cleanliness rule: the test fixture drops/recreates the test collection before each test (teardown-before-run), and the compose file gives Qdrant no named volume, so state is ephemeral by default. Unit tests for chunking are pure and store-free.

## Risks / Trade-offs

- [Multilingual MiniLM quality on synthetic Ukrainian terms may be mediocre] → acceptable for ingest (retrieval quality is judged in the retriever change); interface makes the model swappable.
- [Model download bloats the image / requires network at build] → download in a Dockerfile layer so it is cached; image builds once.
- [Delete-then-upsert per file is not atomic; a crash mid-ingest leaves a file partially indexed] → re-running ingest converges to the correct state; acceptable for v1.
- [An atomic block (huge table/code) can exceed the embedding model's effective input length] → accepted for v1: the block stays whole per FR-002; the embedding truncates its tail, which is tolerable for retrieval of section-level facts.

## Open Questions

- None blocking. Embedding dimension (384 for MiniLM-L12-v2) is fixed at collection creation; changing models later requires re-ingest, which is acceptable.
