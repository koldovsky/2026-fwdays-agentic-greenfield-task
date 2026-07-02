"""Application configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application settings with documented defaults."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    timestamp_interval_seconds: int = Field(default=15, ge=1)
    live_before_minutes: int = Field(default=3, ge=0)
    live_after_minutes: int = Field(default=3, ge=0)
    max_chunk_duration_seconds: int = Field(default=60, ge=1)
    silence_detection_enabled: bool = True
    stt_provider: str = "openai"
    stt_model: str = "whisper-1"
    output_dir: Path = Path("output")
    save_debug_audio: bool = False
    force_stt: bool = False

    openai_api_key: str = ""
    openai_api_url: str = "https://api.openai.com/v1"

    huggingface_api_token: str = ""
    huggingface_api_url: str = "https://api-inference.huggingface.co/models"

    silence_min_silence_len_ms: int = 500
    silence_silence_thresh_db: int = -40
    silence_keep_silence_ms: int = 200

    stt_request_timeout_seconds: float = 120.0
    stt_max_retries: int = 3
    stt_retry_backoff_seconds: float = 2.0

    subtitle_max_retries: int = 3
    subtitle_retry_backoff_seconds: float = 2.0
    subtitle_preferred_languages: str = "uk,en,ru"
    stt_language: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
