# Use openai Python SDK + ollama Python client for provider integration

## Context and Problem Statement

Phase 1 of v1.2 rewires the backend to call real translation + TTS providers through the official Python SDKs (the in-process `MockTranslationAdapter` + `MockTTSAdapter` move to test code per BACK-01; the `HttpTranslationAdapter` / `HttpTTSAdapter` are reduced to non-overridable base classes; three new HTTP adapter subclasses — `OllamaHttpTranslationAdapter` + `OpenAIHttpTranslationAdapter` + `OpenAIHttpTTSAdapter` — must call the upstream provider per TRAN-01 / TRAN-02 / TTS-01 / TTS-02). The new `POST /api/v1/providers/openai-compatible/models` + `POST /api/v1/providers/ollama/models` endpoints (BACK-03 / BACK-05) also need to query the provider's model catalog at request time. PRD §6 "Ports & Adapters" forbids raw HTTP inside adapters — every call must go through a first-party provider client that returns typed responses and owns the HTTP transport (no `httpx`/`requests` re-implementation). Which Python clients should we standardize on for the OpenAI-compatible + Ollama provider integration?

## Considered Options

* `openai` (>=1.50,<2.0) + `ollama` (>=0.4,<1.0) Python SDKs (chosen)
* LiteLLM unified SDK (one dependency for OpenAI-compatible + Ollama + others)
* `httpx` + manual JSON path construction (no new dependency)
* Reuse the in-process mock adapter surface as the only runtime path (defer the real-provider wiring to v1.3)

## Decision Outcome

Chosen option: "`openai` + `ollama` Python SDKs", because the two providers expose fundamentally different wire shapes (OpenAI is HTTP+JSON over `/v1/chat/completions` / `/v1/audio/speech`; Ollama is HTTP+JSON over `/api/chat` with a different `ListResponse` model schema) and first-party clients are the only contract that stays correct when each provider ships a non-breaking shape change. The OpenAI Python SDK's `OpenAI(base_url=...)` parameter is the canonical seam for talking to any OpenAI-compatible endpoint (including Ollama's OpenAI-compat mode) — the SDK is the same code path the OpenAI Dashboard uses, so retries, timeouts, streaming, and error classes (`APIConnectionError`, `APITimeoutError`, `AuthenticationError`) are stable across versions. The `ollama` Python client is the official Ollama Python client maintained by the Ollama project itself; it exposes `ollama.Client(host=...).list()` + `.chat()` and returns typed `ListResponse` + `ChatResponse` objects. Using two clients keeps each provider's idioms explicit in the code (the developer reading `OllamaHttpTranslationAdapter` sees `ollama.Client(host=...).chat(...)` and immediately knows it is the Ollama shape; the `OpenAIHttpTranslationAdapter` shows `client.chat.completions.create(...)` and immediately knows it is the OpenAI shape) — the abstraction does not leak through a unified facade.

### Alternatives considered

- **LiteLLM** would give a single `litellm.completion(model="ollama/translategemma:12b", messages=[...])` call, but the model-name prefix conventions (`ollama/...`, `openai/...`) are an abstraction leak that the codebase would inherit forever, the error envelope differs from both provider SDKs (LiteLLM flattens `APIConnectionError` into a generic `Exception`), and the SDK adds a non-trivial dependency tree (LiteLLM pulls in provider-specific JSON serializers for ~50 providers we will never call). For a v1.2 demo that targets exactly two providers, the abstraction cost outweighs the convenience.
- **`httpx` + manual JSON** would avoid a new dependency, but it forces us to maintain retry policy, timeout envelopes, error-class taxonomy, and response-shape handling for two providers' wire shapes — exactly the bug surface the official SDKs already cover. The per-call `httpx.AsyncClient` would also need an `aclose()` lifecycle in the adapter's base class, which is already where the SDK clients put it.
- **Defer to v1.3** would leave the in-process mocks as the only runtime path, which contradicts the v1.2 PRD §6 ports & adapters contract (BACK-01) and the user-locked decision in `01-CONTEXT.md` to wire the per-provider HTTP adapter subclasses. Not an option.

### Consequences

* Good, because the first-party SDKs stay in lockstep with each provider's wire shape (the OpenAI SDK is the same client the OpenAI Dashboard uses; the Ollama SDK is maintained by the Ollama project itself). Any non-breaking shape change ships in the SDK first.
* Good, because typed responses (`openai.types.chat.ChatCompletion`, `ollama._types.ListResponse`) eliminate ad-hoc `dict[str, Any]` plumbing inside the adapter; the `_format_openai_models(...)` + `_format_ollama_models(...)` mapping helpers in the providers router do a narrow translation to the wire response, not the full response shape.
* Good, because error classes are stable and idiomatic per provider: `openai.APIConnectionError` + `openai.APITimeoutError` + `openai.AuthenticationError` map cleanly to the single `provider_unreachable` 502 envelope in `api/error_codes.py`; `ollama.ResponseError` + `requests.exceptions.ConnectionError` (the Ollama SDK uses `requests` under the hood for the sync client) map to the same envelope.
* Good, because no abstraction layer hides the provider identity. The dispatch in `JobOrchestrator.dispatch(...)` keys on the `provider` string (`"ollama"` vs `"openai-compatible"`); the per-provider adapter uses the matching SDK; the SPA's "Load Models" button calls the matching `POST /providers/{provider}/models` endpoint. Every seam is provider-explicit.
* Bad, because two new runtime dependencies (`openai` + `ollama`) enter `backend/pyproject.toml`. Both are well-known canonical packages (OpenAI + Ollama are the maintainers; both publish to PyPI; no fork or vendor source). The dep footprint is small relative to the SDK alternative (LiteLLM pulls in ~50 providers' serializers) and the security surface is limited to two narrowly-scoped HTTP clients.
* Bad, because the version constraints (`openai>=1.50,<2.0` + `ollama>=0.4,<1.0`) need to track each provider's stable major line. The OpenAI SDK is at 1.x (1.99+ in 2026); the Ollama SDK is at 0.4+ (the major version is `0.x` to signal "the wire shape is still in active development"). The `<2.0` / `<1.0` upper bounds are pinned conservatively to avoid silent breakage on a major bump; a future phase can relax the upper bounds after smoke-testing the new major.

### Implementation

The decision is implemented across plans `01-02` + `01-04` of Phase 1
(`.planning/phases/01-refactor-backend-structure-to-match-prd-base-http-adapters-p/`):

- `backend/pyproject.toml` `[project] dependencies` appends
  `"openai>=1.50,<2.0"` + `"ollama>=0.4,<1.0"`. Both are runtime deps
  (consumed by the production lifespan in `epubtv.api.app`, not just the
  test fixtures). The `uv.lock` is regenerated by `uv lock --upgrade`
  on the first `uv sync` after the edit.
- `backend/src/epubtv/adapters/translation/ollama_http_translation_adapter.py`
  uses `ollama.Client(host=base_url).chat(model=model,
  messages=[{"role": "user", "content": source_text}])` per TRAN-02.
- `backend/src/epubtv/adapters/translation/openai_http_translation_adapter.py`
  uses `openai.OpenAI(base_url=base_url, api_key=api_key or
  "EMPTY").chat.completions.create(model=model, messages=[...],
  temperature=0.0)` per TRAN-02. The `EMPTY` placeholder lets the
  OpenAI SDK talk to keyless OpenAI-compatible endpoints (Ollama is
  one of them; some other providers are too).
- `backend/src/epubtv/adapters/tts/openai_http_tts_adapter.py` uses
  `openai.OpenAI(base_url=base_url, api_key=api_key or
  "EMPTY").audio.speech.create(model=model, voice=voice, input=text,
  response_format="wav")` per TTS-02. The `aclose()` method calls
  `await self._client.close()` (the OpenAI SDK exposes an async
  `close()` since v1.50).
- `backend/src/epubtv/api/routers/providers.py` rewrites the two
  provider model-list endpoints as `POST /api/v1/providers/{provider}/models`
  that construct the per-provider SDK client per request
  (`openai.OpenAI(base_url=..., api_key=..., timeout=10.0, max_retries=0)`
  for OpenAI-compatible; `ollama.Client(host=..., timeout=10.0)` for
  Ollama) and return the model catalog. Both return 502
  `provider_unreachable` with the SDK's error message in
  `details.provider_error` on a connection failure (BACK-03 / BACK-05).
- The `api_key` field on the OpenAI-compatible endpoint is never
  logged (the structured-logger field is opt-in; the route handler
  does not log the body). PRD §6 "API keys session-only, never
  persisted, never logged" is preserved.

The risk mitigations (slopcheck + `pip show` post-install
verification + the threat-model `T-02-SC` register entry in plan
01-02) cover the supply-chain surface for the two new packages.
Both packages are `[OK]` (canonical maintainers + well-known wheels
+ no fork risk) per the package-legitimacy gate protocol.
