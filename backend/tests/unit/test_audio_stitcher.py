"""AudioStitcher unit tests (Task 2 TDD cycle).

Locks the D-13 ±50ms stitch contract:
- 3×1-second inputs → stitched duration 3.0 ± 0.05 s.
- 1 input → 1.0 s.
- 0 inputs → 0 bytes (degenerate edge case).
- Stitched output's ``frame_rate == 16000`` (mock contract preserved).
- Stitched output re-stitches through pydub ``from_wav`` without error.

The test fixture builds the 1-second silent WAVs via pydub
directly (no ``MockTTSAdapter`` dependency) so the test stays
isolated from the adapter's behaviour-gating logic.
"""

from __future__ import annotations

import io

import pytest
from pydub import AudioSegment

from epubtv.adapters.audio.audio_stitcher import AudioStitcher

pytestmark = pytest.mark.tcid("VOICE-04-UT03")


def _make_silent_wav(duration_ms: int = 1000, frame_rate: int = 16000) -> bytes:
    """Build a silent WAV of ``duration_ms`` at ``frame_rate`` (D-01 seam)."""
    seg = AudioSegment.silent(duration=duration_ms, frame_rate=frame_rate)
    buf = io.BytesIO()
    seg.export(buf, format="wav")
    return buf.getvalue()


def test_stitch_3_segments_within_50ms_tolerance() -> None:
    """3×1-second inputs → stitched duration 3.0 ± 0.05 s (D-13)."""
    stitcher = AudioStitcher()
    b1, b2, b3 = (_make_silent_wav() for _ in range(3))

    result = stitcher.stitch(chapter_idx=0, audio_segments=[b1, b2, b3])

    decoded = AudioSegment.from_wav(io.BytesIO(result))
    assert decoded.duration_seconds == pytest.approx(3.0, abs=0.050), (
        f"Stitched duration should be 3.0 ± 0.05 s, got {decoded.duration_seconds}"
    )


def test_stitch_single_segment_is_1_second() -> None:
    """1 input → 1.0 s (F4 "single-chunk chapter" scenario)."""
    stitcher = AudioStitcher()
    b1 = _make_silent_wav()

    result = stitcher.stitch(chapter_idx=0, audio_segments=[b1])

    decoded = AudioSegment.from_wav(io.BytesIO(result))
    assert decoded.duration_seconds == pytest.approx(1.0, abs=0.050), (
        f"Stitched duration should be 1.0 ± 0.05 s, got {decoded.duration_seconds}"
    )


def test_stitch_empty_segments_returns_empty_bytes() -> None:
    """0 inputs → 0 bytes (degenerate edge case for F6 download filter)."""
    stitcher = AudioStitcher()

    result = stitcher.stitch(chapter_idx=0, audio_segments=[])

    assert result == b"", f"Empty segments should return 0 bytes, got {len(result)} bytes"


def test_stitch_preserves_16khz_frame_rate() -> None:
    """Stitched output's ``frame_rate == 16000`` (D-01 invariant preserved)."""
    stitcher = AudioStitcher()
    b1, b2 = (_make_silent_wav() for _ in range(2))

    result = stitcher.stitch(chapter_idx=0, audio_segments=[b1, b2])

    decoded = AudioSegment.from_wav(io.BytesIO(result))
    assert decoded.frame_rate == 16000, (
        f"Stitched frame_rate should be 16000, got {decoded.frame_rate}"
    )


def test_stitch_round_trips_through_pydub() -> None:
    """Stitched output re-decodes through pydub without header corruption."""
    stitcher = AudioStitcher()
    b1, b2, b3 = (_make_silent_wav() for _ in range(3))

    result = stitcher.stitch(chapter_idx=0, audio_segments=[b1, b2, b3])
    # Re-decode then re-export to prove the WAV header is well-formed.
    re_decoded = AudioSegment.from_wav(io.BytesIO(result))
    out_buf = io.BytesIO()
    re_decoded.export(out_buf, format="wav")
    re_exported = AudioSegment.from_wav(io.BytesIO(out_buf.getvalue()))
    assert re_exported.duration_seconds == pytest.approx(3.0, abs=0.050)
    assert re_exported.frame_rate == 16000
