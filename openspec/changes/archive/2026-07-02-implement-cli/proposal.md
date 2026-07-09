# implement-cli — proposal

## Why

The full pipeline — ingest, retrieve, answer — is shipped, but there is no way for a person to use it. The CLI is the product's only interface in v1 (PRD FR-030): ask a question, get an answer plus the list of source files.

## What Changes

- New `askdocs.cli` entrypoint: `docker compose run --rm app python -m askdocs.cli "питання"` prints the answer and, below it, the list of source files it is based on.
- Wires the existing pieces together: `LocalMarkdownSource`/`QdrantStore`/`SentenceTransformersProvider` → `VectorRetriever` → `answer_question` with `OpenAICompatibleProvider`.
- Honest-refusal path surfaced in the UI: when the answer is not in the corpus, the CLI prints the refusal and no sources (FR-021, NFR-002).
- Optional single-shot vs. interactive REPL mode: a question argument answers once; no argument opens a prompt loop.
- Corpus directory configurable via `ASKDOCS_CORPUS` env var (default `/corpus`), so the CLI queries whatever was ingested.

## Capabilities

### New Capabilities

- `cli`: Terminal interface — question in, answer plus source list out. Covers PRD FR-030.

### Modified Capabilities

<!-- none: reuses ingest/retrieve/answer unchanged -->

## Impact

- New code: `askdocs/cli.py` (arg parsing, wiring, output formatting).
- No new dependencies, no infrastructure changes.
- Tests: unit tests of output formatting with a fake answer function (found answer with sources; refusal without sources), driven through the CLI's rendering layer so no LLM is needed.
- Downstream: `implement-eval` reuses the same wiring to score the system end-to-end.
