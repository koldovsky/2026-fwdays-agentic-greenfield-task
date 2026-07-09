# implement-cli — design

## Context

ingest, retrieve, answer are shipped and interface-clean. The CLI is pure wiring + presentation — the only new decisions are how to assemble the concrete implementations and how to render an `Answer` in a terminal. PRD FR-030: question in, answer + source list out. Docker constraint unchanged: runs in the container.

## Goals / Non-Goals

**Goals:**

- One command answers one question and prints answer + sources.
- Refusal ("не знаю") renders clearly and lists no sources (NFR-001/002 honesty is visible to the user).
- Presentation logic testable without an LLM or a running store.

**Non-Goals:**

- Ingest orchestration (that stays `python -m askdocs.ingest`); the CLI only queries.
- Rich TUI, colors, markdown rendering, streaming, history persistence.
- Web UI (PRD FR-103, proposed).

## Decisions

### D1: Separate rendering from wiring

`render_answer(answer) -> str` is a pure function: it formats an `Answer` into terminal text. `main()` builds the concrete providers, calls `answer_question`, and prints `render_answer(...)`. Rationale: rendering is the only logic worth testing, and keeping it pure means tests need neither qdrant nor an LLM. Alternative — testing `main()` end-to-end — rejected: that is the live smoke test's job (already covered in `implement-answer`).

### D2: Single-shot and interactive from one entrypoint

`python -m askdocs.cli "питання"` answers once and exits; `python -m askdocs.cli` with no argument opens a REPL (read question, print answer, repeat until EOF/empty). Both paths share the same wired retriever/LLM so providers are built once. Rationale: interactive mode is trivial given the wiring and makes manual corpus exploration pleasant; single-shot is what tests and eval call.

### D3: Output format

```text
<answer text>

Джерела:
  - dvyhun/palyvo.md
  - bezpeka.md
```

On refusal: the refusal text, then `Джерела: —` (an explicit "no sources" line, so the absence is intentional, not a rendering bug). Sources are de-duplicated and shown in citation order (already guaranteed by `answer_question`).

### D4: Corpus/config via env, consistent with the rest

`ASKDOCS_CORPUS` (default `/corpus`), `QDRANT_URL`, `ASKDOCS_COLLECTION`, `LLM_BASE_URL`, `LLM_MODEL` — same env vars used elsewhere. The CLI assumes the corpus is already ingested; it does not re-ingest on every call (that would be slow and is the sync capability's concern, FR-060).

## Risks / Trade-offs

- [User runs CLI before ingesting → empty store → every answer is a refusal] → acceptable and correct (nothing in corpus); README will document the ingest-first step; sync capability will later keep it populated.
- [REPL in a non-interactive `docker compose run` with no TTY] → guarded: interactive loop only starts when no question arg is given, and exits cleanly on EOF.

## Open Questions

- None blocking.
