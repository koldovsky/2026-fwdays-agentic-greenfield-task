"""Retriever interface and the v1 vector implementation."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from askdocs.embeddings import EmbeddingProvider
from askdocs.store import VectorStore

DEFAULT_TOP_K = 5


@dataclass(frozen=True)
class RetrievedChunk:
    text: str
    source_path: str
    heading: str
    chunk_index: int
    score: float


class Retriever(ABC):
    """Interface: "find chunks relevant to a question"."""

    @abstractmethod
    def retrieve(self, question: str, k: int = DEFAULT_TOP_K) -> list[RetrievedChunk]: ...


class VectorRetriever(Retriever):
    """Embeds the question with the same provider used at ingest and
    searches the vector store. Returns top-k with scores; deciding whether
    the context is good enough is the answer layer's job."""

    def __init__(self, embedder: EmbeddingProvider, store: VectorStore):
        self._embedder = embedder
        self._store = store

    def retrieve(self, question: str, k: int = DEFAULT_TOP_K) -> list[RetrievedChunk]:
        [vector] = self._embedder.embed([question])
        return [
            RetrievedChunk(
                text=payload["text"],
                source_path=payload["source_path"],
                heading=payload["heading"],
                chunk_index=payload["chunk_index"],
                score=score,
            )
            for payload, score in self._store.search(vector, limit=k)
        ]
