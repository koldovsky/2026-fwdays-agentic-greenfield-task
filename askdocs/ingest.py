"""Ingest pipeline: DocSource -> chunk -> embed -> vector store.

The pipeline depends only on the interfaces; concrete implementations are
wired in main(). Run inside the container:

    docker compose run --rm app python -m askdocs.ingest <corpus-dir>
"""

import os
import sys

from askdocs.chunking import chunk_markdown
from askdocs.embeddings import EmbeddingProvider
from askdocs.sources import DocSource
from askdocs.store import VectorStore

DEFAULT_COLLECTION = "askdocs"


def ingest(source: DocSource, embedder: EmbeddingProvider, store: VectorStore) -> int:
    total = 0
    for doc in source.documents():
        chunks = chunk_markdown(doc.source_path, doc.text)
        # Replace the file's chunks wholesale so shrunk files leave no stale points.
        store.delete_by_source(doc.source_path)
        if chunks:
            vectors = embedder.embed([chunk.text for chunk in chunks])
            store.upsert(chunks, vectors)
        total += len(chunks)
    return total


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        print("usage: python -m askdocs.ingest <corpus-dir>", file=sys.stderr)
        return 2

    from askdocs.embeddings import SentenceTransformersProvider
    from askdocs.sources import LocalMarkdownSource
    from askdocs.store import QdrantStore

    embedder = SentenceTransformersProvider()
    store = QdrantStore(
        url=os.environ.get("QDRANT_URL", "http://localhost:6333"),
        collection=os.environ.get("ASKDOCS_COLLECTION", DEFAULT_COLLECTION),
        dimension=embedder.dimension,
    )
    total = ingest(LocalMarkdownSource(argv[0]), embedder, store)
    print(f"Ingested {total} chunks from {argv[0]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
