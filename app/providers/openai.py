"""OpenAI STT API implementation."""

from __future__ import annotations

import time
from pathlib import Path

import httpx

from app.config.settings import Settings
from app.exceptions import (
    EmptySTTResponseError,
    NetworkError,
    STTRateLimitError,
    STTTimeoutError,
    STTError,
)
from app.services.stt import STTProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _language_base(code: str) -> str:
    return code.lower().split("-")[0]


class OpenAISTTProvider(STTProvider):
    """Multilingual STT via OpenAI Audio Transcriptions API."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = settings.stt_model
        self._api_url = f"{settings.openai_api_url.rstrip('/')}/audio/transcriptions"

    def transcribe(self, audio_path: Path, *, language: str | None = None) -> str:
        """Send audio chunk to OpenAI and return transcript text."""
        if not self._settings.openai_api_key:
            raise STTError("OPENAI_API_KEY is required for STT transcription.")

        headers = {"Authorization": f"Bearer {self._settings.openai_api_key}"}
        last_error: Exception | None = None
        stt_language = language or self._settings.stt_language or None

        for attempt in range(1, self._settings.stt_max_retries + 1):
            try:
                with httpx.Client(
                    timeout=self._settings.stt_request_timeout_seconds
                ) as client:
                    with audio_path.open("rb") as audio_file:
                        form_data: dict[str, str] = {"model": self._model}
                        if stt_language:
                            form_data["language"] = _language_base(stt_language)
                        response = client.post(
                            self._api_url,
                            headers=headers,
                            data=form_data,
                            files={"file": (audio_path.name, audio_file, "audio/wav")},
                        )
            except httpx.TimeoutException:
                last_error = STTTimeoutError(
                    f"STT API timed out after {self._settings.stt_request_timeout_seconds}s"
                )
            except httpx.HTTPError as error:
                message = str(error).lower()
                if "getaddrinfo failed" in message:
                    last_error = NetworkError(
                        "Could not reach OpenAI API (DNS/network error). "
                        "Check your internet connection, DNS settings, VPN, or proxy."
                    )
                else:
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
    def _parse_response(payload: object) -> str:
        if isinstance(payload, dict):
            if "text" in payload and isinstance(payload["text"], str):
                return payload["text"]
            if "error" in payload:
                error = payload["error"]
                if isinstance(error, dict) and "message" in error:
                    raise STTError(str(error["message"]))
                raise STTError(str(error))
        raise EmptySTTResponseError("Unexpected STT response format.")
