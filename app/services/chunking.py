"""Silence-based audio chunking."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from pydub import AudioSegment
from pydub.silence import detect_nonsilent

from app.config.settings import Settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

MIN_COVERAGE_RATIO = 0.60


@dataclass(frozen=True)
class AudioChunk:
    """Audio chunk with preserved timing."""

    index: int
    start_seconds: float
    end_seconds: float
    audio: AudioSegment


def _split_fixed_length(
    audio: AudioSegment,
    max_duration_seconds: int,
) -> list[AudioChunk]:
    max_ms = max_duration_seconds * 1000
    chunks: list[AudioChunk] = []
    start_ms = 0
    index = 0

    while start_ms < len(audio):
        end_ms = min(start_ms + max_ms, len(audio))
        chunk_audio = audio[start_ms:end_ms]
        chunks.append(
            AudioChunk(
                index=index,
                start_seconds=start_ms / 1000.0,
                end_seconds=end_ms / 1000.0,
                audio=chunk_audio,
            )
        )
        index += 1
        start_ms = end_ms

    return chunks


def _append_range_chunks(
    audio: AudioSegment,
    chunks: list[AudioChunk],
    start_ms: int,
    end_ms: int,
    max_ms: int,
    start_index: int,
) -> int:
    """Append chunks covering [start_ms, end_ms) and return the next chunk index."""
    cursor = start_ms
    index = start_index
    while cursor < end_ms:
        slice_end = min(cursor + max_ms, end_ms)
        chunk_audio = audio[cursor:slice_end]
        chunks.append(
            AudioChunk(
                index=index,
                start_seconds=cursor / 1000.0,
                end_seconds=slice_end / 1000.0,
                audio=chunk_audio,
            )
        )
        index += 1
        cursor = slice_end
    return index


def _ranges_to_chunks(
    audio: AudioSegment,
    ranges: list[tuple[int, int]],
    max_duration_seconds: int,
) -> list[AudioChunk]:
    """Build chunks from nonsilent ranges while respecting max duration."""
    if not ranges:
        return []

    max_ms = max_duration_seconds * 1000
    chunks: list[AudioChunk] = []
    index = 0
    range_start = ranges[0][0]
    range_end = ranges[0][1]

    for start_ms, end_ms in ranges[1:]:
        if start_ms > range_end:
            index = _append_range_chunks(
                audio, chunks, range_start, range_end, max_ms, index
            )
            range_start = start_ms
            range_end = end_ms
        else:
            range_end = max(range_end, end_ms)

    _append_range_chunks(audio, chunks, range_start, range_end, max_ms, index)
    return chunks


def _chunk_coverage_ratio(chunks: list[AudioChunk], audio_duration_ms: int) -> float:
    if audio_duration_ms <= 0:
        return 0.0
    total_chunk_ms = sum(
        (chunk.end_seconds - chunk.start_seconds) * 1000 for chunk in chunks
    )
    return total_chunk_ms / audio_duration_ms


def _log_chunking_metrics(
    *,
    audio_duration_seconds: float,
    nonsilent_range_count: int,
    chunks: list[AudioChunk],
    coverage_ratio: float,
    fallback_used: bool,
    strategy: str,
) -> None:
    total_chunk_duration = sum(
        chunk.end_seconds - chunk.start_seconds for chunk in chunks
    )
    logger.info(
        "[chunking] strategy=%s | audio_duration=%.2fs | nonsilent_ranges=%s | "
        "chunk_count=%s | total_chunk_duration=%.2fs | coverage_ratio=%.2f | "
        "fallback=%s",
        strategy,
        audio_duration_seconds,
        nonsilent_range_count,
        len(chunks),
        total_chunk_duration,
        coverage_ratio,
        fallback_used,
    )


def chunk_audio_file(audio_path: Path, settings: Settings) -> list[AudioChunk]:
    """Split audio into ordered chunks with timing metadata."""
    audio = AudioSegment.from_file(audio_path)
    max_duration = settings.max_chunk_duration_seconds
    audio_duration_seconds = len(audio) / 1000.0

    if settings.silence_detection_enabled:
        try:
            nonsilent_ranges = detect_nonsilent(
                audio,
                min_silence_len=settings.silence_min_silence_len_ms,
                silence_thresh=settings.silence_silence_thresh_db,
                seek_step=10,
            )
            if nonsilent_ranges:
                padded_ranges = [
                    (
                        max(0, start - settings.silence_keep_silence_ms),
                        min(len(audio), end + settings.silence_keep_silence_ms),
                    )
                    for start, end in nonsilent_ranges
                ]
                chunks = _ranges_to_chunks(audio, padded_ranges, max_duration)
                coverage_ratio = _chunk_coverage_ratio(chunks, len(audio))

                if coverage_ratio < MIN_COVERAGE_RATIO:
                    logger.warning(
                        "Silence-based chunking coverage too low (%.2f < %.2f); "
                        "falling back to fixed-length chunking",
                        coverage_ratio,
                        MIN_COVERAGE_RATIO,
                    )
                    chunks = _split_fixed_length(audio, max_duration)
                    coverage_ratio = _chunk_coverage_ratio(chunks, len(audio))
                    _log_chunking_metrics(
                        audio_duration_seconds=audio_duration_seconds,
                        nonsilent_range_count=len(nonsilent_ranges),
                        chunks=chunks,
                        coverage_ratio=coverage_ratio,
                        fallback_used=True,
                        strategy="fixed-length",
                    )
                    return chunks

                _log_chunking_metrics(
                    audio_duration_seconds=audio_duration_seconds,
                    nonsilent_range_count=len(nonsilent_ranges),
                    chunks=chunks,
                    coverage_ratio=coverage_ratio,
                    fallback_used=False,
                    strategy="silence-based",
                )
                return chunks
        except Exception as error:
            logger.warning(
                "Silence-based chunking failed, falling back to fixed-length: %s",
                error,
            )

    chunks = _split_fixed_length(audio, max_duration)
    coverage_ratio = _chunk_coverage_ratio(chunks, len(audio))
    _log_chunking_metrics(
        audio_duration_seconds=audio_duration_seconds,
        nonsilent_range_count=0,
        chunks=chunks,
        coverage_ratio=coverage_ratio,
        fallback_used=True,
        strategy="fixed-length",
    )
    return chunks


def save_debug_audio_chunks(
    chunks: list[AudioChunk],
    output_dir: Path,
    video_id: str,
) -> Path:
    """Persist chunk WAV files and a manifest under output/debug_audio/."""
    debug_dir = output_dir / "debug_audio" / video_id
    debug_dir.mkdir(parents=True, exist_ok=True)

    manifest_chunks: list[dict[str, float | int | str]] = []
    for chunk in chunks:
        filename = (
            f"chunk_{chunk.index:03d}_"
            f"{chunk.start_seconds:.1f}s-{chunk.end_seconds:.1f}s.wav"
        )
        chunk_path = debug_dir / filename
        chunk.audio.export(chunk_path, format="wav")
        manifest_chunks.append(
            {
                "index": chunk.index,
                "filename": filename,
                "start_seconds": chunk.start_seconds,
                "end_seconds": chunk.end_seconds,
                "duration_seconds": chunk.end_seconds - chunk.start_seconds,
            }
        )

    manifest_path = debug_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "video_id": video_id,
                "chunk_count": len(chunks),
                "chunks": manifest_chunks,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    logger.info("Saved %s debug audio chunks to %s", len(chunks), debug_dir)
    return debug_dir
