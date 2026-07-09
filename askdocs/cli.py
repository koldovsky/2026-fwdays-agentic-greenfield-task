"""Terminal interface: ask a question, get an answer plus source files.

Single-shot:   docker compose run --rm app python -m askdocs.cli "питання"
Interactive:   docker compose run --rm app python -m askdocs.cli
"""

import os
import sys

from askdocs.answer import Answer, answer_question
from askdocs.llm import LLMError


def render_answer(answer: Answer) -> str:
    if answer.error:
        return answer.text  # controlled error state — no sources line
    if not answer.sources:
        return f"{answer.text}\n\nДжерела: —"
    lines = "\n".join(f"  - {source}" for source in answer.sources)
    return f"{answer.text}\n\nДжерела:\n{lines}"


def answer_or_error(ask, question: str) -> str:
    """Render an answer, or a friendly message if the LLM/backend fails —
    so a single failed question never crashes the CLI or the REPL."""
    try:
        return render_answer(ask(question))
    except LLMError as e:
        return f"Не вдалося отримати відповідь від моделі: {e}"
    except Exception as e:  # noqa: BLE001 — outermost boundary, no tracebacks to the user
        return f"Помилка: {e}"


def _build_pipeline():
    from askdocs.embeddings import SentenceTransformersProvider
    from askdocs.ingest import DEFAULT_COLLECTION
    from askdocs.llm import OpenAICompatibleProvider
    from askdocs.retriever import VectorRetriever
    from askdocs.store import QdrantStore

    embedder = SentenceTransformersProvider()
    store = QdrantStore(
        url=os.environ.get("QDRANT_URL", "http://localhost:6333"),
        collection=os.environ.get("ASKDOCS_COLLECTION", DEFAULT_COLLECTION),
        dimension=embedder.dimension,
    )
    retriever = VectorRetriever(embedder, store)
    llm = OpenAICompatibleProvider()

    def ask(question: str) -> Answer:
        return answer_question(question, retriever, llm)

    return ask


def _interactive(ask) -> None:
    print("askdocs — став питання по документації (порожній рядок або Ctrl-D для виходу).")
    while True:
        try:
            question = input("\n> ").strip()
        except EOFError:
            print()
            return
        if not question:
            return
        print("\n" + answer_or_error(ask, question))


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    try:
        ask = _build_pipeline()
    except Exception as e:  # noqa: BLE001 — e.g. vector store unreachable at startup
        print(f"Не вдалося ініціалізувати askdocs: {e}", file=sys.stderr)
        return 1
    if argv:
        print(answer_or_error(ask, " ".join(argv)))
    else:
        _interactive(ask)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
