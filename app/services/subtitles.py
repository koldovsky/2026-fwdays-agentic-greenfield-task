"""Subtitle download and parsing."""

from __future__ import annotations

import re
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yt_dlp

from app.config.settings import Settings
from app.exceptions import SubtitlesUnavailableError
from app.models.schemas import TranscriptSegment
from app.utils.logger import get_logger
from app.utils.timestamps import format_timestamp, generate_interval_blocks

logger = get_logger(__name__)

VTT_TIMESTAMP = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2}\.\d{3}) --> (?P<end>\d{2}:\d{2}:\d{2}\.\d{3})"
)
SRT_TIMESTAMP = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2},\d{3}) --> (?P<end>\d{2}:\d{2}:\d{2},\d{3})"
)

COMMON_FALLBACK_LANGUAGES = ("uk", "en", "ru", "pl", "de", "fr")


@dataclass(frozen=True)
class SubtitleDownloadResult:
    """Downloaded subtitle file with language metadata."""

    path: Path
    language: str
    source: str


def _timestamp_to_seconds(value: str) -> float:
    normalized = value.replace(",", ".")
    parts = normalized.split(":")
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    minutes, seconds = parts
    return int(minutes) * 60 + float(seconds)


def _clean_subtitle_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\n", " ")
    return " ".join(text.split())


def _language_base(code: str) -> str:
    return code.lower().split("-")[0]


def _video_language_hints(info: dict[str, Any]) -> list[str]:
    hints: list[str] = []
    for key in ("language", "uploader_language", "channel_language"):
        value = info.get(key)
        if isinstance(value, str) and value.strip():
            hints.append(_language_base(value))
    return hints


def _build_language_priority(
    info: dict[str, Any],
    settings: Settings | None,
    preferred_languages: list[str] | None,
) -> list[str]:
    priority: list[str] = []
    priority.extend(_video_language_hints(info))

    if settings and settings.subtitle_preferred_languages:
        for lang in settings.subtitle_preferred_languages.split(","):
            lang = lang.strip()
            if lang:
                priority.append(_language_base(lang))

    for lang in preferred_languages or []:
        priority.append(_language_base(lang))

    priority.extend(COMMON_FALLBACK_LANGUAGES)

    seen: set[str] = set()
    ordered: list[str] = []
    for lang in priority:
        if lang and lang not in seen:
            seen.add(lang)
            ordered.append(lang)
    return ordered


def _find_language_in_tracks(
    priority: list[str],
    tracks: dict[str, Any],
    source: str,
) -> tuple[str, str] | None:
    for target in priority:
        for track_lang in tracks:
            if _language_base(track_lang) == target:
                return track_lang, source
    return None


def select_subtitle_language(
    info: dict[str, Any],
    settings: Settings | None = None,
    preferred_languages: list[str] | None = None,
) -> tuple[str, str] | None:
    """Pick subtitle language using video metadata and preferred fallbacks."""
    manual = info.get("subtitles") or {}
    auto = info.get("automatic_captions") or {}
    priority = _build_language_priority(info, settings, preferred_languages)

    selected = _find_language_in_tracks(priority, manual, "manual")
    if selected:
        return selected

    selected = _find_language_in_tracks(priority, auto, "automatic")
    if selected:
        return selected

    if manual:
        return next(iter(manual.keys())), "manual"
    if auto:
        return next(iter(auto.keys())), "automatic"
    return None


def _extract_video_info(url: str) -> dict[str, Any]:
    opts = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if info is None:
        raise SubtitlesUnavailableError("No subtitle metadata returned.")
    return info


def _download_subtitle_for_language(
    url: str,
    language: str,
    *,
    source: str,
    temp_dir: Path,
) -> Path:
    opts: dict[str, Any] = {
        "skip_download": True,
        "writesubtitles": source == "manual",
        "writeautomaticsub": source == "automatic",
        "subtitlesformat": "vtt",
        "subtitleslangs": [language],
        "outtmpl": str(temp_dir / "%(id)s"),
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

    subtitle_files = sorted(temp_dir.glob(f"*.{language}.vtt"))
    if not subtitle_files:
        subtitle_files = sorted(temp_dir.glob("*.vtt"))
    if not subtitle_files:
        raise SubtitlesUnavailableError(
            f"No subtitle file downloaded for language '{language}'."
        )
    return subtitle_files[0]


def parse_subtitle_file(path: Path) -> list[tuple[float, float, str]]:
    """Parse VTT or SRT subtitle file into timed fragments."""
    content = path.read_text(encoding="utf-8", errors="ignore")
    pattern = VTT_TIMESTAMP if path.suffix.lower() == ".vtt" else SRT_TIMESTAMP
    fragments: list[tuple[float, float, str]] = []

    blocks = re.split(r"\n\s*\n", content.strip())
    for block in blocks:
        match = pattern.search(block)
        if not match:
            continue
        start = _timestamp_to_seconds(match.group("start"))
        end = _timestamp_to_seconds(match.group("end"))
        text_lines = []
        for line in block.splitlines():
            if "-->" in line or line.strip().isdigit():
                continue
            cleaned = _clean_subtitle_text(line)
            if cleaned:
                text_lines.append(cleaned)
        if text_lines:
            fragments.append((start, end, " ".join(text_lines)))

    return fragments


def _dedupe_rolling_texts(texts: list[str]) -> str:
    """Remove repeated rolling-caption lines within one timestamp block."""
    cleaned: list[str] = []
    for text in texts:
        normalized = " ".join(text.split())
        if not normalized:
            continue
        if cleaned and normalized == cleaned[-1]:
            continue
        if cleaned and normalized in cleaned[-1]:
            continue
        if cleaned and cleaned[-1] in normalized:
            cleaned[-1] = normalized
            continue
        cleaned.append(normalized)
    return " ".join(cleaned)


def merge_fragments_to_intervals(
    fragments: list[tuple[float, float, str]],
    interval_seconds: int,
    duration_seconds: float | None = None,
) -> list[TranscriptSegment]:
    """Merge subtitle fragments into configurable timestamp blocks."""
    if not fragments:
        return []

    if duration_seconds is None:
        duration_seconds = max(end for _, end, _ in fragments)

    blocks = generate_interval_blocks(duration_seconds, interval_seconds)
    segments: list[TranscriptSegment] = []

    for start, end in blocks:
        matching = sorted(
            [
                (frag_start, frag_end, text)
                for frag_start, frag_end, text in fragments
                if frag_start >= start and frag_start < end
            ],
            key=lambda item: item[0],
        )
        if not matching:
            matching = sorted(
                [
                    (frag_start, frag_end, text)
                    for frag_start, frag_end, text in fragments
                    if frag_end > start and frag_start < end
                ],
                key=lambda item: item[0],
            )

        segments.append(
            TranscriptSegment(
                timestamp=format_timestamp(start),
                start_seconds=start,
                end_seconds=end,
                text=_dedupe_rolling_texts([text for _, _, text in matching]),
            )
        )

    return segments


def download_subtitles(
    url: str,
    settings: Settings,
    *,
    video_language: str | None = None,
) -> tuple[list[TranscriptSegment], dict[str, str]]:
    """Download and parse YouTube subtitles into timestamped segments."""
    info = _extract_video_info(url)
    preferred = [_language_base(video_language)] if video_language else None
    selected = select_subtitle_language(
        info,
        settings=settings,
        preferred_languages=preferred,
    )
    if selected is None:
        raise SubtitlesUnavailableError("No subtitles available for this video.")

    language, source = selected
    temp_dir = Path(tempfile.mkdtemp())
    last_error: Exception | None = None

    for attempt in range(1, settings.subtitle_max_retries + 1):
        try:
            subtitle_path = _download_subtitle_for_language(
                url,
                language,
                source=source,
                temp_dir=temp_dir,
            )
            logger.info(
                "Downloaded %s subtitles in language '%s'",
                source,
                language,
            )
            download = SubtitleDownloadResult(
                path=subtitle_path,
                language=language,
                source=source,
            )
            break
        except Exception as error:
            last_error = error
            message = str(error).lower()
            if "429" in message or "too many requests" in message:
                if attempt < settings.subtitle_max_retries:
                    sleep_for = settings.subtitle_retry_backoff_seconds * attempt
                    logger.warning(
                        "Subtitle download rate-limited, retrying in %.1fs",
                        sleep_for,
                    )
                    time.sleep(sleep_for)
                    continue
            raise SubtitlesUnavailableError(f"Subtitle request failed: {error}") from error
    else:
        assert last_error is not None
        raise SubtitlesUnavailableError(f"Subtitle request failed: {last_error}") from last_error

    fragments = parse_subtitle_file(download.path)
    if not fragments:
        raise SubtitlesUnavailableError("Subtitle file did not contain usable content.")

    duration = max(end for _, end, _ in fragments)
    segments = merge_fragments_to_intervals(
        fragments,
        settings.timestamp_interval_seconds,
        duration_seconds=duration,
    )
    metadata = {
        "subtitle_language": download.language,
        "subtitle_source": download.source,
    }
    logger.info(
        "Downloaded subtitles with %s segments (language=%s)",
        len(segments),
        download.language,
    )
    return segments, metadata


def fragments_from_json_payload(payload: list[dict]) -> list[tuple[float, float, str]]:
    """Convert structured subtitle payload to fragments for tests."""
    return [
        (float(item["start"]), float(item["end"]), str(item["text"]))
        for item in payload
    ]
