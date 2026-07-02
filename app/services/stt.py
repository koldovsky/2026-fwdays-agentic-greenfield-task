"""STT provider interface."""

from abc import ABC, abstractmethod
from pathlib import Path

from app.config.settings import Settings
from app.exceptions import STTError


class STTProvider(ABC):
    """Provider-independent speech-to-text interface."""

    @abstractmethod
    def transcribe(self, audio_path: Path, *, language: str | None = None) -> str:
        """Transcribe a single audio chunk and return text."""


def get_stt_provider(settings: Settings) -> STTProvider:
    """Return configured STT provider implementation."""
    provider = settings.stt_provider.lower()
    if provider == "openai":
        from app.providers.openai import OpenAISTTProvider

        return OpenAISTTProvider(settings)
    if provider == "huggingface":
        from app.providers.huggingface import HuggingFaceSTTProvider

        return HuggingFaceSTTProvider(settings)
    raise STTError(f"Unsupported STT provider: {settings.stt_provider}")
