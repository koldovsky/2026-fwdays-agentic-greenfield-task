# implement-eval — design

## Context

All four pipeline capabilities are shipped. Eval is the objective quality gate PRD demands (FR-040–042) and the concrete meaning of NFR-003/NFR-004 for the answer path. The synthetic ГущоЛіт domain exists precisely so that a correct answer can only come from the corpus — eval must prove both halves: in-corpus questions retrieve the right chunk, out-of-corpus questions get refused.

## Goals / Non-Goals

**Goals:**

- Golden set of 20–30 questions with known outcomes, versioned in the repo.
- Retrieval metric: hit-rate@k = fraction of in-corpus questions whose expected source file appears in top-k. No LLM needed.
- Anti-hallucination metric: refusal-rate = fraction of out-of-corpus questions the pipeline refuses. Needs the LLM.
- A report and pass/fail thresholds wired into pytest.

**Non-Goals:**

- Answer-text scoring (ROUGE/LLM-judge/semantic similarity) — hit-rate + refusal-rate is the v1 bar; text-quality grading is future work.
- Tuning k or the model to hit the numbers — eval measures; tuning is a separate change if the bar isn't met.
- CI integration.

## Decisions

### D1: Golden set as YAML, one schema for both question kinds

`tests/golden.yaml` is a list of entries: `{question, in_corpus: bool, source: <file> | null, note}`. In-corpus entries carry the expected `source` file (the retrieval target); out-of-corpus entries have `in_corpus: false` and no source. One flat file is easy to read, diff, and extend. `pyyaml` added as a dep — trivial and standard. Alternative — JSON — rejected: YAML comments let each question explain its intent for the next maintainer.

### D2: Two metrics, two independent gates

- **Retrieval hit-rate** (FR-041): embed question → `VectorRetriever.retrieve(k)` → is `source` among returned `source_path`s? Pure retrieval, runs against qdrant without the LLM, so it is deterministic and always-on in the suite. Gate: hit-rate ≥ 0.8 (with a small, distinctive corpus this is achievable; the threshold is a floor, not a target).
- **Anti-hallucination refusal-rate** (FR-042): full `answer_question` on each out-of-corpus question → `found is False`? Needs the LLM, so this test is skippable when the endpoint is unreachable (same pattern as the answer smoke test). Gate: refusal-rate ≥ 0.8.

Separating them means retrieval quality is guarded on every run even without a model, and the honesty check runs whenever a model is available.

### D3: `eval.py` is library + report, pytest asserts thresholds

`eval.py` exposes `load_golden()`, `retrieval_report(retriever)`, `hallucination_report(retriever, llm)` returning dataclasses with per-question results and aggregate rates, plus `main()` that ingests the corpus and prints both reports. Tests call the report functions and assert on the aggregate rate — so a single wrong question shows up as a named failure, not an opaque threshold miss. Rationale: the report is useful to a human (`python -m askdocs.eval`) and to CI later, while pytest owns the pass/fail.

### D4: Corpus growth without breaking ingest tests

Adding corpus files changes chunk counts and the file set. The existing `test_ingest_fixture_corpus_stores_chunks_with_metadata` asserts the *exact* file set — brittle. Change it to assert the known files are a *subset* of what's ingested, and keep the heading-trail check. This keeps ingest's real guarantees (recursive discovery, metadata, non-.md skipped) while letting the corpus grow for eval.

## Risks / Trade-offs

- [Small local model may over-refuse or under-refuse, flaking the honesty gate] → threshold 0.8 leaves margin; questions are chosen to be unambiguously outside the coffee-flying-car domain; the gate is skippable so it never blocks the no-LLM suite.
- [Hit-rate depends on multilingual-MiniLM ranking Ukrainian synthetic terms] → golden questions use distinctive corpus vocabulary; k=5 gives headroom; if a specific question is a persistent near-miss, it is fixed in the golden set (reworded) or documented, not by lowering the gate.
- [Golden set and corpus drift apart over edits] → both live in `tests/`, reviewed together; eval failing on drift is the intended signal.

## Open Questions

- None blocking. Thresholds (0.8/0.8) are initial floors; adjust with evidence if the corpus or model changes.
