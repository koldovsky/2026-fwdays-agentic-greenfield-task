"""Unit tests for VectorRetriever over fake interfaces."""

from askdocs.embeddings import EmbeddingProvider
from askdocs.retriever import RetrievedChunk, VectorRetriever
from askdocs.store import VectorStore


class FakeEmbedder(EmbeddingProvider):
    def embed(self, texts):
        return [[1.0, 0.0] for _ in texts]

    @property
    def dimension(self):
        return 2


class FakeStore(VectorStore):
    def __init__(self, results):
        self.results = results
        self.seen = None

    def upsert(self, chunks, vectors): ...

    def delete_by_source(self, source_path): ...

    def count(self):
        return len(self.results)

    def get_all(self):
        return []

    def search(self, vector, limit):
        self.seen = (vector, limit)
        return self.results[:limit]


def _payload(i):
    return {
        "text": f"текст {i}",
        "source_path": f"file{i}.md",
        "heading": f"Розділ {i}",
        "chunk_index": i,
        "content_hash": "x",
    }


def test_maps_store_results_to_retrieved_chunks_in_order():
    store = FakeStore([(_payload(0), 0.9), (_payload(1), 0.5)])
    retriever = VectorRetriever(FakeEmbedder(), store)

    chunks = retriever.retrieve("питання", k=2)

    assert chunks == [
        RetrievedChunk("текст 0", "file0.md", "Розділ 0", 0, 0.9),
        RetrievedChunk("текст 1", "file1.md", "Розділ 1", 1, 0.5),
    ]
    assert store.seen == ([1.0, 0.0], 2)
