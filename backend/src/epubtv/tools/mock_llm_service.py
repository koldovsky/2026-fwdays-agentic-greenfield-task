"""Standalone ``mock-llm-service`` — OpenAI-compatible + Ollama-shaped mocks (plan 260711-1ww).

A single FastAPI/uvicorn app that exposes the four PRD §OpenAPI
endpoints (the OpenAI-compatible wire shape) plus the two Ollama
endpoints the consolidated ``OllamaHttpTranslationAdapter`` and
``OllamaHttpTTSAdapter`` call when a real Ollama is unreachable.
Lives as a separate process during demo + CI; the FastAPI
backend points at it via the per-provider URL env vars
(``EPUBTV_DEFAULT_OLLAMA_URL`` + ``EPUBTV_DEFAULT_OPENAI_URL``,
both defaulting to ``http://localhost:8765/v1`` for local dev).
The composition root at ``api/app.py`` constructs the three
per-provider HTTP adapter subclasses from these URLs (per D-08
+ WR-06). Phase 3+ swap-in: real Ollama / OpenAI-compatible
adapters drop in against the same contract — no client-side
change required.

The service is the post-rename home of the legacy
``mock_openai_service`` (deleted in this refactor). The pyproject
script entry is ``mock-llm`` (was ``mock-openai``); the docker
compose service is ``mock-llm`` (was ``mock-openai``); the
service's bind env vars are ``MOCK_LLM_HOST`` +
``MOCK_LLM_PORT`` (were ``MOCK_OPENAI_HOST`` +
``MOCK_OPENAI_PORT``).

OpenAI-compatible endpoints (4 + health):
- ``POST /v1/chat/completions`` body
  ``{model, messages: [{role, content}], temperature?}`` →
  ``{id, object: "chat.completion", created, model,
  choices: [{index, message: {role, content}, finish_reason}],
  usage: {prompt_tokens, completion_tokens, total_tokens}}``.
  The OpenAI-compatible shape: ``extra="forbid"`` on the request body.
  The ``content`` field carries a minimal D-07 ``<span xml:lang="...">``
  wrapper + ``id={chunk_id}`` marker (the consolidated service is
  self-contained; the in-process ``MockTranslationAdapter`` lives in
  ``tests/`` per BACK-01 + plan 01-02).
- ``POST /v1/audio/speech`` body
  ``{model, input, voice, response_format?}`` → 200 + raw audio bytes
  (Content-Type: audio/wav by default). The OpenAI-compatible shape
  mirrors https://platform.openai.com/docs/api-reference/audio/createSpeech.
  The bytes are a minimal 1 s 16 kHz 16-bit mono silent WAV (the
  in-process ``MockTTSAdapter`` lives in ``tests/`` per BACK-01).
- ``GET /v1/models`` → ``{object: "list", data: [{id, object: "model",
  created: 0, owned_by: "ollama|openai"}]}``. Returns the union of
  the Ollama + OpenAI canned lists. The ``/providers/v1/models`` from
  Plan 02 stays as the SPA's preferred fetch (provider-scoped); this
  endpoint is the OpenAI-compatible catalog.
- ``GET /healthz`` → ``{"status": "ok"}`` (docker-compose healthcheck
  + CI smoke).

Ollama-shaped endpoints (per ``docs/ollama-models-spec.yml`` +
``docs/ollama-text-spec.yml`` — the OpenAPI 3.1.0 specifications
for Ollama's HTTP surface that the sprint refactored against):
- ``GET /api/tags`` → ``{models: [{name, model, modified_at, size,
  digest, details: {format, family, families, parameter_size,
  quantization_level}}]}``. Mirrors the Ollama-shape wire contract;
  the canned list is the same three Ollama models the OpenAI
  catalog surfaces (translategemma:12b, translategemma:27b,
  llama3.1:8b), projected into the Ollama ``ModelSummary`` shape
  per the spec example. This unblocks the
  ``OllamaHttpTranslationAdapter`` model-list fetch in test
  environments without a real Ollama daemon.
- ``POST /api/generate`` body ``{model, prompt, ...}`` → non-stream
  ``{model, created_at, response, done, done_reason, ...}`` echo
  per the Ollama spec. The mock echoes the model + returns a
  canned canned-translation string; the upstream Ollama
  translation workflow calls this per chunk. Stream variant
  (``stream: true``) is NOT implemented in this mock — the
  sprint test environment does not exercise the streaming path,
  and the production Ollama SDK's default for the
  ``chat(stream=False)`` Python helper is non-streaming. If
  production streaming is needed, follow up with an
  ``EventSourceResponse`` that yields the same envelope one
  token at a time.

NOTE: ``/api/chat`` is NOT in the Ollama OpenAPI spec (only
``/api/generate`` is documented as of Ollama 0.1.0) so this mock
does not serve it. The Ollama Python client (``ollama>=0.4,<1.0``
per ADR 0012) defaults to ``/api/chat`` — production callers
that hit this mock MUST override to ``/api/generate`` (the
adapter layer in
``epubtv/adapters/translation/ollama_http_translation_adapter.py``
is the seam that picks the endpoint).

Boot:
- ``uv run python -m epubtv.tools.mock_llm_service`` (CI / demo)
- ``uv run mock-llm`` (the ``[project.scripts]`` entry — replaces
  the legacy ``mock-openai`` entry from pyproject.toml)

Binds ``127.0.0.1:8765`` by default (loopback-only). The
``MOCK_LLM_PORT`` env override for tests + dev.

The Pydantic ``_ChatBody`` + ``_SpeechBody`` + ``_GenerateBody``
schemas use ``extra="forbid"`` so stray fields in the request
body return 422 (D-08 contract enforcement at the wire boundary).
"""

from __future__ import annotations

import hashlib
import io
import os
import time
import wave
from datetime import UTC, datetime

import uvicorn
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="Mock LLM Service", version="0.3.0")


# ── Request / response models ──────────────────────────────────────


class _ChatMessage(BaseModel):
    """Single message in a chat-completions request.

    ``extra="forbid"`` rejects stray fields per the OpenAI-compatible
    wire contract.
    """

    model_config = ConfigDict(extra="forbid")

    role: str = Field(min_length=1, max_length=32)
    content: str = Field(min_length=1)


class _ChatBody(BaseModel):
    """Request body for ``POST /v1/chat/completions`` (OpenAI shape).

    ``extra="forbid"`` rejects stray fields at parse time. The mock
    consumes the LAST user message as the source text (the upstream
    translation workflow sends a single user message per chunk).
    """

    model_config = ConfigDict(extra="forbid")

    model: str = Field(min_length=1)
    messages: list[_ChatMessage] = Field(min_length=1)
    temperature: float | None = None


class _ChatChoice(BaseModel):
    """Single choice in a chat-completions response envelope."""

    index: int
    message: _ChatMessage
    finish_reason: str = "stop"


class _Usage(BaseModel):
    """Token usage envelope (per the OpenAI shape)."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class _ChatResponse(BaseModel):
    """Response body for ``POST /v1/chat/completions`` (OpenAI shape)."""

    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[_ChatChoice]
    usage: _Usage


class _SpeechBody(BaseModel):
    """Request body for ``POST /v1/audio/speech`` (OpenAI shape).

    ``extra="forbid"`` rejects stray fields at parse time. The mock
    returns raw WAV bytes; ``response_format=mp3`` returns the same
    WAV bytes (the wire shape mirrors OpenAI, the encoder is a
    sprint simplification per CONVENTIONS.md — WAV default to avoid
    MP3 encoder delay breaking the ±50ms stitch).
    """

    model_config = ConfigDict(extra="forbid")

    model: str = Field(min_length=1)
    input: str = Field(min_length=1, max_length=4096)
    voice: str = Field(min_length=1, max_length=64)
    response_format: str = Field(default="wav")


class _ModelEntry(BaseModel):
    """Single model in the OpenAI-compatible catalog."""

    id: str
    object: str = "model"
    created: int = 0
    owned_by: str


class _ModelsResponse(BaseModel):
    """Response body for ``GET /v1/models`` (OpenAI shape)."""

    object: str = "list"
    data: list[_ModelEntry]


class _VoicesByLanguageResponse(BaseModel):
    """Full voice catalog (no language query param)."""

    voices_by_language: dict[str, list[str]]


class _VoicesSingleLanguageResponse(BaseModel):
    """Single-language slice of the voice catalog."""

    voices: list[str]


class _HealthResponse(BaseModel):
    """Response body for ``GET /healthz``."""

    status: str = "ok"


class _OllamaModelDetails(BaseModel):
    """``details`` sub-object in the Ollama ``ModelSummary`` shape."""

    format: str = "gguf"
    family: str
    families: list[str]
    parameter_size: str
    quantization_level: str = "Q4_K_M"


class _OllamaModelSummary(BaseModel):
    """Single model in the Ollama ``ListResponse`` shape.

    Mirrors the OpenAPI 3.1.0 schema in
    ``docs/ollama-models-spec.yml`` (the ``ModelSummary`` type).
    The mock returns a fixed 3-model canned list (translategemma
    12b/27b + llama3.1:8b) — same models the OpenAI catalog
    surfaces as ``owned_by="ollama"``.
    """

    name: str
    model: str
    modified_at: str
    size: int = 0
    digest: str = ""
    details: _OllamaModelDetails


class _OllamaListResponse(BaseModel):
    """Response body for ``GET /api/tags`` (Ollama shape)."""

    models: list[_OllamaModelSummary]


class _GenerateBody(BaseModel):
    """Request body for ``POST /api/generate`` (Ollama shape).

    ``extra="forbid"`` rejects stray fields at parse time. The mock
    consumes the ``model`` + ``prompt`` fields; all other Ollama
    request fields (``suffix`` / ``images`` / ``format`` / ``system``
    / ``stream`` / ``think`` / ``raw`` / ``keep_alive`` / ``options``
    / ``logprobs`` / ``top_logprobs``) are accepted by the spec but
    not surfaced here — Pydantic drops unknown fields by default
    (we override to ``extra="forbid"`` so any future field added to
    this body returns 422 instead of being silently dropped).
    Stream variant (``stream: true``) returns 400 (not implemented
    in the mock; see module docstring).
    """

    model_config = ConfigDict(extra="forbid")

    model: str = Field(min_length=1)
    prompt: str = Field(min_length=1, max_length=8192)
    stream: bool = False
    system: str | None = None
    suffix: str | None = None
    format_: str | None = Field(default=None, alias="format")
    keep_alive: str | int | None = None


class _GenerateResponse(BaseModel):
    """Response body for ``POST /api/generate`` (Ollama shape, non-stream).

    Mirrors the OpenAPI 3.1.0 schema in
    ``docs/ollama-text-spec.yml`` (the ``GenerateResponse`` type).
    The mock echoes the model + returns a canned canned-translation
    string + done=true + done_reason="stop". Duration fields are
    0 (the mock is synchronous + free).
    """

    model: str
    created_at: str
    response: str
    done: bool = True
    done_reason: str = "stop"
    total_duration: int = 0
    load_duration: int = 0
    prompt_eval_count: int = 0
    prompt_eval_duration: int = 0
    eval_count: int = 0
    eval_duration: int = 0


# ── OpenAI-compatible endpoints ──────────────────────────────────


@app.post("/v1/chat/completions", response_model=_ChatResponse)
async def chat_completions(body: _ChatBody) -> _ChatResponse:
    """Translate the last user message per the OpenAI shape.

    Inlines a minimal D-07 wrapper (the consolidated service is
    self-contained; the in-process ``MockTranslationAdapter`` lives in
    ``tests/`` per BACK-01 + plan 01-02). The handler derives a
    deterministic ``chunk_id`` from the SHA1 of the message content
    + a short suffix (the chunk_id is a workflow identifier, not a
    wire-level concern; the upstream translation workflow sends one
    user message per chunk).

    Wire response assertion: 200 status + ``choices[0].message.content``
    is a non-empty string. The 6-field OpenAI envelope is the contract.
    """
    user_message = next(
        (m for m in reversed(body.messages) if m.role == "user"),
        body.messages[-1],
    )
    # Deterministic chunk_id so the wire-level id marker is stable
    # across calls. The SHA1 prefix is unique per (model, content)
    # pair; the suffix makes the id opaque-looking without changing
    # the wiring.
    chunk_id = (
        "chat_"
        + hashlib.sha1((body.model + "|" + user_message.content).encode("utf-8")).hexdigest()[:16]
    )
    # Minimal D-07 wrapper: parse the input as HTML, wrap every text
    # node in ``<span xml:lang="auto">``, and inject ``id={chunk_id}``
    # on the first ``<p>`` (or fallback structural element). Mirrors
    # the in-process ``MockTranslationAdapter`` shape so the wire
    # contract is the same.
    soup = BeautifulSoup(user_message.content, "html5lib")
    for text_node in list(soup.find_all(string=True)):
        if not text_node.parent:
            continue
        wrap = soup.new_tag("span", attrs={"xml:lang": "auto"})
        wrap.string = str(text_node)
        text_node.replace_with(wrap)
    # Inject id on the first structural element.
    for name in ("p", "h1", "h2", "h3", "h4", "h5", "h6"):
        target = soup.find(name)
        if target is not None:
            target["id"] = chunk_id
            break
    translated = str(soup)
    # 3 tokens / 100 chars is a coarse approximation good enough for
    # the mock. Real OpenAI returns the actual token count; the
    # front-end does not consume this field.
    prompt_tokens = max(1, len(user_message.content) // 4)
    completion_tokens = max(1, len(translated) // 4)
    return _ChatResponse(
        id="chatcmpl-" + chunk_id,
        created=int(time.time()),
        model=body.model,
        choices=[
            _ChatChoice(
                index=0,
                message=_ChatMessage(role="assistant", content=translated),
                finish_reason="stop",
            ),
        ],
        usage=_Usage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        ),
    )


@app.post("/v1/audio/speech")
async def audio_speech(body: _SpeechBody) -> Response:
    """Synthesize speech per the OpenAI shape.

    Inlines a minimal 1 s 16 kHz 16-bit mono silent WAV (the
    in-process ``MockTTSAdapter`` lives in ``tests/`` per BACK-01).
    The handler returns the raw bytes with ``Content-Type: audio/wav``
    (or ``audio/mpeg`` for ``response_format=mp3`` — the bytes are
    still WAV; the mock simplification matches CONVENTIONS.md).
    """
    # Minimal 1 s 16 kHz 16-bit mono silent WAV — mirrors the D-01
    # contract the in-process ``MockTTSAdapter`` returns.
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00" * (16000 * 2))  # 1 second of silence
    audio_bytes = buf.getvalue()
    media_type = "audio/mpeg" if body.response_format == "mp3" else "audio/wav"
    return Response(content=audio_bytes, media_type=media_type)


@app.get("/v1/models", response_model=_ModelsResponse)
async def models() -> _ModelsResponse:
    """Return the union of the Ollama + OpenAI canned model lists."""
    data = [
        _ModelEntry(id="translategemma:12b", owned_by="ollama"),
        _ModelEntry(id="translategemma:27b", owned_by="ollama"),
        _ModelEntry(id="llama3.1:8b", owned_by="ollama"),
        _ModelEntry(id="gpt-4o-mini", owned_by="openai"),
        _ModelEntry(id="gpt-4o", owned_by="openai"),
    ]
    return _ModelsResponse(data=data)


@app.get("/healthz", response_model=_HealthResponse)
async def healthz() -> _HealthResponse:
    """Liveness probe — ``{"status": "ok"}`` for compose healthcheck + CI smoke."""
    return _HealthResponse(status="ok")


# ── Ollama-shaped endpoints ──────────────────────────────────────


@app.get("/api/tags", response_model=_OllamaListResponse)
async def ollama_tags() -> _OllamaListResponse:
    """Return the canned Ollama model catalog in the Ollama shape.

    The mock returns a fixed 3-model list (translategemma 12b + 27b
    + llama3.1:8b), projected into the Ollama ``ModelSummary`` shape
    per the spec example in ``docs/ollama-models-spec.yml``. The
    ``size`` + ``digest`` are zeroed (the mock has no actual model
    blobs); the production wire shape is preserved.
    """
    canned = [
        _OllamaModelSummary(
            name="translategemma:12b",
            model="translategemma:12b",
            modified_at="2025-10-03T23:34:03.409490317Z",
            details=_OllamaModelDetails(
                family="translategemma",
                families=["translategemma"],
                parameter_size="12B",
            ),
        ),
        _OllamaModelSummary(
            name="translategemma:27b",
            model="translategemma:27b",
            modified_at="2025-10-03T23:34:03.409490317Z",
            details=_OllamaModelDetails(
                family="translategemma",
                families=["translategemma"],
                parameter_size="27B",
            ),
        ),
        _OllamaModelSummary(
            name="llama3.1:8b",
            model="llama3.1:8b",
            modified_at="2025-10-03T23:34:03.409490317Z",
            details=_OllamaModelDetails(
                family="llama",
                families=["llama"],
                parameter_size="8B",
            ),
        ),
    ]
    return _OllamaListResponse(models=canned)


@app.post("/api/generate", response_model=_GenerateResponse)
async def ollama_generate(body: _GenerateBody) -> _GenerateResponse:
    """Generate a response per the Ollama shape (non-stream only).

    The mock echoes the model + returns a canned canned-translation
    string. The streaming variant (``stream: true``) returns 400 —
    the sprint mock is non-stream only; production streaming is
    out of scope and documented in the module docstring.
    """
    if body.stream:
        # The streaming variant is not implemented in the mock.
        # Return 400 with a deterministic envelope; production
        # callers should set ``stream=False`` (the Ollama Python
        # client's ``generate()`` helper does so by default per
        # the API surface).
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "streaming_not_supported",
                    "message": "The mock LLM service does not implement stream=true; set stream=false.",
                }
            },
        )
    # Wrap the prompt in the D-07 ``<span xml:lang="...">`` wrapper
    # + chunk_id marker so the wire shape matches the
    # ``/v1/chat/completions`` response. The upstream Ollama
    # translation workflow treats both shapes as equivalent.
    chunk_id = (
        "gen_" + hashlib.sha1((body.model + "|" + body.prompt).encode("utf-8")).hexdigest()[:16]
    )
    soup = BeautifulSoup(body.prompt, "html5lib")
    for text_node in list(soup.find_all(string=True)):
        if not text_node.parent:
            continue
        wrap = soup.new_tag("span", attrs={"xml:lang": "auto"})
        wrap.string = str(text_node)
        text_node.replace_with(wrap)
    for name in ("p", "h1", "h2", "h3", "h4", "h5", "h6"):
        target = soup.find(name)
        if target is not None:
            target["id"] = chunk_id
            break
    response_text = str(soup)
    return _GenerateResponse(
        model=body.model,
        created_at=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        response=response_text,
    )


# ── Boot ─────────────────────────────────────────────────────────


def main() -> None:
    """Boot uvicorn on ``127.0.0.1:$MOCK_LLM_PORT`` (default 8765).

    The 127.0.0.1 bind is the SECURITY DEFAULT for local dev
    (loopback only). The docker-compose service overrides to
    ``0.0.0.0`` so the bridge-network container can reach it. The
    CI smoke uses 127.0.0.1.
    """
    uvicorn.run(
        "epubtv.tools.mock_llm_service:app",
        host=os.environ.get("MOCK_LLM_HOST", "127.0.0.1"),
        port=int(os.environ.get("MOCK_LLM_PORT", "8765")),
        log_level="info",
    )


if __name__ == "__main__":
    main()


__all__: list[str] = ["app", "main"]
