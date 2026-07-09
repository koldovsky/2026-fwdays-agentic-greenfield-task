# implement-retrieve — tasks

## 1. Vector store search

- [x] 1.1 Add `search(vector, limit) -> list[tuple[payload, score]]` to the `VectorStore` interface and implement it in `QdrantStore` (cosine similarity, payload included)

## 2. Retriever

- [x] 2.1 Implement `askdocs/retriever.py`: `RetrievedChunk` dataclass, `Retriever` interface (`retrieve(question, k=5)`), and `VectorRetriever(embedder, store)` mapping store results to `RetrievedChunk`
- [x] 2.2 Unit test `VectorRetriever` with fake `EmbeddingProvider`/`VectorStore`: results mapped to `RetrievedChunk` with correct fields and order

## 3. Integration tests

- [x] 3.1 Integration test: ingest fixture corpus, ask 3+ questions with known source files (fuel sorts → `dvyhun/palyvo.md`, calibration → `dvyhun/kalibruvannya.md`, weather limits → `bezpeka.md`), assert a chunk from the right file is in top-5 with citation metadata and score
- [x] 3.2 Integration test: out-of-corpus question against non-empty store still returns up to k scored chunks (no filtering, no error)

## 4. Done criteria

- [x] 4.1 Full suite green via `docker compose run --rm app pytest` (existing ingest tests still pass)
