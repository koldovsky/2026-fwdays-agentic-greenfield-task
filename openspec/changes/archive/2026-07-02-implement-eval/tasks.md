# implement-eval — tasks

## 1. Corpus & golden set

- [x] 1.1 Expand `tests/corpus/` with 1–2 more ГущоЛіт `.md` files (distinct facts: project history/team, crew/passenger rules, maintenance schedule) so 20–30 questions are supportable
- [x] 1.2 Create `tests/golden.yaml`: 20–30 entries `{question, in_corpus, source, note}` — ~22 in-corpus (each with an existing expected source file) and ~6 out-of-corpus
- [x] 1.3 Add `pyyaml` to `requirements.txt`

## 2. Eval library

- [x] 2.1 Implement `askdocs/eval.py`: `load_golden()`, `retrieval_report(retriever)` (hit-rate@k over in-corpus questions), `hallucination_report(retriever, llm)` (refusal-rate over out-of-corpus questions), report dataclasses, and `main()` that ingests the corpus and prints both reports

## 3. Tests

- [x] 3.1 Golden-set validity test: 20–30 entries, every in-corpus `source` file exists on disk
- [x] 3.2 Retrieval eval test (qdrant, no LLM): ingest corpus, assert hit-rate ≥ 0.8; report per-question misses by name
- [x] 3.3 Anti-hallucination eval test (real LLM, skippable): assert refusal-rate ≥ 0.8

## 4. Fixup & done criteria

- [x] 4.1 Update `test_ingest_fixture_corpus_stores_chunks_with_metadata` to subset semantics so corpus growth doesn't break it
- [x] 4.2 Full suite green via `docker compose run --rm app pytest` (with LM Studio: honesty eval included; without: skipped)
- [x] 4.3 Manual check: `docker compose run --rm app python -m askdocs.eval` prints retrieval + anti-hallucination report
