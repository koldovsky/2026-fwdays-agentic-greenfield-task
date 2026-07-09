"""Eval: golden-set retrieval hit-rate and anti-hallucination refusal-rate.

    docker compose run --rm app python -m askdocs.eval

Retrieval eval needs only qdrant + embeddings; the honesty eval needs the LLM.
"""

import os
from dataclasses import dataclass
from pathlib import Path

import yaml

from askdocs.answer import answer_question
from askdocs.llm import LLMProvider
from askdocs.retriever import Retriever

GOLDEN_PATH = Path(__file__).parent.parent / "tests" / "golden.yaml"
DEFAULT_K = 5


@dataclass(frozen=True)
class GoldenEntry:
    question: str
    in_corpus: bool
    source: str | None


@dataclass(frozen=True)
class QuestionResult:
    question: str
    ok: bool
    detail: str


@dataclass(frozen=True)
class Report:
    title: str
    results: list[QuestionResult]

    @property
    def rate(self) -> float:
        return sum(r.ok for r in self.results) / len(self.results) if self.results else 0.0

    @property
    def misses(self) -> list[QuestionResult]:
        return [r for r in self.results if not r.ok]

    def format(self) -> str:
        lines = [f"{self.title}: {self.rate:.0%} ({sum(r.ok for r in self.results)}/{len(self.results)})"]
        for r in self.misses:
            lines.append(f"  MISS: {r.question} — {r.detail}")
        return "\n".join(lines)


def load_golden(path: Path = GOLDEN_PATH) -> list[GoldenEntry]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [GoldenEntry(e["question"], e["in_corpus"], e.get("source")) for e in raw]


def retrieval_report(retriever: Retriever, golden=None, k: int = DEFAULT_K) -> Report:
    golden = golden if golden is not None else load_golden()
    results = []
    for entry in golden:
        if not entry.in_corpus:
            continue
        sources = {c.source_path for c in retriever.retrieve(entry.question, k=k)}
        ok = entry.source in sources
        results.append(
            QuestionResult(entry.question, ok, f"очікували {entry.source}, отримали {sorted(sources)}")
        )
    return Report(f"Retrieval hit-rate@{k}", results)


def hallucination_report(retriever: Retriever, llm: LLMProvider, golden=None, k: int = DEFAULT_K) -> Report:
    golden = golden if golden is not None else load_golden()
    results = []
    for entry in golden:
        if entry.in_corpus:
            continue
        answer = answer_question(entry.question, retriever, llm, k=k)
        # A genuine refusal counts; an LLM error state does not (it is not a
        # verified refusal, just a failure to produce one).
        refused = (not answer.found) and (not answer.error)
        results.append(
            QuestionResult(entry.question, refused, f"очікували відмову, отримали: {answer.text[:80]}")
        )
    return Report("Anti-hallucination refusal-rate", results)


def main() -> int:
    from askdocs.embeddings import SentenceTransformersProvider
    from askdocs.ingest import DEFAULT_COLLECTION, ingest
    from askdocs.llm import OpenAICompatibleProvider
    from askdocs.retriever import VectorRetriever
    from askdocs.sources import LocalMarkdownSource
    from askdocs.store import QdrantStore

    corpus = os.environ.get("ASKDOCS_CORPUS", str(Path(__file__).parent.parent / "tests" / "corpus"))
    embedder = SentenceTransformersProvider()
    store = QdrantStore(
        url=os.environ.get("QDRANT_URL", "http://localhost:6333"),
        collection=os.environ.get("ASKDOCS_COLLECTION", DEFAULT_COLLECTION),
        dimension=embedder.dimension,
    )
    ingest(LocalMarkdownSource(corpus), embedder, store)
    retriever = VectorRetriever(embedder, store)

    print(retrieval_report(retriever).format())
    print()
    print(hallucination_report(retriever, OpenAICompatibleProvider()).format())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
