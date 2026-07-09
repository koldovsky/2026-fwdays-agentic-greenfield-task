# implement-answer — tasks

## 1. LLM provider

- [x] 1.1 Implement `askdocs/llm.py`: `LLMProvider` interface (`complete(system, user) -> str`) and `OpenAICompatibleProvider` (httpx POST to `{LLM_BASE_URL}/chat/completions`, model from `LLM_MODEL`, `<think>` blocks stripped)
- [x] 1.2 Add `LLM_BASE_URL`/`LLM_MODEL` env vars and `extra_hosts: host.docker.internal:host-gateway` to the app service in `docker-compose.yaml`

## 2. Answer pipeline

- [x] 2.1 Implement `askdocs/answer.py`: `Answer(text, sources, found)` dataclass and `answer_question(question, retriever, llm, k)` — numbered-fragment prompt, `NO_ANSWER` detection, `[N]` citation parsing with all-context fallback
- [x] 2.2 Unit tests with fake LLM: cited answer maps `[N]` to source files; NO_ANSWER → honest refusal with empty sources; missing citations → fallback sources; `<think>` stripping

## 3. Live smoke test

- [x] 3.1 End-to-end smoke test (retriever + real LM Studio): corpus question → `found=True` with correct source; out-of-corpus question → `found=False`; auto-skip when LLM endpoint unreachable

## 4. Done criteria

- [x] 4.1 Full suite green via `docker compose run --rm app pytest` (with LM Studio up, smoke included; without it, skipped not failed)
