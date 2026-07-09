"""Golden-set validity + retrieval and anti-hallucination eval gates."""

from pathlib import Path

import pytest
from conftest import llm_available

from askdocs.eval import hallucination_report, load_golden, retrieval_report
from askdocs.ingest import ingest
from askdocs.llm import OpenAICompatibleProvider
from askdocs.retriever import VectorRetriever
from askdocs.sources import LocalMarkdownSource

CORPUS_DIR = Path(__file__).parent / "corpus"
RETRIEVAL_THRESHOLD = 0.8
REFUSAL_THRESHOLD = 0.8


def test_golden_set_is_well_formed():
    golden = load_golden()

    assert 20 <= len(golden) <= 30
    for entry in golden:
        assert entry.question
        if entry.in_corpus:
            assert entry.source, f"in-corpus питання без source: {entry.question}"
            assert (CORPUS_DIR / entry.source).exists(), f"немає файлу {entry.source}"
        else:
            assert entry.source is None


@pytest.fixture
def retriever(clean_store, embedder):
    ingest(LocalMarkdownSource(CORPUS_DIR), embedder, clean_store)
    return VectorRetriever(embedder, clean_store)


def test_retrieval_hit_rate_meets_threshold(retriever):
    report = retrieval_report(retriever)

    assert report.rate >= RETRIEVAL_THRESHOLD, "\n" + report.format()


@pytest.mark.skipif(not llm_available(), reason="LLM endpoint unreachable")
def test_anti_hallucination_refusal_rate_meets_threshold(retriever):
    report = hallucination_report(retriever, OpenAICompatibleProvider())

    assert report.rate >= REFUSAL_THRESHOLD, "\n" + report.format()
