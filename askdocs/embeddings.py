"""EmbeddingProvider interface and the v1 sentence-transformers implementation."""

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Interface: "turn texts into vectors"."""

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]: ...

    @property
    @abstractmethod
    def dimension(self) -> int: ...


class SentenceTransformersProvider(EmbeddingProvider):
    MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

    def __init__(self):
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(self.MODEL_NAME)

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [vector.tolist() for vector in self._model.encode(texts)]

    @property
    def dimension(self) -> int:
        return self._model.get_embedding_dimension()
