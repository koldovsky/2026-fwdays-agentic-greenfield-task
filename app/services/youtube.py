"""YouTube metadata and stream handling."""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

import yt_dlp

from app.config.settings import Settings
from app.exceptions import (
    AgeRestrictedVideoError,
    LiveStreamInterruptedError,
    NetworkError,
    PrivateVideoError,
    TranscriptionError,
    VideoUnavailableError,
)
from app.models.schemas import VideoMetadata, VideoType
from app.utils.logger import get_logger
from app.utils.validators import normalize_youtube_url

logger = get_logger(__name__)


def _map_ytdlp_error(error: Exception, video_id: str) -> TranscriptionError:
    message = str(error).lower()
    if "getaddrinfo failed" in message or "name or service not known" in message:
        return NetworkError(
            "Could not reach YouTube (DNS/network error). "
            "Check your internet connection, DNS settings, VPN, or proxy."
        )
    if "timed out" in message or "connection refused" in message:
        return NetworkError(
            "Connection to YouTube timed out or was refused. "
            "Check your network, firewall, or proxy settings."
        )
    if "private video" in message:
        return PrivateVideoError(f"Video {video_id} is private.")
    if "age-restricted" in message or "sign in to confirm your age" in message:
        return AgeRestrictedVideoError(f"Video {video_id} is age-restricted.")
    if "video unavailable" in message or "this live event will begin" in message:
        return VideoUnavailableError(f"Video {video_id} is unavailable.")
    return VideoUnavailableError(f"Could not access video {video_id}: {error}")


def _extract_info(url: str, download: bool = False, **extra_opts: Any) -> dict[str, Any]:
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": not download,
    }
    opts.update(extra_opts)

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=download)
    except Exception as error:
        video_id = url.split("v=")[-1][:11]
        raise _map_ytdlp_error(error, video_id) from error

    if info is None:
        raise VideoUnavailableError(f"No metadata returned for URL: {url}")
    return info


def detect_video_type(info: dict[str, Any]) -> VideoType:
    """Determine whether the content is live or regular."""
    if info.get("is_live") or info.get("live_status") in {"is_live", "is_upcoming"}:
        return VideoType.LIVE
    return VideoType.REGULAR


def extract_video_language(info: dict[str, Any]) -> str | None:
    """Extract ISO 639-1 language code from YouTube metadata when available."""
    for key in ("language", "uploader_language", "channel_language"):
        value = info.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().split("-")[0].lower()
    return None


def get_video_metadata(url: str, settings: Settings | None = None) -> VideoMetadata:
    """Fetch YouTube metadata for the given URL."""
    normalized_url = normalize_youtube_url(url)
    info = _extract_info(normalized_url)
    video_type = detect_video_type(info)

    duration = info.get("duration")
    if duration is None and info.get("live_offset") is not None:
        duration = float(info["live_offset"])

    return VideoMetadata(
        video_id=info["id"],
        source_url=normalized_url,
        title=info.get("title") or "",
        video_type=video_type,
        is_live=video_type == VideoType.LIVE,
        duration_seconds=float(duration) if duration is not None else None,
        live_offset_seconds=float(info["live_offset"])
        if info.get("live_offset") is not None
        else None,
        language=extract_video_language(info),
    )


def build_segment_download_opts(
    output_path: Path,
    *,
    start_seconds: float,
    end_seconds: float,
) -> dict[str, Any]:
    """Build yt-dlp options for partial audio extraction via ffmpeg."""
    return {
        "format": "bestaudio/best",
        "outtmpl": str(output_path.with_suffix("")),
        "download_ranges": yt_dlp.utils.download_range_func(
            None,
            [(start_seconds, end_seconds)],
        ),
        "external_downloader": "ffmpeg",
        "force_keyframes_at_cuts": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "no_warnings": True,
    }


def validate_audio_segment_duration(
    audio_path: Path,
    *,
    expected_duration_seconds: float,
    tolerance_seconds: float = 3.0,
) -> dict[str, float | bool]:
    """Compare extracted audio duration against the expected window length."""
    from app.utils.timing import audio_file_metrics

    metrics = audio_file_metrics(audio_path)
    expected_duration = max(expected_duration_seconds, 0.0)
    actual_duration = float(metrics["duration_seconds"])
    delta = abs(actual_duration - expected_duration)
    return {
        "expected_duration_seconds": expected_duration,
        "actual_duration_seconds": actual_duration,
        "duration_delta_seconds": delta,
        "within_tolerance": delta <= tolerance_seconds,
        "size_bytes": int(metrics["size_bytes"]),
    }


def download_audio_segment(
    url: str,
    *,
    start_seconds: float,
    end_seconds: float,
    output_path: Path,
) -> Path:
    """Download an audio segment for live or fallback transcription."""
    if end_seconds <= start_seconds:
        raise LiveStreamInterruptedError(
            "Invalid live window: end time must be greater than start time."
        )

    expected_duration = end_seconds - start_seconds
    opts = build_segment_download_opts(
        output_path,
        start_seconds=start_seconds,
        end_seconds=end_seconds,
    )

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as error:
        raise LiveStreamInterruptedError(
            f"Failed to capture live stream audio: {error}"
        ) from error

    wav_path = output_path if output_path.suffix == ".wav" else output_path.with_suffix(".wav")
    if not wav_path.exists():
        raise LiveStreamInterruptedError("Live stream audio capture produced no output.")

    validation = validate_audio_segment_duration(
        wav_path,
        expected_duration_seconds=expected_duration,
    )
    logger.info(
        "[audio] segment_validation | requested=%.1fs-%.1fs | expected_duration=%.3fs | "
        "actual_duration=%.3fs | delta=%.3fs | within_tolerance=%s | size=%s bytes",
        start_seconds,
        end_seconds,
        validation["expected_duration_seconds"],
        validation["actual_duration_seconds"],
        validation["duration_delta_seconds"],
        validation["within_tolerance"],
        validation["size_bytes"],
    )
    if not validation["within_tolerance"]:
        logger.warning(
            "Extracted live audio duration %.3fs differs from requested window %.3fs "
            "(delta %.3fs, tolerance %.1fs)",
            validation["actual_duration_seconds"],
            expected_duration,
            validation["duration_delta_seconds"],
            3.0,
        )
    return wav_path


def download_full_audio(url: str, output_path: Path) -> Path:
    """Download full audio for regular video STT fallback."""
    logger.info(
        "[audio] full_track_download | mode=regular_stt_fallback | "
        "note=entire audio track is required for full-video STT"
    )
    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(output_path.with_suffix("")),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as error:
        raise VideoUnavailableError(f"Failed to download audio: {error}") from error

    wav_path = output_path if output_path.suffix == ".wav" else output_path.with_suffix(".wav")
    if not wav_path.exists():
        raise VideoUnavailableError("Audio download produced no output.")
    return wav_path


def compute_live_window(
    metadata: VideoMetadata,
    settings: Settings,
) -> tuple[float, float]:
    """Compute start/end seconds around the live target moment."""
    before_seconds = settings.live_before_minutes * 60
    after_seconds = settings.live_after_minutes * 60

    target = metadata.live_offset_seconds
    if target is None:
        target = metadata.duration_seconds or 0.0

    start = max(0.0, target - before_seconds)
    end = target + after_seconds
    return start, end


def with_temp_audio_file(suffix: str = ".wav") -> Path:
    """Create a temporary audio file path."""
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp.close()
    return Path(temp.name)
