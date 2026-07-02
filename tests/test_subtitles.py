"""Tests for subtitle processing."""

from pathlib import Path

import pytest

from app.config.settings import Settings
from app.services.subtitles import (
    merge_fragments_to_intervals,
    parse_subtitle_file,
    select_subtitle_language,
)


SAMPLE_VTT = """WEBVTT

00:00:00.000 --> 00:00:05.000
Hello world

00:00:05.000 --> 00:00:12.000
Second subtitle line
"""


def test_parse_subtitle_file(tmp_path: Path) -> None:
    path = tmp_path / "sample.vtt"
    path.write_text(SAMPLE_VTT, encoding="utf-8")

    fragments = parse_subtitle_file(path)

    assert len(fragments) == 2
    assert fragments[0][2] == "Hello world"
    assert fragments[1][0] == pytest.approx(5.0)


def test_merge_fragments_to_intervals() -> None:
    fragments = [
        (0.0, 5.0, "Hello"),
        (5.0, 12.0, "World"),
        (12.0, 20.0, "Again"),
    ]
    segments = merge_fragments_to_intervals(fragments, interval_seconds=15, duration_seconds=30)

    assert len(segments) == 2
    assert segments[0].timestamp == "00:00"
    assert "Hello" in segments[0].text
    assert segments[1].timestamp == "00:15"


def test_merge_fragments_dedupes_rolling_captions() -> None:
    fragments = [
        (0.0, 2.0, "Hello"),
        (2.0, 4.0, "Hello world"),
        (4.0, 6.0, "Hello world"),
        (6.0, 8.0, "Hello world again"),
    ]
    segments = merge_fragments_to_intervals(fragments, interval_seconds=15, duration_seconds=15)

    assert segments[0].text.count("Hello world again") == 1
    assert "Hello Hello world Hello world Hello world again" not in segments[0].text


def test_merge_fragments_respects_configurable_interval() -> None:
    fragments = [(0.0, 2.0, "A"), (2.0, 4.0, "B")]
    segments = merge_fragments_to_intervals(fragments, interval_seconds=5, duration_seconds=10)

    assert len(segments) == 2
    assert segments[0].end_seconds == 5.0


def test_select_subtitle_language_prefers_video_language() -> None:
    info = {
        "language": "uk",
        "subtitles": {"ab": [{}], "uk": [{}], "en": [{}]},
        "automatic_captions": {},
    }
    language, source = select_subtitle_language(info, settings=Settings())
    assert language == "uk"
    assert source == "manual"


def test_select_subtitle_language_prefers_uk_over_ab_in_auto() -> None:
    info = {
        "subtitles": {},
        "automatic_captions": {"ab": [{}], "uk": [{}], "de": [{}]},
    }
    language, source = select_subtitle_language(info, settings=Settings())
    assert language == "uk"
    assert source == "automatic"


def test_select_subtitle_language_prefers_manual() -> None:
    info = {
        "subtitles": {"uk": [{}], "en": [{}]},
        "automatic_captions": {"de": [{}]},
    }
    language, source = select_subtitle_language(info, settings=Settings())
    assert source == "manual"
    assert language == "uk"


def test_select_subtitle_language_none_available() -> None:
    assert select_subtitle_language({"subtitles": {}, "automatic_captions": {}}) is None
