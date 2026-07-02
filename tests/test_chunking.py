"""Tests for audio chunking."""

import json
from pathlib import Path

from pydub import AudioSegment
from pydub.generators import Sine

from app.config.settings import Settings
from app.services.chunking import (
    MIN_COVERAGE_RATIO,
    _chunk_coverage_ratio,
    _ranges_to_chunks,
    chunk_audio_file,
    save_debug_audio_chunks,
)


def _build_test_audio(path: Path, duration_ms: int = 125_000) -> None:
    tone = Sine(440).to_audio_segment(duration=1000)
    silence = AudioSegment.silent(duration=700)
    audio = AudioSegment.empty()
    while len(audio) < duration_ms:
        audio += tone + silence
    audio = audio[:duration_ms]
    audio.export(path, format="wav")


def _build_multi_range_audio(path: Path, duration_ms: int = 120_000) -> None:
    """Audio with separated speech segments spread across the timeline."""
    tone = Sine(440).to_audio_segment(duration=1000)
    silence = AudioSegment.silent(duration=1000)
    audio = AudioSegment.silent(duration=duration_ms)
    for segment_start in (0, 40_000, 80_000):
        segment = AudioSegment.empty()
        while len(segment) < 15_000:
            segment += tone + silence
        segment = segment[:15_000]
        audio = audio.overlay(segment, position=segment_start)
    audio.export(path, format="wav")


def _build_mostly_silent_audio(path: Path, duration_ms: int = 120_000) -> None:
    """Mostly silent audio with a single short speech island."""
    tone = Sine(440).to_audio_segment(duration=1000)
    audio = AudioSegment.silent(duration=duration_ms)
    audio = audio.overlay(tone, position=27_000)
    audio.export(path, format="wav")


def test_chunk_audio_respects_max_duration(tmp_path: Path) -> None:
    audio_path = tmp_path / "sample.wav"
    _build_test_audio(audio_path)
    settings = Settings(max_chunk_duration_seconds=60, silence_detection_enabled=False)

    chunks = chunk_audio_file(audio_path, settings)

    assert chunks
    for chunk in chunks:
        assert chunk.end_seconds - chunk.start_seconds <= 60.0


def test_chunk_audio_preserves_timing(tmp_path: Path) -> None:
    audio_path = tmp_path / "sample.wav"
    _build_test_audio(audio_path, duration_ms=30_000)
    settings = Settings(max_chunk_duration_seconds=60, silence_detection_enabled=True)

    chunks = chunk_audio_file(audio_path, settings)

    assert chunks
    assert chunks[0].start_seconds >= 0.0
    assert chunks[-1].end_seconds <= 30.0


def test_chunk_audio_fallback_to_fixed_length(tmp_path: Path) -> None:
    audio_path = tmp_path / "sample.wav"
    _build_test_audio(audio_path, duration_ms=90_000)
    settings = Settings(max_chunk_duration_seconds=60, silence_detection_enabled=False)

    chunks = chunk_audio_file(audio_path, settings)

    assert len(chunks) >= 2


def test_save_debug_audio_chunks_writes_files(tmp_path: Path) -> None:
    audio_path = tmp_path / "sample.wav"
    _build_test_audio(audio_path, duration_ms=90_000)
    settings = Settings(max_chunk_duration_seconds=60, silence_detection_enabled=False)
    chunks = chunk_audio_file(audio_path, settings)
    output_dir = tmp_path / "output"
    video_id = "abc12345678"

    debug_dir = save_debug_audio_chunks(chunks, output_dir, video_id)

    assert debug_dir == output_dir / "debug_audio" / video_id
    wav_files = list(debug_dir.glob("chunk_*.wav"))
    assert len(wav_files) == len(chunks)
    manifest = json.loads((debug_dir / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["video_id"] == video_id
    assert manifest["chunk_count"] == len(chunks)
    assert len(manifest["chunks"]) == len(chunks)


def test_ranges_to_chunks_preserves_multiple_separated_ranges() -> None:
    audio = AudioSegment.silent(duration=120_000)
    tone = Sine(440).to_audio_segment(duration=1000)
    for position in (5_000, 45_000, 85_000):
        audio = audio.overlay(tone, position=position)

    ranges = [(5_000, 6_000), (45_000, 46_000), (85_000, 86_000)]
    chunks = _ranges_to_chunks(audio, ranges, max_duration_seconds=60)

    assert len(chunks) == 3
    assert [chunk.start_seconds for chunk in chunks] == [5.0, 45.0, 85.0]


def test_ranges_to_chunks_does_not_drop_earlier_ranges() -> None:
    audio = AudioSegment.silent(duration=120_000)
    tone = Sine(440).to_audio_segment(duration=1000)
    audio = audio.overlay(tone, position=5_000)
    audio = audio.overlay(tone, position=85_000)

    ranges = [(5_000, 6_000), (85_000, 86_000)]
    chunks = _ranges_to_chunks(audio, ranges, max_duration_seconds=60)

    assert len(chunks) == 2
    assert chunks[0].start_seconds == 5.0
    assert chunks[1].start_seconds == 85.0


def test_ranges_to_chunks_respects_max_duration() -> None:
    audio = AudioSegment.silent(duration=200_000)
    tone = Sine(440).to_audio_segment(duration=1000)
    audio = audio.overlay(tone, position=0)

    ranges = [(0, 150_000)]
    chunks = _ranges_to_chunks(audio, ranges, max_duration_seconds=60)

    assert len(chunks) == 3
    assert all(chunk.end_seconds - chunk.start_seconds <= 60.0 for chunk in chunks)
    assert chunks[0].start_seconds == 0.0
    assert chunks[-1].end_seconds == 150.0


def test_low_coverage_triggers_fixed_length_fallback(tmp_path: Path) -> None:
    audio_path = tmp_path / "mostly_silent.wav"
    _build_mostly_silent_audio(audio_path, duration_ms=120_000)
    settings = Settings(max_chunk_duration_seconds=60, silence_detection_enabled=True)

    chunks = chunk_audio_file(audio_path, settings)

    coverage_ratio = _chunk_coverage_ratio(chunks, 120_000)
    assert coverage_ratio >= MIN_COVERAGE_RATIO
    assert len(chunks) >= 2


def test_120s_audio_does_not_collapse_to_single_short_chunk(tmp_path: Path) -> None:
    audio_path = tmp_path / "multi_range.wav"
    _build_multi_range_audio(audio_path, duration_ms=120_000)
    settings = Settings(max_chunk_duration_seconds=60, silence_detection_enabled=True)

    chunks = chunk_audio_file(audio_path, settings)

    total_chunk_duration = sum(
        chunk.end_seconds - chunk.start_seconds for chunk in chunks
    )
    coverage_ratio = total_chunk_duration / 120.0

    assert len(chunks) >= 2
    assert coverage_ratio >= MIN_COVERAGE_RATIO
    assert not (len(chunks) == 1 and total_chunk_duration < 20.0)
