"""Application entry point."""

from __future__ import annotations

import argparse
import sys

from app.config.settings import Settings, get_settings
from app.exceptions import TranscriptionError
from app.pipeline import process_youtube_url
from app.utils.logger import get_logger

logger = get_logger(__name__)


def build_parser() -> argparse.ArgumentParser:
    """Build CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="YouTube transcription system with subtitle and live STT support.",
    )
    parser.add_argument("url", help="YouTube video or live stream URL")
    parser.add_argument(
        "--timestamp-interval",
        type=int,
        dest="timestamp_interval_seconds",
        help="Timestamp block interval in seconds (default: 15)",
    )
    parser.add_argument(
        "--live-before",
        type=int,
        dest="live_before_minutes",
        help="Minutes before live target moment (default: 3)",
    )
    parser.add_argument(
        "--live-after",
        type=int,
        dest="live_after_minutes",
        help="Minutes after live target moment (default: 3)",
    )
    parser.add_argument(
        "--max-chunk-duration",
        type=int,
        dest="max_chunk_duration_seconds",
        help="Maximum audio chunk duration in seconds (default: 60)",
    )
    parser.add_argument(
        "--no-silence-detection",
        action="store_true",
        help="Disable silence-based audio chunking",
    )
    parser.add_argument(
        "--stt-provider",
        help="STT provider name (default: openai)",
    )
    parser.add_argument(
        "--stt-model",
        help="STT model identifier (default: whisper-1)",
    )
    parser.add_argument(
        "--output-dir",
        help="Directory for transcript output files (default: output)",
    )
    parser.add_argument(
        "--save-debug-audio",
        action="store_true",
        help="Save STT audio chunks to output/debug_audio/{video_id}/",
    )
    parser.add_argument(
        "--force-stt",
        action="store_true",
        help="Skip subtitle download for regular videos and use STT directly",
    )
    return parser


def settings_from_args(args: argparse.Namespace) -> Settings:
    """Merge CLI overrides into settings."""
    base = get_settings().model_dump()
    overrides = {
        key: value
        for key, value in vars(args).items()
        if key != "url" and value is not None
    }
    if args.no_silence_detection:
        overrides["silence_detection_enabled"] = False
    overrides.pop("no_silence_detection", None)
    base.update(overrides)
    return Settings(**base)


def main(argv: list[str] | None = None) -> int:
    """CLI main function."""
    parser = build_parser()
    args = parser.parse_args(argv)
    settings = settings_from_args(args)

    try:
        transcript = process_youtube_url(args.url, settings)
    except TranscriptionError as error:
        logger.error("%s", error)
        return 1
    except Exception as error:
        logger.exception("Unexpected error: %s", error)
        return 1

    logger.info(
        "Transcript ready (%s, %s segments)",
        transcript.processing_method.value,
        len(transcript.segments),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
