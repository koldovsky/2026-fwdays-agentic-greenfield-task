"""Tests for timing and debug logging helpers."""

from pathlib import Path

from pydub import AudioSegment
from pydub.generators import Sine

from app.utils.logger import get_logger
from app.utils.timing import audio_file_metrics, format_bytes, log_step


def test_format_bytes() -> None:
    assert format_bytes(512) == "512 B"
    assert format_bytes(2048) == "2.0 KB"
    assert format_bytes(2 * 1024 * 1024) == "2.00 MB"


def test_log_step_logs_start_and_completion(capsys) -> None:
    logger = get_logger("test.timing.step")

    with log_step(logger, "url_validation", video_id="abc12345678"):
        pass

    output = capsys.readouterr().out
    assert "url_validation started" in output
    assert "url_validation completed" in output
    assert "video_id=abc12345678" in output


def test_audio_file_metrics(tmp_path: Path) -> None:
    audio_path = tmp_path / "sample.wav"
    tone = Sine(440).to_audio_segment(duration=1500)
    tone.export(audio_path, format="wav")

    metrics = audio_file_metrics(audio_path)

    assert metrics["duration_seconds"] == 1.5
    assert metrics["size_bytes"] > 0
    assert metrics["size_human"]
