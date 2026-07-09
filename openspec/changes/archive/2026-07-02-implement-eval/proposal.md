# implement-eval — proposal

## Why

The pipeline works, but "works" is anecdotal. PRD FR-040–FR-042 demand a measurable quality bar: a golden set of known-answer questions, a retrieval metric (did we fetch the right chunk?), and an anti-hallucination check (does the system say "не знаю" for out-of-corpus questions instead of inventing?). Without eval, "готовність = зелені тести" (NFR-003) has nothing to assert about answer quality.

## What Changes

- Expand the ГущоЛіт fixture corpus with a couple more `.md` files so the domain is rich enough for 20–30 distinct questions.
- New golden set: `tests/golden.yaml` with 20–30 questions, each tagged in-corpus (with an expected source file) or out-of-corpus (expected refusal). Covers FR-040.
- New `askdocs/eval.py`: load the golden set, run **retrieval eval** (for each in-corpus question, is the expected source file in top-k? → hit-rate metric, FR-041) and **anti-hallucination eval** (for each out-of-corpus question, does the pipeline refuse? → refusal-rate metric, FR-042). Produces a report; `python -m askdocs.eval` prints it.
- Tests: retrieval eval runs against qdrant (no LLM) and asserts hit-rate above a threshold; anti-hallucination eval runs against the real LLM and is skippable when unreachable, asserting refusal-rate above a threshold.

## Capabilities

### New Capabilities

- `eval`: Golden set + retrieval hit-rate metric + anti-hallucination refusal-rate metric over the ГущоЛіт corpus. Covers PRD FR-040, FR-041, FR-042.

### Modified Capabilities

<!-- none: ingest/retrieve/answer behavior unchanged; corpus fixtures grow but their contract does not -->

## Impact

- New code: `askdocs/eval.py` (golden-set loader, metrics, report, entrypoint).
- New data: `tests/golden.yaml`; additional `tests/corpus/*.md` files.
- New dependency: `pyyaml` for the golden set.
- Existing ingest integration test asserts the exact set of corpus files — updated to subset semantics so the corpus can grow without breaking it.
- Downstream: eval becomes the objective gate for any future retrieval/answer tuning.
