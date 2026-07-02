"""Hugging Face STT API implementation."""

from __future__ import annotations

import io
import time
from pathlib import Path

import httpx
from pydub import AudioSegment

from app.config.settings import Settings
from app.exceptions import (
    EmptySTTResponseError,
    STTRateLimitError,
    STTTimeoutError,
    STTError,
)
from app.services.stt import STTProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)


class HuggingFaceSTTProvider(STTProvider):
    """Multilingual STT via Hugging Face Inference API."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = settings.stt_model
        self._api_url = f"{settings.huggingface_api_url.rstrip('/')}/{self._model}"

    def transcribe(self, audio_path: Path, *, language: str | None = None) -> str:
        """Send audio chunk to Hugging Face and return transcript text."""
        if not self._settings.huggingface_api_token:
            raise STTError(
                "HUGGINGFACE_API_TOKEN is required for STT transcription."
            )

        audio_bytes = self._prepare_audio_bytes(audio_path)
        headers = {
            "Authorization": f"Bearer {self._settings.huggingface_api_token}",
            "Content-Type": "audio/wav",
        }

        last_error: Exception | None = None
        for attempt in range(1, self._settings.stt_max_retries + 1):
            try:
                with httpx.Client(
                    timeout=self._settings.stt_request_timeout_seconds
                ) as client:
                    response = client.post(
                        self._api_url,
                        headers=headers,
                        content=audio_bytes,
                    )
            except httpx.TimeoutException as error:
                last_error = STTTimeoutError(
                    f"STT API timed out after {self._settings.stt_request_timeout_seconds}s"
                )
            except httpx.HTTPError as error:
                last_error = STTError(f"STT API request failed: {error}")
            else:
                if response.status_code == 429:
                    last_error = STTRateLimitError("STT API rate limit exceeded.")
                elif response.status_code >= 500:
                    last_error = STTError(
                        f"STT API server error ({response.status_code})."
                    )
                elif response.status_code >= 400:
                    raise STTError(
                        f"STT API rejected request ({response.status_code}): {response.text}"
                    )
                else:
                    text = self._parse_response(response.json())
                    if not text.strip():
                        raise EmptySTTResponseError("STT API returned empty transcript.")
                    return text.strip()

            if attempt < self._settings.stt_max_retries:
                sleep_for = self._settings.stt_retry_backoff_seconds * attempt
                logger.warning(
                    "STT attempt %s failed, retrying in %.1fs: %s",
                    attempt,
                    sleep_for,
                    last_error,
                )
                time.sleep(sleep_for)

        assert last_error is not None
        raise last_error

    @staticmethod
    def _prepare_audio_bytes(audio_path: Path) -> bytes:
        segment = AudioSegment.from_file(audio_path)
        buffer = io.BytesIO()
        segment.export(buffer, format="wav")
        return buffer.getvalue()

    @staticmethod
    def _parse_response(payload: object) -> str:
        if isinstance(payload, dict):
            if "text" in payload and isinstance(payload["text"], str):
                return payload["text"]
            if "generated_text" in payload and isinstance(payload["generated_text"], str):
                return payload["generated_text"]
            if "error" in payload:
                raise STTError(str(payload["error"]))
        if isinstance(payload, list) and payload:
            first = payload[0]
            if isinstance(first, dict) and "text" in first:
                return str(first["text"])
        raise EmptySTTResponseError("Unexpected STT response format.")
