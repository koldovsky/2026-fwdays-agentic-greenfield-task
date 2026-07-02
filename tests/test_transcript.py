"""Tests for transcript formatting and output."""

import json
from pathlib import Path

from app.config.settings import Settings
from app.models.schemas import ProcessingMethod, TranscriptSegment, VideoMetadata, VideoType
from app.services.transcript import (
    build_transcript_output,
    format_txt,
    merge_stt_chunk_results,
    save_transcript,
)


def test_merge_stt_chunk_results() -> None:
    chunk_results = [
        (0.0, 30.0, "first segment"),
        (30.0, 60.0, "second segment"),
    ]
    segments = merge_stt_chunk_results(chunk_results, interval_seconds=15, duration_seconds=60)

    assert len(segments) == 2
    assert segments[0].timestamp == "00:00"
    assert "first segment" in segments[0].text
    assert segments[1].timestamp == "00:30"
    assert "second segment" in segments[1].text


def test_build_transcript_output_includes_metadata() -> None:
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.LIVE,
        is_live=True,
    )
    settings = Settings(
        stt_provider="openai",
        stt_model="whisper-1",
        live_before_minutes=3,
        live_after_minutes=3,
    )
    segments = [
        TranscriptSegment(
            timestamp="00:00",
            start_seconds=0.0,
            end_seconds=15.0,
            text="hello",
        )
    ]

    output = build_transcript_output(
        metadata,
        segments,
        ProcessingMethod.STT,
        settings,
    )

    assert output.metadata["stt_provider"] == "openai"
    assert output.metadata["stt_model"] == "whisper-1"
    assert output.metadata["live_before_minutes"] == 3
    assert output.metadata["live_after_minutes"] == 3


def test_save_transcript_txt_and_json(tmp_path: Path) -> None:
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.REGULAR,
    )
    settings = Settings(output_dir=tmp_path)
    output = build_transcript_output(
        metadata,
        [
            TranscriptSegment(
                timestamp="00:00",
                start_seconds=0.0,
                end_seconds=15.0,
                text="sample text",
            )
        ],
        ProcessingMethod.SUBTITLES,
        settings,
    )

    txt_path, json_path = save_transcript(output, settings)

    assert txt_path.exists()
    assert json_path.exists()
    assert "[00:00] sample text" in txt_path.read_text(encoding="utf-8")

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert payload["source_url"] == metadata.source_url
    assert payload["video_id"] == metadata.video_id
    assert payload["video_type"] == "regular"
    assert payload["processing_method"] == "subtitles"
    assert payload["timestamp_interval_seconds"] == 15
    assert payload["segments"]
    assert "metadata" in payload


def test_format_txt_contains_header() -> None:
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.REGULAR,
    )
    output = build_transcript_output(
        metadata,
        [],
        ProcessingMethod.SUBTITLES,
        Settings(),
    )
    text = format_txt(output)
    assert "Source:" in text
    assert "Method:" in text
