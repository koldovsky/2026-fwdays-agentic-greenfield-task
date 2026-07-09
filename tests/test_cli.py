"""Unit tests for CLI rendering (pure, no LLM/store)."""

from askdocs.answer import Answer
from askdocs.cli import answer_or_error, render_answer
from askdocs.llm import LLMError


def test_found_answer_lists_sources_in_order():
    answer = Answer(
        text="Заборонена робуста [1].", sources=["dvyhun/palyvo.md", "bezpeka.md"], found=True
    )
    out = render_answer(answer)

    assert "Заборонена робуста [1]." in out
    assert "Джерела:" in out
    assert out.index("dvyhun/palyvo.md") < out.index("bezpeka.md")


def test_refusal_shows_text_and_explicit_no_sources():
    answer = Answer(text="Цього в документації немає.", sources=[], found=False)
    out = render_answer(answer)

    assert "Цього в документації немає." in out
    assert "Джерела: —" in out


def test_error_answer_renders_message_without_sources_line():
    answer = Answer(text="Не вдалося отримати відповідь.", sources=[], found=False, error=True)
    out = render_answer(answer)

    assert "Не вдалося отримати відповідь." in out
    assert "Джерела" not in out  # error state, not a "no sources" answer


def test_answer_or_error_renders_normal_answer():
    def ask(_q):
        return Answer(text="Відповідь [1].", sources=["a.md"], found=True)

    assert "a.md" in answer_or_error(ask, "питання?")


def test_answer_or_error_reports_llm_failure_without_crashing():
    def ask(_q):
        raise LLMError("endpoint недоступний")

    out = answer_or_error(ask, "питання?")

    assert "модел" in out.lower()  # friendly message, no traceback
    assert "endpoint недоступний" in out


def test_answer_or_error_catches_unexpected_errors():
    def ask(_q):
        raise RuntimeError("vector store впав")

    out = answer_or_error(ask, "питання?")

    assert "vector store впав" in out
