"""Transcript merging, formatting, and output."""

from __future__ import annotations

import json
from pathlib import Path

from app.config.settings import Settings
from app.exceptions import OutputSaveError
from app.models.schemas import (
    ProcessingMethod,
    TranscriptOutput,
    TranscriptSegment,
    VideoMetadata,
    VideoType,
)
from app.utils.logger import get_logger
from app.utils.timing import log_step
from app.utils.timestamps import format_timestamp, generate_interval_blocks

logger = get_logger(__name__)


def normalize_text(text: str) -> str:
    """Normalize whitespace in transcript text."""
    return " ".join(text.split())


def deduplicate_segments(segments: list[TranscriptSegment]) -> list[TranscriptSegment]:
    """Remove duplicated adjacent text while preserving order."""
    if not segments:
        return []

    deduped: list[TranscriptSegment] = []
    previous_text = ""
    for segment in segments:
        text = normalize_text(segment.text)
        if text and text == previous_text:
            continue
        deduped.append(segment.model_copy(update={"text": text}))
        previous_text = text
    return deduped


def merge_stt_chunk_results(
    chunk_results: list[tuple[float, float, str]],
    interval_seconds: int,
    duration_seconds: float,
) -> list[TranscriptSegment]:
    """Merge STT chunk outputs into timestamped blocks."""
    blocks = generate_interval_blocks(duration_seconds, interval_seconds)
    segments: list[TranscriptSegment] = []

    for start, end in blocks:
        texts = [
            normalize_text(text)
            for chunk_start, chunk_end, text in chunk_results
            if chunk_end > start and chunk_start < end and text.strip()
        ]
        segments.append(
            TranscriptSegment(
                timestamp=format_timestamp(start),
                start_seconds=start,
                end_seconds=end,
                text=" ".join(texts).strip(),
            )
        )

    return deduplicate_segments(segments)


def build_transcript_output(
    metadata: VideoMetadata,
    segments: list[TranscriptSegment],
    processing_method: ProcessingMethod,
    settings: Settings,
    extra_metadata: dict | None = None,
) -> TranscriptOutput:
    """Build final transcript output object."""
    output_metadata = dict(extra_metadata or {})
    if processing_method == ProcessingMethod.STT:
        output_metadata.setdefault("stt_provider", settings.stt_provider)
        output_metadata.setdefault("stt_model", settings.stt_model)
    if metadata.video_type == VideoType.LIVE:
        output_metadata.setdefault("live_before_minutes", settings.live_before_minutes)
        output_metadata.setdefault("live_after_minutes", settings.live_after_minutes)

    return TranscriptOutput(
        source_url=metadata.source_url,
        video_id=metadata.video_id,
        video_type=metadata.video_type,
        processing_method=processing_method,
        timestamp_interval_seconds=settings.timestamp_interval_seconds,
        segments=deduplicate_segments(segments),
        metadata=output_metadata,
    )


def format_txt(transcript: TranscriptOutput) -> str:
    """Format transcript as plain text with timestamps."""
    lines = [
        f"Source: {transcript.source_url}",
        f"Video ID: {transcript.video_id}",
        f"Type: {transcript.video_type.value}",
        f"Method: {transcript.processing_method.value}",
        "",
    ]
    for segment in transcript.segments:
        lines.append(f"[{segment.timestamp}] {segment.text}".rstrip())
    return "\n".join(lines).strip() + "\n"


def save_transcript(
    transcript: TranscriptOutput,
    settings: Settings,
    basename: str | None = None,
) -> tuple[Path, Path]:
    """Save transcript as TXT and JSON files."""
    output_dir = settings.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    file_stem = basename or transcript.video_id
    txt_path = output_dir / f"{file_stem}.txt"
    json_path = output_dir / f"{file_stem}.json"

    with log_step(
        logger,
        "output_saving",
        video_id=transcript.video_id,
        segment_count=len(transcript.segments),
    ):
        try:
            txt_path.write_text(format_txt(transcript), encoding="utf-8")
            json_path.write_text(
                json.dumps(transcript.model_dump(mode="json"), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as error:
            raise OutputSaveError(f"Failed to save transcript files: {error}") from error

    logger.info("Saved transcript to %s and %s", txt_path, json_path)
    return txt_path, json_path
