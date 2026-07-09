# harden-answer-error-state — tasks

## 1. Pipeline error state

- [x] 1.1 `Answer` gains an `error: bool = False` flag; `answer_question` wraps `llm.complete()` and returns `Answer(found=False, error=True, ERROR_TEXT)` on `LLMError`
- [x] 1.2 Unit test: `LLMError` → controlled error state distinct from a refusal (`error=True`, `found=False`, empty sources, text ≠ `REFUSAL_TEXT`)

## 2. Consistency across consumers

- [x] 2.1 Eval refusal-rate counts only genuine refusals (`not found and not error`)
- [x] 2.2 CLI `render_answer` shows the error message without a `Джерела` line; unit test for it

## 3. Governance

- [x] 3.1 Modify the answer spec requirement + update PRD NFR-007 wording
- [x] 3.2 Full suite green via `docker compose run --rm app pytest` (46 passed)
