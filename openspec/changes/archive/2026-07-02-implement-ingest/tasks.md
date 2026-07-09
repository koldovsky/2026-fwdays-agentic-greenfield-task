# implement-ingest — tasks

## 1. Docker environment

- [x] 1.1 Create `requirements.txt` (sentence-transformers, qdrant-client, markdown-it-py, pytest) and `Dockerfile` for the `app` service that pre-downloads the `paraphrase-multilingual-MiniLM-L12-v2` model at build time
- [x] 1.2 Create `docker-compose.yaml` with `app` and `qdrant` services; no named volume for qdrant (ephemeral state); qdrant URL passed to app via environment variable
- [x] 1.3 Verify `docker compose build` succeeds and `docker compose run --rm app python -c "import askdocs"` works (add empty `askdocs/` package)

## 2. Test corpus

- [x] 2.1 Create ГущоЛіт fixture corpus in `tests/corpus/`: 3–5 `.md` files with nested subdirectory, headings, a markdown table, a fenced code block, one section long enough to force block-boundary splitting, and one non-`.md` file to be ignored

## 3. Chunking and DocSource

- [x] 3.1 Implement `askdocs/sources.py`: `DocSource` interface and `LocalMarkdownSource` (recursive `.md` discovery, relative paths); unit tests
- [x] 3.2 Implement `askdocs/chunking.py`: structure-aware splitting via markdown-it-py (sections by heading with heading trail; oversized sections split only on block boundaries; tables/code blocks/list groups never cut; chunk index per file); unit tests: table intact, code block intact, block-boundary split of oversized section

## 4. Embeddings and vector store

- [x] 4.1 Implement `askdocs/embeddings.py`: `EmbeddingProvider` interface and `SentenceTransformersProvider`; unit test asserting vector dimension (384)
- [x] 4.2 Implement `askdocs/store.py`: `VectorStore` interface (`upsert`, `delete_by_source`, `count`, `get_all`) and `QdrantStore` with UUID5 chunk IDs and payload metadata (`source_path`, `heading`, `chunk_index`, `content_hash`)

## 5. Ingest pipeline

- [x] 5.1 Implement `askdocs/ingest.py`: pipeline over the interfaces (source → chunk → embed → delete-by-source → upsert) with `python -m askdocs.ingest <corpus-dir>` entrypoint
- [x] 5.2 Integration test: ingest fixture corpus against qdrant service, assert chunks exist with correct metadata (relative path, heading trail, chunk index) and non-`.md`/empty-corpus behavior

## 6. Idempotency

- [x] 6.1 Pytest fixture that drops/recreates the test collection before each store-backed test
- [x] 6.2 Idempotency test: ingest twice from clean state, assert equal count and content after both runs
- [x] 6.3 Stale-chunk test: ingest, shrink a file (fewer chunks), re-ingest, assert only new version's chunks remain

## 7. Done criteria

- [x] 7.1 Full suite green via `docker compose run --rm app pytest`; nothing installed in host Python
