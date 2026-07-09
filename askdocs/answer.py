"""Answer pipeline: question -> Retriever -> LLMProvider -> grounded Answer.

Depends only on the interfaces. The LLM must answer strictly from the
numbered context fragments and cite them as [N]; if they don't contain the
answer it emits NO_ANSWER, which becomes an honest refusal (found=False).
"""

import re
import sys
from dataclasses import dataclass

from askdocs.llm import LLMError, LLMProvider
from askdocs.retriever import Retriever

NO_ANSWER_MARKER = "NO_ANSWER"
REFUSAL_TEXT = "Цього в документації немає."
ERROR_TEXT = "Не вдалося отримати відповідь від моделі."

SYSTEM_PROMPT = (
    "Ти — асистент по документації проєкту. Відповідай українською.\n"
    "Використовуй ТІЛЬКИ надані фрагменти документації — жодних власних знань.\n"
    "Після кожного факту вказуй номер фрагмента-джерела у форматі [N].\n"
    f"Якщо відповіді на питання немає у фрагментах — виведи рівно {NO_ANSWER_MARKER} "
    "і більше нічого."
)

_CITATION_RE = re.compile(r"\[(\d+)\]")


@dataclass(frozen=True)
class Answer:
    text: str
    sources: list[str]
    found: bool
    # error=True marks a controlled failure state (e.g. the LLM was
    # unreachable). It is distinct from a refusal (found=False, error=False):
    # an outage is NOT evidence the corpus lacks the answer (NFR-007).
    error: bool = False


def _build_context(chunks) -> str:
    return "\n\n".join(
        f"[{i}] джерело: {chunk.source_path} ({chunk.heading})\n{chunk.text}"
        for i, chunk in enumerate(chunks, start=1)
    )


def _cited_sources(reply: str, chunks) -> list[str]:
    cited: list[str] = []
    for marker in _CITATION_RE.findall(reply):
        index = int(marker) - 1
        if 0 <= index < len(chunks) and chunks[index].source_path not in cited:
            cited.append(chunks[index].source_path)
    if cited:
        return cited
    # model answered from context but cited nothing: the context files are
    # still the only possible sources (NFR-001 — answer without source is a bug)
    seen: list[str] = []
    for chunk in chunks:
        if chunk.source_path not in seen:
            seen.append(chunk.source_path)
    return seen


def answer_question(
    question: str, retriever: Retriever, llm: LLMProvider, k: int = 5
) -> Answer:
    chunks = retriever.retrieve(question, k=k)
    if not chunks:
        return Answer(text=REFUSAL_TEXT, sources=[], found=False)

    user_prompt = f"Фрагменти документації:\n\n{_build_context(chunks)}\n\nПитання: {question}"
    try:
        reply = llm.complete(SYSTEM_PROMPT, user_prompt)
    except LLMError as e:
        # Controlled error state — deliberately NOT a refusal: a network/HTTP/
        # JSON failure is not evidence the corpus lacks the answer (NFR-007).
        # Keep the user-facing text stable; log the internal detail (endpoint/
        # model) separately so it doesn't leak into the answer.
        print(f"askdocs: LLM error: {e}", file=sys.stderr, flush=True)
        return Answer(text=ERROR_TEXT, sources=[], found=False, error=True)

    # The prompt asks the model to emit exactly NO_ANSWER; match it as the whole
    # reply (allowing trailing punctuation/whitespace) so a longer answer that
    # merely mentions the token isn't misread as a refusal.
    if reply.strip().rstrip(".!…").strip() == NO_ANSWER_MARKER:
        return Answer(text=REFUSAL_TEXT, sources=[], found=False)
    return Answer(text=reply, sources=_cited_sources(reply, chunks), found=True)
