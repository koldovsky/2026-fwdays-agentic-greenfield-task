"""MockTTSAdapter unit tests (Task 3 TDD cycle).

The in-process ``MockTTSAdapter`` moved to ``tests/unit/_adapters/``
as a test-only fixture (BACK-01, plan 01-02). The ``AdapterBehaviour``
Pydantic model lives in
``backend/tests/unit/_adapters/behaviour.py`` (test-only fixture, quick
260709-9yk move from ``backend/src/epubtv/application/behaviour.py``;
the mock consumes it for all four modes).

Locks the D-01 16 kHz + 1 s contract + D-02 behaviour gating + D-03
4096 chunk-size seam:
- 1-second silent WAV at 16 kHz (the test seam for AudioStitcher's
  ±50ms assertion).
- ``len(text) > 4096`` raises ``AssertionError`` with chunk_id +
  actual length in the message (D-03 chunk-size seam).
- The assertion is NOT swallowed by a `try/except` (regression guard).
- Behaviour gating: ``timeout`` raises ``TimeoutError``;
  ``fail_once_then_succeed`` raises on first call + succeeds on
  second (per-chunk counter keyed on ``chunk_id``); ``slow`` sleeps
  via ``virtual_clock`` (real-time would be 60s in prod).
- The synthesized bytes round-trip through pydub ``from_wav`` +
  ``export`` lossless.

Length seam (research §Length Control; the ``chunk_N:length=Ns`` token
on ``MOCK_TTS_BEHAVIOUR``):
- ``test_synthesize_with_length_returns_white_noise_of_configured_duration``
  — mapped length → 16 kHz 16-bit mono PCM of the configured
  duration; ``frame_rate == 16000`` + ``sample_width == 2``.
- ``test_synthesize_unmapped_chunk_keeps_default_1s_silent`` — sanity
  guard: empty ``length_seconds`` map → D-01 default 1 s silent WAV.
- ``test_synthesize_length_seam_runs_after_chunk_size_assertion`` —
  regression guard: a chunk with ``len(text) > 4096`` STILL raises
  ``AssertionError`` even when the length-seam is set.
- ``test_synthesize_length_seam_runs_after_behaviour_gating`` —
  regression guard: ``behaviour={"...": "timeout", "...": length=...}``
  raises ``TimeoutError`` first, never falls through to white noise.

The tests use pydub directly to round-trip-assert the bytes; this
is independent of any downstream stitcher assertion.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest
from pydub import AudioSegment

# Make ``_adapters`` (the test-only seam at tests/unit/_adapters/)
# importable as a top-level module.
_TESTS_UNIT_DIR = Path(__file__).resolve().parent
if str(_TESTS_UNIT_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_UNIT_DIR))

from _adapters.behaviour import AdapterBehaviour  # noqa: E402
from _adapters.test_mock_tts_adapter import MockTTSAdapter  # noqa: E402

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-01-UT04")]


# ---------------------------------------------------------------------------
# D-01: 1-second silent WAV at 16 kHz
# ---------------------------------------------------------------------------


async def test_synthesize_returns_1_second_16khz_silent_wav() -> None:
    """``synthesize`` returns ``(bytes, 1.0)``; bytes decode to 16 kHz 1 s WAV."""
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour())
    result = await adapter.synthesize(
        chunk_id="vo_ch1_a0",
        text="hello world",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    assert isinstance(result, tuple) and len(result) == 2
    audio_bytes, duration = result
    assert isinstance(audio_bytes, bytes) and len(audio_bytes) > 0
    assert duration == 1.0, f"duration should be exactly 1.0, got {duration}"

    # Round-trip through pydub and assert 16 kHz + 1 s (D-01 contract).
    decoded = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    assert decoded.frame_rate == 16000, (
        f"frame_rate should be 16000 (D-01), got {decoded.frame_rate}"
    )
    assert decoded.duration_seconds == pytest.approx(1.0, abs=0.01), (
        f"duration_seconds should be 1.0 (D-01), got {decoded.duration_seconds}"
    )


async def test_synthesize_deterministic_second_call() -> None:
    """A second call returns the same shape (mock is deterministic)."""
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour())
    r1 = await adapter.synthesize(
        chunk_id="vo_ch1_a0",
        text="hello",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    r2 = await adapter.synthesize(
        chunk_id="vo_ch1_a1",
        text="world",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    assert r1[1] == 1.0
    assert r2[1] == 1.0
    # The mock is silent + 16 kHz, so bytes are byte-for-byte identical.
    # (D-01: deterministic silent-audio — Phase 2 MockTranslationAdapter parity.)


# ---------------------------------------------------------------------------
# D-03: 4096 chunk-size seam
# ---------------------------------------------------------------------------


async def test_synthesize_asserts_len_text_le_4096() -> None:
    """``len(text) > 4096`` raises ``AssertionError`` with chunk_id + length."""
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour())
    with pytest.raises(AssertionError) as excinfo:
        await adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="x" * 4097,
            source_language="en",
            target_language="en",
            voice="alloy",
        )
    msg = str(excinfo.value)
    assert "vo_ch1_a0" in msg, f"AssertionError must include chunk_id, got: {msg!r}"
    assert "4097" in msg, f"AssertionError must include actual length, got: {msg!r}"


async def test_synthesize_assertion_is_not_swallowed() -> None:
    """The D-03 ``AssertionError`` propagates uncaught.

    Regression guard: a future ``try/except BaseException: pass`` would
    defeat the chunk-size seam (a 5000-char chunk would silently
    synthesize instead of failing at this gate).
    """
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour())
    # No try/except in this test — pytest.raises below asserts the
    # exception reaches the test runner.
    with pytest.raises(AssertionError):
        await adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="x" * 5000,  # way over 4096
            source_language="en",
            target_language="en",
            voice="alloy",
        )


# ---------------------------------------------------------------------------
# D-02: behaviour gating
# ---------------------------------------------------------------------------


async def test_synthesize_timeout_mode_raises() -> None:
    """``behaviour={"vo_ch1_a0": "timeout"}`` raises ``TimeoutError`` (D-02)."""
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour(behaviour={"vo_ch1_a0": "timeout"}))
    with pytest.raises(TimeoutError):
        await adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="hello",
            source_language="en",
            target_language="en",
            voice="alloy",
        )


async def test_synthesize_fail_once_then_succeed() -> None:
    """First call raises ``RuntimeError``; second call succeeds (D-02).

    Per-chunk counter is keyed on the full ``chunk_id`` — a different
    chunk_id starts the counter fresh.
    """
    adapter = MockTTSAdapter(
        behaviour=AdapterBehaviour(behaviour={"vo_ch1_a0": "fail_once_then_succeed"})
    )
    # First call: RuntimeError
    with pytest.raises(RuntimeError):
        await adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="hello",
            source_language="en",
            target_language="en",
            voice="alloy",
        )
    # Second call: succeeds
    result = await adapter.synthesize(
        chunk_id="vo_ch1_a0",
        text="hello",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    assert result[1] == 1.0
    assert isinstance(result[0], bytes) and len(result[0]) > 0

    # A different chunk_id has its own counter (starts fresh).
    other = MockTTSAdapter(
        behaviour=AdapterBehaviour(behaviour={"vo_ch1_a1": "fail_once_then_succeed"})
    )
    with pytest.raises(RuntimeError):
        await other.synthesize(
            chunk_id="vo_ch1_a1",
            text="hello",
            source_language="en",
            target_language="en",
            voice="alloy",
        )


async def test_synthesize_slow_mode_with_virtual_clock(
    virtual_clock: dict[str, float],
) -> None:
    """``behaviour=slow`` returns normally; ``virtual_clock`` short-circuits the sleep.

    The production path sleeps for ``slow_mode_sleep_seconds`` (60 s
    default). The test uses the ``virtual_clock`` fixture from
    ``tests/conftest.py`` so the test runs sub-second.
    """
    adapter = MockTTSAdapter(
        behaviour=AdapterBehaviour(behaviour={"vo_ch1_a0": "slow"}, slow_mode_sleep_seconds=0.5)
    )
    result = await adapter.synthesize(
        chunk_id="vo_ch1_a0",
        text="hello",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    assert result[1] == 1.0
    assert isinstance(result[0], bytes) and len(result[0]) > 0
    # virtual_clock accumulates the sleep seconds
    assert virtual_clock["slept"] == pytest.approx(0.5, abs=0.01)


# ---------------------------------------------------------------------------
# Bytes round-trip via pydub
# ---------------------------------------------------------------------------


async def test_synthesize_bytes_round_trip_through_pydub() -> None:
    """Synthesized bytes re-decode + re-export through pydub without error.

    Guards against header corruption or sample-rate drift in the
    re-encoding path.
    """
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour())
    audio_bytes, _ = await adapter.synthesize(
        chunk_id="vo_ch1_a0",
        text="hello",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    decoded = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    assert decoded.frame_rate == 16000
    assert decoded.duration_seconds == pytest.approx(1.0, abs=0.01)
    # Re-export and re-decode to confirm the WAV header is well-formed.
    out = io.BytesIO()
    decoded.export(out, format="wav")
    re_exported = AudioSegment.from_wav(io.BytesIO(out.getvalue()))
    assert re_exported.frame_rate == 16000
    assert re_exported.duration_seconds == pytest.approx(1.0, abs=0.01)


# ---------------------------------------------------------------------------
# Length seam (research §Length Control).
# ---------------------------------------------------------------------------


async def test_synthesize_with_length_returns_white_noise_of_configured_duration() -> None:
    """``length_seconds={"vo_ch1_a0": 2.5}`` returns 16 kHz 16-bit mono white noise of 2.5 s.

    Mapped chunks render uniform white noise via stdlib ``wave`` +
    ``random``. The D-01 contract (16 kHz + 16-bit + mono) still
    holds; the only difference vs the silent default is the
    duration + the audio content. The contract return value
    carries the actual rendered duration, not the input, so
    callers do not need to round-trip the result.
    """
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour(length_seconds={"vo_ch1_a0": 2.5}))
    audio_bytes, duration = await adapter.synthesize(
        chunk_id="vo_ch1_a0",
        text="hello",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    assert isinstance(audio_bytes, bytes) and len(audio_bytes) > 0
    # 2.5 s * 16 kHz = 40_000 samples; rendered duration is exact.
    assert duration == pytest.approx(2.5, abs=0.01)

    # Round-trip via pydub to confirm the WAV header is well-formed
    # and the format is locked to 16 kHz / mono / 16-bit.
    decoded = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    assert decoded.frame_rate == 16000
    assert decoded.channels == 1
    assert decoded.sample_width == 2
    assert decoded.duration_seconds == pytest.approx(2.5, abs=0.01)


async def test_synthesize_unmapped_chunk_keeps_default_1s_silent() -> None:
    """Empty ``length_seconds`` map → D-01 default 1 s silent WAV (no regression).

    Sanity guard: the new length seam does not change the default
    path for chunks that are not present in the map.
    """
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour(length_seconds={}))
    audio_bytes, duration = await adapter.synthesize(
        chunk_id="vo_ch1_a0",
        text="hello",
        source_language="en",
        target_language="en",
        voice="alloy",
    )
    assert duration == 1.0
    decoded = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    assert decoded.frame_rate == 16000
    assert decoded.duration_seconds == pytest.approx(1.0, abs=0.01)


async def test_synthesize_length_seam_runs_after_chunk_size_assertion() -> None:
    """A chunk with ``len(text) > 4096`` STILL raises ``AssertionError`` even when length-seam is set.

    Regression guard: the D-03 chunk-size assertion must run BEFORE
    the length lookup, otherwise a too-large chunk would silently
    render white noise instead of failing at this seam.
    """
    adapter = MockTTSAdapter(behaviour=AdapterBehaviour(length_seconds={"vo_ch1_a0": 2.5}))
    with pytest.raises(AssertionError) as excinfo:
        await adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="x" * 4097,
            source_language="en",
            target_language="en",
            voice="alloy",
        )
    msg = str(excinfo.value)
    assert "vo_ch1_a0" in msg
    assert "4097" in msg


async def test_synthesize_length_seam_runs_after_behaviour_gating() -> None:
    """``behaviour={"...": "timeout", "...": length=...}`` raises ``TimeoutError`` first.

    Regression guard: a chunk with both ``behaviour=timeout`` and
    ``length_seconds=2.5`` must fail with ``TimeoutError`` BEFORE
    the length-seam white-noise path runs.
    """
    adapter = MockTTSAdapter(
        behaviour=AdapterBehaviour(
            behaviour={"vo_ch1_a0": "timeout"},
            length_seconds={"vo_ch1_a0": 2.5},
        )
    )
    with pytest.raises(TimeoutError):
        await adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="hello",
            source_language="en",
            target_language="en",
            voice="alloy",
        )
