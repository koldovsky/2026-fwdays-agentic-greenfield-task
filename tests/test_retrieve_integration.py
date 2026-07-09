"""Integration: retrieval against real qdrant with the fixture corpus."""

from pathlib import Path

import pytest

from askdocs.ingest import ingest
from askdocs.retriever import VectorRetriever
from askdocs.sources import LocalMarkdownSource

CORPUS_DIR = Path(__file__).parent / "corpus"


@pytest.fixture
def retriever(clean_store, embedder):
    ingest(LocalMarkdownSource(CORPUS_DIR), embedder, clean_store)
    return VectorRetriever(embedder, clean_store)


@pytest.mark.parametrize(
    ("question", "expected_source"),
    [
        ("Який сорт кавової гущі заборонений як паливо?", "dvyhun/palyvo.md"),
        ("Як запустити калібрування роторів через hushcal?", "dvyhun/kalibruvannya.md"),
        ("При якому вітрі заборонені польоти?", "bezpeka.md"),
    ],
)
def test_question_retrieves_chunk_from_known_file(retriever, question, expected_source):
    chunks = retriever.retrieve(question, k=5)

    assert expected_source in {c.source_path for c in chunks}
    for chunk in chunks:
        assert chunk.text
        assert chunk.source_path
        assert chunk.heading
        assert isinstance(chunk.chunk_index, int)
        assert isinstance(chunk.score, float)


def test_out_of_corpus_question_still_returns_scored_chunks(retriever):
    chunks = retriever.retrieve("Який рецепт борщу з квасолею?", k=5)

    assert 0 < len(chunks) <= 5
    assert all(isinstance(c.score, float) for c in chunks)
