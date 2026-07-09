"""Unit tests for the answer pipeline with fake Retriever/LLMProvider."""

from askdocs.answer import ERROR_TEXT, NO_ANSWER_MARKER, REFUSAL_TEXT, answer_question
from askdocs.llm import LLMError, LLMProvider
from askdocs.retriever import RetrievedChunk, Retriever


class FakeRetriever(Retriever):
    def __init__(self, chunks):
        self.chunks = chunks

    def retrieve(self, question, k=5):
        return self.chunks[:k]


class ScriptedLLM(LLMProvider):
    def __init__(self, reply):
        self.reply = reply
        self.prompts = None

    def complete(self, system, user):
        self.prompts = (system, user)
        return self.reply


def _chunk(i, source):
    return RetrievedChunk(f"текст {i}", source, f"Розділ {i}", i, 0.9 - i / 10)


CHUNKS = [_chunk(0, "a.md"), _chunk(1, "b.md"), _chunk(2, "a.md")]


def test_cited_answer_maps_citations_to_source_files():
    llm = ScriptedLLM("Гуща арабіки [2], а також [3].")
    answer = answer_question("питання?", FakeRetriever(CHUNKS), llm)

    assert answer.found
    assert answer.text == "Гуща арабіки [2], а також [3]."
    assert answer.sources == ["b.md", "a.md"]  # cited fragments only, deduped


def test_context_prompt_contains_numbered_fragments_and_sources():
    llm = ScriptedLLM("Відповідь [1].")
    answer_question("питання?", FakeRetriever(CHUNKS), llm)

    _, user = llm.prompts
    assert "[1] джерело: a.md (Розділ 0)" in user
    assert "[2] джерело: b.md (Розділ 1)" in user
    assert "питання?" in user


class FailingLLM(LLMProvider):
    def complete(self, system, user):
        raise LLMError("connect error до http://secret-endpoint:1234 (model=internal)")


def test_llm_failure_returns_controlled_error_not_refusal():
    answer = answer_question("питання?", FakeRetriever(CHUNKS), FailingLLM())

    assert answer.error is True
    assert answer.found is False
    assert answer.sources == []
    assert answer.text == ERROR_TEXT  # stable user-facing text
    assert answer.text != REFUSAL_TEXT  # an outage is not an honest refusal


def test_llm_error_details_do_not_leak_into_answer():
    answer = answer_question("питання?", FakeRetriever(CHUNKS), FailingLLM())

    assert "secret-endpoint" not in answer.text
    assert "model=internal" not in answer.text


def test_no_answer_marker_with_trailing_punctuation_is_refusal():
    answer = answer_question("питання?", FakeRetriever(CHUNKS), ScriptedLLM("NO_ANSWER."))

    assert not answer.found
    assert answer.text == REFUSAL_TEXT


def test_answer_that_merely_mentions_marker_is_not_a_refusal():
    llm = ScriptedLLM("Про режим NO_ANSWER у документації сказано таке [1].")
    answer = answer_question("питання?", FakeRetriever(CHUNKS), llm)

    assert answer.found  # substring mention must not be misread as a refusal


def test_no_answer_marker_becomes_honest_refusal():
    llm = ScriptedLLM(NO_ANSWER_MARKER)
    answer = answer_question("питання поза корпусом?", FakeRetriever(CHUNKS), llm)

    assert not answer.found
    assert answer.text == REFUSAL_TEXT
    assert answer.sources == []


def test_missing_citations_fall_back_to_context_files():
    llm = ScriptedLLM("Відповідь без цитат.")
    answer = answer_question("питання?", FakeRetriever(CHUNKS), llm)

    assert answer.found
    assert answer.sources == ["a.md", "b.md"]  # unique context files, never empty


def test_think_blocks_are_stripped():
    from askdocs.llm import strip_think

    assert strip_think("<think>міркую...\nще міркую</think>Відповідь [1].") == "Відповідь [1]."
    assert strip_think("без think") == "без think"


def test_empty_retrieval_refuses_without_calling_llm():
    class ExplodingLLM(LLMProvider):
        def complete(self, system, user):
            raise AssertionError("LLM must not be called with no context")

    answer = answer_question("питання?", FakeRetriever([]), ExplodingLLM())

    assert not answer.found
    assert answer.sources == []
