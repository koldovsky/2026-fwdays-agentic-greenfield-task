"""AudioStitcher — pydub per-sentence audio → per-chapter WAV (D-13).

The stitcher takes a list of per-sentence audio bytes (each one a
1-second 16 kHz 16-bit mono silent WAV from ``MockTTSAdapter`` per
D-01) and concatenates them into a single per-chapter WAV. The
stitched duration MUST equal the sum of input durations within
±50ms (the F4 "Stitched chapter audio length equals the sum of
chunk durations" scenario).

Implementation:
- ``AudioSegment.from_wav(BytesIO(seg))`` to decode each input
- ``sum(segs, AudioSegment.empty())`` to concatenate (the canonical
  pydub idiom — pydub normalises sample rate / channels / width
  before concat)
- ``combined.export(BytesIO, format="wav").getvalue()`` to re-encode

The ``chapter_idx`` argument is a Phase 4 forward-compat seam (F6
may use it for per-chapter sub-folder naming) — the stitcher
currently ignores it.
"""

from __future__ import annotations

import io
from functools import reduce
from operator import add

from pydub import AudioSegment

__all__ = ["AudioStitcher"]


class AudioStitcher:
    """pydub-based per-sentence audio → per-chapter WAV stitcher."""

    def stitch(self, chapter_idx: int, audio_segments: list[bytes]) -> bytes:
        """Concatenate ``audio_segments`` into one per-chapter WAV.

        Empty ``audio_segments`` returns 0 bytes (degenerate but
        valid). Each input must be a 16 kHz 16-bit mono WAV (the
        ``MockTTSAdapter`` contract per D-01); mismatched sample
        rates cause pydub to re-sample before concat (no error, no
        quality loss for the mock case).

        The ``chapter_idx`` argument is currently unused (Phase 4
        may thread it into the output file path or per-chapter
        envelope metadata; for Phase 3 the chapter is implicit in
        which job's audio_segments list is being stitched).
        """
        _ = chapter_idx  # forward-compat seam; ignored in Phase 3
        if not audio_segments:
            return b""  # degenerate: no chunks → no audio
        segs = [AudioSegment.from_wav(io.BytesIO(b)) for b in audio_segments]
        # Use ``functools.reduce(operator.add, ...)`` instead of
        # ``sum(segs, AudioSegment.empty())`` because pydub ships no
        # type stubs and pyrefly infers the start argument as ``int``,
        # which makes ``sum`` return ``int`` (and the resulting type
        # error in the next line). ``reduce`` with the explicit
        # ``AudioSegment.empty()`` start keeps the type chain clean.
        combined: AudioSegment = reduce(add, segs[1:], segs[0])
        buf = io.BytesIO()
        combined.export(buf, format="wav")
        return buf.getvalue()
