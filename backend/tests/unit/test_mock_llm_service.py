"""Unit tests for the consolidated ``mock_llm_service`` (D-05, plan 04 + plan 260711-1ww).

8 tests using FastAPI's ``TestClient``:
- ``test_chat_completions_returns_openai_shape`` — POST
  ``/v1/chat/completions`` with a valid body → 200 + the 7-field
  OpenAI envelope + ``choices[0].message.content`` is a non-empty
  string.
- ``test_chat_completions_rejects_extra_fields`` — POST with an
  extra field → 422 (Pydantic ``extra="forbid"``).
- ``test_audio_speech_returns_wav_bytes`` — POST ``/v1/audio/speech``
  with a valid body → 200 + ``Content-Type: audio/wav`` + the
  response body starts with ``b"RIFF"`` (WAV magic).
- ``test_audio_speech_chunk_size_within_limit`` — assert that the
  mock's output respects the 4096-char input cap (mirrors the D-03
  contract).
- ``test_models_returns_combined_catalog`` — GET ``/v1/models`` →
  200 + the data array has BOTH ``translategemma:12b`` +
  ``gpt-4o-mini``.
- ``test_audio_voices_full_catalog`` — GET ``/v1/audio/voices`` →
  200 + ``voices_by_language`` has at least 1 language.
- ``test_audio_voices_single_language`` — GET
  ``/v1/audio/voices?language=en`` → 200 + ``voices`` is a non-empty
  list.
- ``test_healthz_returns_ok`` — GET ``/healthz`` → 200 +
  ``{"status": "ok"}``.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from epubtv.tools.mock_llm_service import app

pytestmark = pytest.mark.tcid("INFRA-07-UT01")


def test_chat_completions_returns_openai_shape() -> None:
    """POST /v1/chat/completions with a valid body → 200 + the 7-field OpenAI envelope."""
    with TestClient(app) as client:
        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "translategemma:12b",
                "messages": [{"role": "user", "content": "<p>Hello</p>"}],
            },
        )
    assert response.status_code == 200
    body = response.json()
    # 7-field OpenAI envelope
    assert set(body.keys()) == {"id", "object", "created", "model", "choices", "usage"}
    assert body["object"] == "chat.completion"
    assert body["model"] == "translategemma:12b"
    # The single choice carries the translated text in the assistant
    # message content.
    assert len(body["choices"]) == 1
    assert body["choices"][0]["index"] == 0
    assert body["choices"][0]["finish_reason"] == "stop"
    content = body["choices"][0]["message"]["content"]
    assert content
    # The in-process MockTranslationAdapter wraps the source text
    # in <span xml:lang="..."> + the chunk_id marker. The
    # consolidated service is a 1:1 HTTP wrapper — the content
    # must contain the wrapper.
    assert "xml:lang" in content
    # Token usage envelope
    usage = body["usage"]
    assert set(usage.keys()) == {"prompt_tokens", "completion_tokens", "total_tokens"}
    assert usage["prompt_tokens"] >= 1
    assert usage["completion_tokens"] >= 1
    assert usage["total_tokens"] == usage["prompt_tokens"] + usage["completion_tokens"]


def test_chat_completions_rejects_extra_fields() -> None:
    """POST with an extra field → 422 (Pydantic extra='forbid')."""
    with TestClient(app) as client:
        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "translategemma:12b",
                "messages": [{"role": "user", "content": "Hello"}],
                "extra": "x",
            },
        )
    assert response.status_code == 422


def test_audio_speech_returns_wav_bytes() -> None:
    """POST /v1/audio/speech with a valid body → 200 + Content-Type: audio/wav + RIFF magic."""
    with TestClient(app) as client:
        response = client.post(
            "/v1/audio/speech",
            json={
                "model": "tts-1",
                "input": "Hello world",
                "voice": "alloy",
            },
        )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    # The in-process MockTTSAdapter returns a 16 kHz 16-bit mono PCM
    # WAV. The first 4 bytes are the RIFF magic.
    assert response.content[:4] == b"RIFF"


def test_audio_speech_chunk_size_within_limit() -> None:
    """D-03: the mock's input cap is 4096 chars; inputs above the cap return 422."""
    # Build an input above the cap.
    big_input = "a" * 5000
    with TestClient(app) as client:
        response = client.post(
            "/v1/audio/speech",
            json={
                "model": "tts-1",
                "input": big_input,
                "voice": "alloy",
            },
        )
    # The schema enforces min_length=1, max_length=4096 on input.
    assert response.status_code == 422


def test_models_returns_combined_catalog() -> None:
    """GET /v1/models → 200 + the data array has BOTH translategemma:12b + gpt-4o-mini."""
    with TestClient(app) as client:
        response = client.get("/v1/models")
    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "list"
    ids = [entry["id"] for entry in body["data"]]
    assert "translategemma:12b" in ids
    assert "gpt-4o-mini" in ids


# Quick 20260711-0847 / ADR 0015: the per-language
# ``GET /v1/audio/voices`` endpoint was retired with the canned
# provider voices (the canonical voice catalog is a single flat
# list served by ``GET /api/v1/voices`` on the backend, not by the
# mock service). The mock service does not expose a voice catalog.


def test_healthz_returns_ok() -> None:
    """GET /healthz → 200 + {"status": "ok"}."""
    with TestClient(app) as client:
        response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ollama_tags_returns_ollama_shape() -> None:
    """GET /api/tags → 200 + the Ollama ModelSummary shape + at least 1 model."""
    with TestClient(app) as client:
        response = client.get("/api/tags")
    assert response.status_code == 200
    body = response.json()
    assert "models" in body
    assert len(body["models"]) >= 1
    # Every model must carry the Ollama ``ModelSummary`` fields.
    for entry in body["models"]:
        assert "name" in entry
        assert "model" in entry
        assert "modified_at" in entry
        assert "size" in entry
        assert "details" in entry
        details = entry["details"]
        assert "format" in details
        assert "family" in details
        assert "parameter_size" in details
    # The canned list must include the sprint Ollama models.
    names = [entry["name"] for entry in body["models"]]
    assert "translategemma:12b" in names


def test_ollama_generate_echoes_model() -> None:
    """POST /api/generate with stream=false → 200 + Ollama GenerateResponse shape + D-07 wrapper."""
    with TestClient(app) as client:
        response = client.post(
            "/api/generate",
            json={"model": "translategemma:12b", "prompt": "<p>Hello</p>", "stream": False},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "translategemma:12b"
    assert body["done"] is True
    assert body["done_reason"] == "stop"
    # The D-07 wrapper + chunk_id marker must be present in the response.
    assert "xml:lang" in body["response"]


def test_ollama_generate_stream_rejected() -> None:
    """POST /api/generate with stream=true → 400 (not implemented in the mock)."""
    with TestClient(app) as client:
        response = client.post(
            "/api/generate",
            json={"model": "translategemma:12b", "prompt": "Hello", "stream": True},
        )
    assert response.status_code == 400
    assert "streaming_not_supported" in str(response.json())


def test_ollama_generate_rejects_extra_fields() -> None:
    """POST /api/generate with an extra field → 422 (Pydantic extra='forbid')."""
    with TestClient(app) as client:
        response = client.post(
            "/api/generate",
            json={"model": "translategemma:12b", "prompt": "Hello", "stray_field": "x"},
        )
    assert response.status_code == 422
