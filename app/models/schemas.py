"""Data models and DTOs."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class VideoType(str, Enum):
    """YouTube content type."""

    LIVE = "live"
    REGULAR = "regular"


class ProcessingMethod(str, Enum):
    """Transcript source method."""

    SUBTITLES = "subtitles"
    STT = "stt"


class TranscriptSegment(BaseModel):
    """Single timestamped transcript block."""

    timestamp: str
    start_seconds: float
    end_seconds: float
    text: str


class VideoMetadata(BaseModel):
    """YouTube video metadata."""

    video_id: str
    source_url: str
    title: str = ""
    video_type: VideoType
    is_live: bool = False
    duration_seconds: float | None = None
    live_offset_seconds: float | None = None
    language: str | None = None


class TranscriptOutput(BaseModel):
    """Complete transcript result."""

    source_url: str
    video_id: str
    video_type: VideoType
    processing_method: ProcessingMethod
    timestamp_interval_seconds: int
    segments: list[TranscriptSegment]
    metadata: dict[str, Any] = Field(default_factory=dict)
