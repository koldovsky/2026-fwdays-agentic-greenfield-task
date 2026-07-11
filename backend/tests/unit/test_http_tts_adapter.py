"""``HttpTTSAdapter`` unit tests (TTS-01, plan 01-02).

The base ``HttpTTSAdapter`` is non-overridable per TTS-01. The
``model`` parameter has no default; ``synthesize(...)`` raises
``NotImplementedError``. The per-subclass behaviour is covered in
``test_openai_http_tts_adapter.py``.

Behaviours (locked by TTS-01 + Pitfall 5 + plan 01-02):
- ``test_trailing_slash_guarded_on_init`` — ``__init__`` forces
  ``base_url`` to end with a single ``/`` regardless of input
  (Pitfall 5 — silent 307 redirect otherwise). The new contract
  REQUIRES the caller to pass ``model=`` explicitly (no default).
- ``test_model_parameter_has_no_default`` — instantiating the base
  class without ``model=...`` raises ``TypeError`` (loud failure).
- ``test_synthesize_raises_not_implemented_error`` — ``synthesize(...)``
  raises ``NotImplementedError`` with a class-qualified message.
- ``test_aclose_closes_underlying_client`` — ``aclose()`` closes
  the underlying ``httpx.AsyncClient`` (lifespan shutdown).
- ``test_timeout_is_60s_with_5s_connect`` — the ``httpx.Timeout``
  is 60.0 read / 5.0 connect per D-08.
- ``test_wav_duration_seconds_1s`` — the ``_wav_duration_seconds``
  helper returns 1.0 for a 1s WAV.
- ``test_wav_duration_seconds_short_input_falls_back_to_byte_approx``
  — short / non-RIFF inputs fall back to the byte-size
  approximation.
"""

from __future__ import annotations

import asyncio

import httpx
import pytest

from epubtv.adapters.tts.http_tts_adapter import HttpTTSAdapter, _wav_duration_seconds

pytestmark = pytest.mark.tcid("VOICE-01-UT04")


def _build_client(handler: httpx.MockTransport) -> httpx.AsyncClient:
    """Build a stubbed ``httpx.AsyncClient`` for unit tests (Pitfall 5)."""
    return httpx.AsyncClient(transport=handler, base_url="http://mock")


def test_trailing_slash_guarded_on_init() -> None:
    """``__init__`` forces a single trailing ``/`` on ``base_url``.

    The new contract REQUIRES the caller to pass ``model=...`` (no
    default). The trailing-slash guard is preserved from the v1.1
    base class.
    """
    adapter = HttpTTSAdapter(base_url="http://mock:8766", model="tts-1")
    assert str(adapter._client.base_url).endswith("/")
    # already-trailing input does NOT become double-slashed
    adapter2 = HttpTTSAdapter(base_url="http://mock:8766/", model="tts-1")
    assert str(adapter2._client.base_url).endswith("/")
    assert not str(adapter2._client.base_url).endswith("//")


def test_model_parameter_has_no_default() -> None:
    """The ``model`` parameter has no default — instantiating without it raises ``TypeError``.

    Regression guard for TTS-01: a caller that instantiates
    ``HttpTTSAdapter(base_url=...)`` without ``model=...`` must get
    a loud ``TypeError`` from the missing positional argument (the
    previous ``model: str = "tts-1"`` default was removed).
    """
    with pytest.raises(TypeError, match="model"):
        HttpTTSAdapter(base_url="http://mock:8766")  # type: ignore[call-arg]


def test_synthesize_raises_not_implemented_error() -> None:
    """``synthesize(...)`` on the base class raises ``NotImplementedError`` with a class-qualified message."""
    adapter = HttpTTSAdapter(base_url="http://mock:8766", model="tts-1")

    async def run() -> tuple[bytes, float]:
        return await adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="hello",
            source_language="en",
            target_language="en",
            voice="alloy",
        )

    with pytest.raises(NotImplementedError, match="HttpTTSAdapter is a base class"):
        asyncio.run(run())


def test_aclose_closes_underlying_client() -> None:
    """``aclose()`` closes the underlying ``httpx.AsyncClient``."""
    test_client = _build_client(httpx.MockTransport(lambda req: httpx.Response(200)))
    adapter = HttpTTSAdapter(base_url="http://mock", model="tts-1", client=test_client)
    asyncio.run(adapter.aclose())
    assert test_client.is_closed is True


def test_timeout_is_60s_with_5s_connect() -> None:
    """Default ``httpx.Timeout`` is 60.0 read + 5.0 connect (D-08)."""
    adapter = HttpTTSAdapter(base_url="http://mock:8766", model="tts-1")
    assert adapter._client.timeout.read == 60.0
    assert adapter._client.timeout.connect == 5.0


def test_wav_duration_seconds_1s() -> None:
    """``_wav_duration_seconds`` returns 1.0 for a 1s WAV."""
    sample_rate = 16000
    audio_size = sample_rate * 2  # 1s of audio
    wav = b"RIFF" + (audio_size + 36).to_bytes(4, "little") + b"WAVEfmt "
    wav += b"\x10\x00\x00\x00\x01\x00\x01\x00" + sample_rate.to_bytes(4, "little")
    wav += (sample_rate * 2).to_bytes(4, "little") + b"\x02\x00\x10\x00data"
    wav += audio_size.to_bytes(4, "little") + b"\x00" * audio_size
    assert _wav_duration_seconds(wav) == pytest.approx(1.0, abs=0.01)


def test_wav_duration_seconds_short_input_falls_back_to_byte_approx() -> None:
    """Inputs smaller than a WAV header fall back to the byte-size approximation."""
    # 32000 bytes of raw data (no header) = 1s at 16 kHz 16-bit mono.
    raw = b"\x00" * 32000
    assert _wav_duration_seconds(raw) == pytest.approx(1.0, abs=0.01)
