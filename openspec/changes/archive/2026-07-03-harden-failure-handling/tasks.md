# harden-failure-handling — tasks

## 1. Provider error handling

- [x] 1.1 `askdocs/llm.py`: add typed `LLMError`; wrap `httpx`/JSON in `complete()` so transport and response-shape failures raise `LLMError` with endpoint/model context
- [x] 1.2 Unit tests: transport error, HTTP status error, malformed JSON → `LLMError`; valid response still parsed and `<think>` stripped

## 2. CLI graceful degradation

- [x] 2.1 `askdocs/cli.py`: `answer_or_error()` catches `LLMError`/unexpected per question (REPL survives); `main()` guards pipeline init and exits non-zero with a clear message
- [x] 2.2 Unit tests: `answer_or_error` renders normal answer, reports `LLMError` and unexpected errors without a traceback

## 3. Watcher resilience

- [x] 3.1 `askdocs/sync.py`: `watch()` wraps `sync_once` (log + continue); `_parse_interval()` validates `ASKDOCS_SYNC_INTERVAL`; `_wait_for_qdrant()` closes the probe client in `finally`
- [x] 3.2 Unit tests: watcher survives a failing pass; `_parse_interval` handles bad/empty/non-positive input

## 4. Governance

- [x] 4.1 Add resilience NFRs to `docs/prd.md`
- [x] 4.2 Full suite green via `docker compose run --rm app pytest` (44 passed)
