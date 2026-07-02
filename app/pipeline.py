"""Main processing pipeline."""

from __future__ import annotations

import tempfile
import time
from pathlib import Path

from app.config.settings import Settings, get_settings
from app.exceptions import SubtitlesUnavailableError
from app.models.schemas import ProcessingMethod, TranscriptOutput, VideoMetadata, VideoType
from app.services import audio as audio_service
from app.services import chunking as chunking_service
from app.services import subtitles as subtitle_service
from app.services import transcript as transcript_service
from app.services import youtube as youtube_service
from app.services.stt import get_stt_provider
from app.utils.logger import get_logger
from app.utils.timing import log_chunk_metrics, log_step
from app.utils.validators import extract_video_id, normalize_youtube_url, validate_youtube_url

logger = get_logger(__name__)


def transcribe_audio_file(
    audio_path: Path,
    settings: Settings,
    *,
    video_id: str | None = None,
    time_offset_seconds: float = 0.0,
    language: str | None = None,
) -> list[tuple[float, float, str]]:
    """Chunk audio, send to STT API, and return timed transcript fragments."""
    with log_step(logger, "audio_chunking", video_id=video_id or "unknown"):
        chunks = chunking_service.chunk_audio_file(audio_path, settings)

    logger.info("[chunking] chunk_count=%s", len(chunks))

    if settings.save_debug_audio and video_id:
        chunking_service.save_debug_audio_chunks(chunks, settings.output_dir, video_id)

    provider = get_stt_provider(settings)
    results: list[tuple[float, float, str]] = []
    empty_chunk_count = 0
    total_stt_seconds = 0.0

    with tempfile.TemporaryDirectory() as temp_dir:
        for chunk in chunks:
            chunk_path = Path(temp_dir) / f"chunk_{chunk.index}.wav"
            chunk.audio.export(chunk_path, format="wav")
            log_chunk_metrics(
                logger,
                chunk_index=chunk.index,
                start_seconds=chunk.start_seconds,
                end_seconds=chunk.end_seconds,
                size_bytes=chunk_path.stat().st_size,
            )

            stt_started = time.perf_counter()
            with log_step(
                logger,
                "stt_api_call",
                chunk_index=chunk.index,
                start_seconds=chunk.start_seconds,
                end_seconds=chunk.end_seconds,
            ):
                text = provider.transcribe(chunk_path, language=language)
            total_stt_seconds += time.perf_counter() - stt_started

            text_empty = not text.strip()
            if text_empty:
                empty_chunk_count += 1
            logger.info(
                "[stt] chunk_index=%s | text_empty=%s | text_length=%s",
                chunk.index,
                text_empty,
                len(text),
            )
            results.append(
                (
                    time_offset_seconds + chunk.start_seconds,
                    time_offset_seconds + chunk.end_seconds,
                    text,
                )
            )

    logger.info(
        "[stt] summary | chunk_count=%s | empty_chunks=%s | total_stt_duration=%.3fs",
        len(chunks),
        empty_chunk_count,
        total_stt_seconds,
    )
    return results


def _transcribe_regular_video_with_stt(
    metadata: VideoMetadata,
    settings: Settings,
    *,
    extra_metadata: dict,
) -> TranscriptOutput:
    """Run STT pipeline for a regular video."""
    temp_path = youtube_service.with_temp_audio_file()
    try:
        audio_path = audio_service.extract_regular_audio(metadata, temp_path)
        duration = metadata.duration_seconds
        if duration is None:
            from pydub import AudioSegment

            duration = len(AudioSegment.from_file(audio_path)) / 1000.0

        chunk_results = transcribe_audio_file(
            audio_path,
            settings,
            video_id=metadata.video_id,
            language=metadata.language,
        )
        with log_step(logger, "transcript_building", method="stt"):
            segments = transcript_service.merge_stt_chunk_results(
                chunk_results,
                settings.timestamp_interval_seconds,
                duration or 0.0,
            )
            return transcript_service.build_transcript_output(
                metadata,
                segments,
                ProcessingMethod.STT,
                settings,
                extra_metadata=extra_metadata,
            )
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        wav_path = temp_path.with_suffix(".wav")
        if wav_path.exists():
            wav_path.unlink(missing_ok=True)


def process_regular_video(
    metadata: VideoMetadata,
    settings: Settings,
) -> TranscriptOutput:
    """Process regular video via subtitles with STT fallback."""
    processing_metadata = {
        "force_stt": settings.force_stt,
        "subtitle_attempted": not settings.force_stt,
    }

    if settings.force_stt:
        logger.info("Force STT enabled, skipping subtitle download")
        return _transcribe_regular_video_with_stt(
            metadata,
            settings,
            extra_metadata={
                **processing_metadata,
                "fallback_reason": "force_stt",
            },
        )

    try:
        with log_step(logger, "subtitle_attempt", video_id=metadata.video_id) as step:
            try:
                segments, subtitle_metadata = subtitle_service.download_subtitles(
                    metadata.source_url,
                    settings,
                    video_language=metadata.language,
                )
                step["result"] = "success"
            except SubtitlesUnavailableError:
                step["status"] = "unavailable"
                raise
        with log_step(logger, "transcript_building", method="subtitles"):
            return transcript_service.build_transcript_output(
                metadata,
                segments,
                ProcessingMethod.SUBTITLES,
                settings,
                extra_metadata={**processing_metadata, **subtitle_metadata},
            )
    except SubtitlesUnavailableError as error:
        logger.info("Subtitles unavailable, falling back to STT: %s", error)

    return _transcribe_regular_video_with_stt(
        metadata,
        settings,
        extra_metadata={
            **processing_metadata,
            "fallback_reason": "subtitles_unavailable",
        },
    )


def process_live_stream(
    metadata: VideoMetadata,
    settings: Settings,
) -> TranscriptOutput:
    """Process live stream via configurable STT window."""
    temp_path = youtube_service.with_temp_audio_file()
    try:
        audio_path, start, end = audio_service.extract_live_audio(
            metadata,
            settings,
            temp_path,
        )
        duration = max(end - start, 0.0)
        chunk_results = transcribe_audio_file(
            audio_path,
            settings,
            video_id=metadata.video_id,
            time_offset_seconds=start,
            language=metadata.language,
        )
        with log_step(logger, "transcript_building", method="stt"):
            segments = transcript_service.merge_stt_chunk_results(
                chunk_results,
                settings.timestamp_interval_seconds,
                duration,
            )
            return transcript_service.build_transcript_output(
                metadata,
                segments,
                ProcessingMethod.STT,
                settings,
                extra_metadata={
                    "live_window_start_seconds": start,
                    "live_window_end_seconds": end,
                },
            )
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        wav_path = temp_path.with_suffix(".wav")
        if wav_path.exists():
            wav_path.unlink(missing_ok=True)


def process_youtube_url(url: str, settings: Settings | None = None) -> TranscriptOutput:
    """Run the full transcription pipeline for a YouTube URL."""
    settings = settings or get_settings()
    pipeline_started = time.perf_counter()

    with log_step(logger, "url_validation"):
        url = url.strip()
        validate_youtube_url(url)
        video_id = extract_video_id(url)
        normalized_url = normalize_youtube_url(url)

    logger.info("Processing YouTube URL for video %s", video_id)

    with log_step(logger, "video_metadata_detection", video_id=video_id):
        metadata = youtube_service.get_video_metadata(normalized_url, settings)

    if metadata.video_type == VideoType.LIVE:
        transcript = process_live_stream(metadata, settings)
    else:
        transcript = process_regular_video(metadata, settings)

    transcript_service.save_transcript(transcript, settings)

    logger.info(
        "[timing] pipeline completed | duration=%.3fs | video_id=%s | method=%s",
        time.perf_counter() - pipeline_started,
        transcript.video_id,
        transcript.processing_method.value,
    )
    return transcript


def route_video_processing(
    metadata: VideoMetadata,
    settings: Settings,
) -> TranscriptOutput:
    """Route processing based on detected video type."""
    if metadata.video_type == VideoType.LIVE:
        return process_live_stream(metadata, settings)
    return process_regular_video(metadata, settings)
