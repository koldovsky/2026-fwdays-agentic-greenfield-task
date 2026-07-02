"""Tests for pipeline routing and URL utilities."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.config.settings import Settings
from app.exceptions import InvalidURLError
from app.models.schemas import ProcessingMethod, VideoMetadata, VideoType
from app.pipeline import process_regular_video, process_youtube_url, route_video_processing
from app.services import youtube as youtube_service
from app.utils.timestamps import format_timestamp, generate_interval_blocks
from app.utils.validators import extract_video_id, normalize_youtube_url, validate_youtube_url


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ],
)
def test_extract_video_id(url: str, expected: str) -> None:
    assert extract_video_id(url) == expected


def test_validate_youtube_url_rejects_invalid() -> None:
    with pytest.raises(InvalidURLError):
        validate_youtube_url("https://example.com/video")


def test_normalize_youtube_url() -> None:
    normalized = normalize_youtube_url("https://youtu.be/dQw4w9WgXcQ")
    assert normalized == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def test_detect_video_type_live() -> None:
    assert youtube_service.detect_video_type({"is_live": True}) == VideoType.LIVE
    assert youtube_service.detect_video_type({"live_status": "is_live"}) == VideoType.LIVE


def test_detect_video_type_regular() -> None:
    assert youtube_service.detect_video_type({"is_live": False}) == VideoType.REGULAR


def test_compute_live_window() -> None:
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.LIVE,
        live_offset_seconds=300.0,
    )
    settings = Settings(live_before_minutes=3, live_after_minutes=3)
    start, end = youtube_service.compute_live_window(metadata, settings)
    assert start == 120.0
    assert end == 480.0


def test_configuration_overrides() -> None:
    settings = Settings(
        timestamp_interval_seconds=30,
        live_before_minutes=5,
        live_after_minutes=2,
        max_chunk_duration_seconds=45,
        silence_detection_enabled=False,
    )
    assert settings.timestamp_interval_seconds == 30
    assert settings.live_before_minutes == 5
    assert settings.max_chunk_duration_seconds == 45
    assert settings.silence_detection_enabled is False


def test_timestamp_formatting() -> None:
    assert format_timestamp(0) == "00:00"
    assert format_timestamp(75) == "01:15"
    assert format_timestamp(3661) == "01:01:01"


def test_generate_interval_blocks() -> None:
    blocks = generate_interval_blocks(40, 15)
    assert blocks == [(0.0, 15.0), (15.0, 30.0), (30.0, 40.0)]


@patch("app.pipeline.subtitle_service.download_subtitles")
def test_process_regular_video_uses_subtitles_first(mock_download) -> None:
    from app.models.schemas import TranscriptSegment

    mock_download.return_value = (
        [
            TranscriptSegment(
                timestamp="00:00",
                start_seconds=0.0,
                end_seconds=15.0,
                text="subtitle text",
            )
        ],
        {"subtitle_language": "uk", "subtitle_source": "manual"},
    )
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.REGULAR,
    )
    output = process_regular_video(metadata, Settings())
    assert output.processing_method == ProcessingMethod.SUBTITLES
    mock_download.assert_called_once()
    assert output.metadata["force_stt"] is False
    assert output.metadata["subtitle_attempted"] is True
    assert "fallback_reason" not in output.metadata


@patch("app.pipeline.transcribe_audio_file")
@patch("app.pipeline.audio_service.extract_regular_audio")
@patch("app.pipeline.subtitle_service.download_subtitles")
def test_process_regular_video_force_stt_skips_subtitles(
    mock_download,
    mock_extract,
    mock_transcribe,
    tmp_path: Path,
) -> None:
    mock_extract.return_value = tmp_path / "audio.wav"
    mock_transcribe.return_value = [(0.0, 15.0, "stt text")]

    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.REGULAR,
        duration_seconds=30.0,
    )

    with patch("app.pipeline.youtube_service.with_temp_audio_file", return_value=tmp_path / "temp.wav"):
        output = process_regular_video(metadata, Settings(force_stt=True))

    mock_download.assert_not_called()
    mock_extract.assert_called_once()
    mock_transcribe.assert_called_once()
    assert output.processing_method == ProcessingMethod.STT
    assert output.metadata["force_stt"] is True
    assert output.metadata["subtitle_attempted"] is False
    assert output.metadata["fallback_reason"] == "force_stt"


@patch("app.pipeline.transcribe_audio_file")
@patch("app.pipeline.audio_service.extract_regular_audio")
@patch("app.pipeline.subtitle_service.download_subtitles")
def test_process_regular_video_stt_fallback(
    mock_download,
    mock_extract,
    mock_transcribe,
    tmp_path: Path,
) -> None:
    from app.exceptions import SubtitlesUnavailableError

    mock_download.side_effect = SubtitlesUnavailableError("missing")
    mock_extract.return_value = tmp_path / "audio.wav"
    mock_transcribe.return_value = [(0.0, 15.0, "stt text")]

    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.REGULAR,
        duration_seconds=30.0,
    )

    with patch("app.pipeline.youtube_service.with_temp_audio_file", return_value=tmp_path / "temp.wav"):
        output = process_regular_video(metadata, Settings())

    assert output.processing_method == ProcessingMethod.STT
    assert output.metadata["force_stt"] is False
    assert output.metadata["subtitle_attempted"] is True
    assert output.metadata["fallback_reason"] == "subtitles_unavailable"


@patch("app.pipeline.process_live_stream")
@patch("app.pipeline.youtube_service.get_video_metadata")
def test_route_live_stream(mock_metadata, mock_live) -> None:
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.LIVE,
        is_live=True,
    )
    mock_metadata.return_value = metadata
    mock_live.return_value = MagicMock()

    route_video_processing(metadata, Settings())
    mock_live.assert_called_once()


@patch("app.pipeline.process_regular_video")
@patch("app.pipeline.youtube_service.get_video_metadata")
def test_route_regular_video(mock_metadata, mock_regular) -> None:
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.REGULAR,
    )
    mock_metadata.return_value = metadata
    mock_regular.return_value = MagicMock()

    route_video_processing(metadata, Settings())
    mock_regular.assert_called_once()


@patch("app.pipeline.transcript_service.save_transcript")
@patch("app.pipeline.process_regular_video")
@patch("app.pipeline.youtube_service.get_video_metadata")
def test_process_youtube_url_end_to_end(mock_metadata, mock_regular, mock_save) -> None:
    metadata = VideoMetadata(
        video_id="abc12345678",
        source_url="https://www.youtube.com/watch?v=abc12345678",
        video_type=VideoType.REGULAR,
    )
    mock_metadata.return_value = metadata
    transcript = MagicMock()
    mock_regular.return_value = transcript

    result = process_youtube_url("https://www.youtube.com/watch?v=abc12345678", Settings())

    assert result is transcript
    mock_save.assert_called_once()
