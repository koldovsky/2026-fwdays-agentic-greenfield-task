"""End-to-end smoke: retriever + real LLM (LM Studio on the host).

Proves the wiring only; pipeline logic is covered by fakes in test_answer.py.
Skips automatically when the LLM endpoint is unreachable, so the suite stays
green on machines without LM Studio.
"""

from pathlib import Path

import pytest
from conftest import llm_available

from askdocs.answer import answer_question
from askdocs.ingest import ingest
from askdocs.llm import OpenAICompatibleProvider
from askdocs.retriever import VectorRetriever
from askdocs.sources import LocalMarkdownSource

CORPUS_DIR = Path(__file__).parent / "corpus"

pytestmark = pytest.mark.skipif(not llm_available(), reason="LLM endpoint unreachable")


@pytest.fixture
def retriever(clean_store, embedder):
    ingest(LocalMarkdownSource(CORPUS_DIR), embedder, clean_store)
    return VectorRetriever(embedder, clean_store)


def test_corpus_question_answered_with_source(retriever):
    answer = answer_question(
        "Який сорт кавової гущі заборонений як паливо?", retriever, OpenAICompatibleProvider()
    )

    assert answer.found
    assert answer.text
    assert "dvyhun/palyvo.md" in answer.sources


def test_out_of_corpus_question_refused(retriever):
    answer = answer_question(
        "Хто виграв чемпіонат світу з футболу 2022 року?", retriever, OpenAICompatibleProvider()
    )

    assert not answer.found
    assert answer.sources == []
