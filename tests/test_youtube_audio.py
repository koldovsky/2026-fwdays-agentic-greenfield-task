"""Tests for YouTube audio extraction options."""

from pathlib import Path
from unittest.mock import patch

from app.services import youtube as youtube_service


def test_build_segment_download_opts_uses_ffmpeg_ranges() -> None:
    output_path = Path("output/tmp_audio.wav")
    opts = youtube_service.build_segment_download_opts(
        output_path,
        start_seconds=120.0,
        end_seconds=480.0,
    )

    assert opts["format"] == "bestaudio/best"
    assert opts["external_downloader"] == "ffmpeg"
    assert "download_sections" not in opts
    assert callable(opts["download_ranges"])

    ranges = list(opts["download_ranges"]({}, 600.0))
    assert ranges == [{"start_time": 120.0, "end_time": 480.0}]


@patch("app.services.youtube.yt_dlp.YoutubeDL")
def test_download_audio_segment_uses_download_ranges(mock_youtube_dl, tmp_path: Path) -> None:
    captured_opts: dict = {}

    class FakeYDL:
        def __init__(self, opts):
            captured_opts.update(opts)

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def download(self, urls):
            wav_path = Path(captured_opts["outtmpl"]).with_suffix(".wav")
            wav_path.write_bytes(b"RIFF")

    mock_youtube_dl.side_effect = FakeYDL

    with patch(
        "app.services.youtube.validate_audio_segment_duration",
        return_value={
            "expected_duration_seconds": 60.0,
            "actual_duration_seconds": 60.0,
            "duration_delta_seconds": 0.0,
            "within_tolerance": True,
            "size_bytes": 128,
        },
    ):
        result = youtube_service.download_audio_segment(
            "https://www.youtube.com/watch?v=abc12345678",
            start_seconds=60.0,
            end_seconds=120.0,
            output_path=tmp_path / "segment.wav",
        )

    assert "download_ranges" in captured_opts
    assert callable(captured_opts["download_ranges"])
    assert captured_opts["external_downloader"] == "ffmpeg"
    assert "download_sections" not in captured_opts
    assert result.suffix == ".wav"


@patch("app.services.youtube.yt_dlp.YoutubeDL")
def test_download_full_audio_does_not_use_ranged_download(mock_youtube_dl, tmp_path: Path) -> None:
    captured_opts: dict = {}

    class FakeYDL:
        def __init__(self, opts):
            captured_opts.update(opts)

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def download(self, urls):
            wav_path = Path(captured_opts["outtmpl"]).with_suffix(".wav")
            wav_path.write_bytes(b"RIFF")

    mock_youtube_dl.side_effect = FakeYDL

    result = youtube_service.download_full_audio(
        "https://www.youtube.com/watch?v=abc12345678",
        tmp_path / "full.wav",
    )

    assert "download_ranges" not in captured_opts
    assert "download_sections" not in captured_opts
    assert captured_opts.get("external_downloader") != "ffmpeg"
    assert result.suffix == ".wav"


def test_validate_audio_segment_duration_within_tolerance(tmp_path: Path) -> None:
    from pydub import AudioSegment
    from pydub.generators import Sine

    audio_path = tmp_path / "segment.wav"
    tone = Sine(440).to_audio_segment(duration=60_000)
    tone.export(audio_path, format="wav")

    validation = youtube_service.validate_audio_segment_duration(
        audio_path,
        expected_duration_seconds=60.0,
    )

    assert validation["expected_duration_seconds"] == 60.0
    assert validation["actual_duration_seconds"] == 60.0
    assert validation["within_tolerance"] is True


def test_validate_audio_segment_duration_outside_tolerance(tmp_path: Path) -> None:
    from pydub import AudioSegment
    from pydub.generators import Sine

    audio_path = tmp_path / "segment.wav"
    tone = Sine(440).to_audio_segment(duration=120_000)
    tone.export(audio_path, format="wav")

    validation = youtube_service.validate_audio_segment_duration(
        audio_path,
        expected_duration_seconds=60.0,
        tolerance_seconds=3.0,
    )

    assert validation["actual_duration_seconds"] == 120.0
    assert validation["duration_delta_seconds"] == 60.0
    assert validation["within_tolerance"] is False
