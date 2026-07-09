# implement-retrieve — design

## Context

Ingest is shipped: qdrant holds chunks with payload (`source_path`, `heading`, `chunk_index`, `content_hash`, `text`), embedded with `paraphrase-multilingual-MiniLM-L12-v2` (384-dim, cosine distance). This change adds the read path: `Retriever` interface (PRD TC-002) with a vector implementation (FR-010). Same Docker constraints as before: everything runs in the container.

## Goals / Non-Goals

**Goals:**

- `Retriever` interface: `retrieve(question, k) -> list[RetrievedChunk]`, where a `RetrievedChunk` carries text, source metadata, and score.
- `VectorRetriever` over `EmbeddingProvider` + `VectorStore.search`, symmetric with ingest (same model, same collection).
- Smoke-level quality tests on the fixture corpus (full metrics belong to `implement-eval`).

**Non-Goals:**

- Answer generation, CLI, eval metrics — later changes.
- Reranking, hybrid/BM25 search, graph retrieval (PRD FR-101, proposed).
- Score-threshold filtering / "no relevant context" decision — that judgment call belongs to the answer capability, which sees the scores.

## Decisions

### D1: Retriever returns chunks with scores, decides nothing

`VectorRetriever` always returns top-k (default k=5) with cosine similarity scores; it does not filter by threshold. Rationale: whether the context is "good enough" is an answer-layer concern (FR-021 honest "not in corpus"); baking a threshold into retrieval would hide information from the layer that must make that call. Alternative — thresholding in the retriever — rejected as premature and untunable before eval exists.

### D2: `RetrievedChunk` is a plain dataclass, not a qdrant type

`retriever.py` defines `RetrievedChunk(text, source_path, heading, chunk_index, score)`. Qdrant types stay inside `store.py`: `VectorStore.search(vector, limit)` returns `(payload, score)` tuples, and the retriever maps them. This keeps the interface boundary clean (TC-002) — swapping qdrant or the retrieval strategy touches one module.

### D3: Query embedding reuses the ingest `EmbeddingProvider`

The question is embedded by the same provider instance/model as the chunks — a hard correctness requirement for vector search (same space, same dimension). The retriever takes the provider via constructor injection, like the ingest pipeline does; no globals.

### D4: Test strategy — deterministic smoke tests, not quality metrics

Integration tests ingest the fixture corpus, then ask questions whose answers live in exactly one known file (e.g. "Який сорт гущі заборонений?" → `dvyhun/palyvo.md`) and assert a chunk from that file is in the top-k. Chosen questions use distinctive corpus vocabulary so multilingual-MiniLM ranks them reliably; flaky near-miss questions belong to eval (FR-041), not here. Unit test: `VectorRetriever` maps store results to `RetrievedChunk` correctly (fake store/provider — the interfaces make this trivial).

## Risks / Trade-offs

- [Multilingual MiniLM may rank Ukrainian synthetic terms poorly, flaking smoke tests] → use questions with strong lexical anchors from the corpus; if a test still flakes, loosen to k=5 membership, not rank-1.
- [No threshold means the retriever returns something even for out-of-corpus questions] → intentional (D1); the answer layer handles it, and eval (FR-042) will verify the end-to-end behavior.
- [k fixed at call time, untuned] → default k=5 is a placeholder; eval change will tune it with data.

## Open Questions

- None blocking.
