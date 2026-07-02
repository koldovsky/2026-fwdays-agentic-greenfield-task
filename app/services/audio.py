"""Audio extraction helpers."""

from pathlib import Path

from app.config.settings import Settings
from app.models.schemas import VideoMetadata
from app.services import youtube as youtube_service
from app.utils.logger import get_logger
from app.utils.timing import log_audio_file_metrics, log_step

logger = get_logger(__name__)


def extract_live_audio(
    metadata: VideoMetadata,
    settings: Settings,
    output_path: Path,
) -> tuple[Path, float, float]:
    """Extract audio around the live target moment."""
    start, end = youtube_service.compute_live_window(metadata, settings)
    with log_step(
        logger,
        "live_audio_extraction",
        video_id=metadata.video_id,
        window_start=f"{start:.1f}s",
        window_end=f"{end:.1f}s",
    ):
        logger.info(
            "Extracting live audio window: %.1fs to %.1fs",
            start,
            end,
        )
        audio_path = youtube_service.download_audio_segment(
            metadata.source_url,
            start_seconds=start,
            end_seconds=end,
            output_path=output_path,
        )
        log_audio_file_metrics(logger, "extracted_audio", audio_path)
        validation = youtube_service.validate_audio_segment_duration(
            audio_path,
            expected_duration_seconds=end - start,
        )
        if not validation["within_tolerance"]:
            logger.warning(
                "Live audio extraction produced %.3fs audio for a %.3fs requested window",
                validation["actual_duration_seconds"],
                validation["expected_duration_seconds"],
            )
    return audio_path, start, end


def extract_regular_audio(
    metadata: VideoMetadata,
    output_path: Path,
) -> Path:
    """Extract full audio for regular video STT fallback."""
    with log_step(
        logger,
        "audio_extraction",
        video_id=metadata.video_id,
        mode="regular_stt_fallback",
    ):
        logger.info("Extracting full audio for STT fallback")
        audio_path = youtube_service.download_full_audio(metadata.source_url, output_path)
        log_audio_file_metrics(logger, "extracted_audio", audio_path)
    return audio_path
