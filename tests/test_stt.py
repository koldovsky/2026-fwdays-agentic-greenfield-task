"""Tests for STT provider."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx
import pytest
from pydub.generators import Sine

from app.config.settings import Settings
from app.exceptions import EmptySTTResponseError, STTRateLimitError, STTTimeoutError, STTError
from app.providers.huggingface import HuggingFaceSTTProvider
from app.providers.openai import OpenAISTTProvider
from app.services.stt import get_stt_provider


def _create_wav(path: Path) -> None:
    Sine(440).to_audio_segment(duration=500).export(path, format="wav")


def test_get_stt_provider_returns_openai() -> None:
    settings = Settings(stt_provider="openai")
    provider = get_stt_provider(settings)
    assert isinstance(provider, OpenAISTTProvider)


def test_get_stt_provider_returns_huggingface() -> None:
    settings = Settings(stt_provider="huggingface")
    provider = get_stt_provider(settings)
    assert isinstance(provider, HuggingFaceSTTProvider)


def test_get_stt_provider_unknown_raises() -> None:
    settings = Settings(stt_provider="unknown")
    with pytest.raises(STTError):
        get_stt_provider(settings)


def test_openai_transcribe_success(tmp_path: Path) -> None:
    audio_path = tmp_path / "chunk.wav"
    _create_wav(audio_path)
    settings = Settings(openai_api_key="test-token")
    provider = OpenAISTTProvider(settings)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"text": "hello world"}

    with patch("app.providers.openai.httpx.Client") as client_cls:
        client = client_cls.return_value.__enter__.return_value
        client.post.return_value = mock_response
        text = provider.transcribe(audio_path)

    assert text == "hello world"


def test_openai_transcribe_timeout(tmp_path: Path) -> None:
    audio_path = tmp_path / "chunk.wav"
    _create_wav(audio_path)
    settings = Settings(openai_api_key="test-token", stt_max_retries=1)
    provider = OpenAISTTProvider(settings)

    with patch("app.providers.openai.httpx.Client") as client_cls:
        client = client_cls.return_value.__enter__.return_value
        client.post.side_effect = httpx.TimeoutException("timeout")
        with pytest.raises(STTTimeoutError):
            provider.transcribe(audio_path)


def test_openai_transcribe_rate_limit(tmp_path: Path) -> None:
    audio_path = tmp_path / "chunk.wav"
    _create_wav(audio_path)
    settings = Settings(openai_api_key="test-token", stt_max_retries=1)
    provider = OpenAISTTProvider(settings)

    mock_response = MagicMock()
    mock_response.status_code = 429

    with patch("app.providers.openai.httpx.Client") as client_cls:
        client = client_cls.return_value.__enter__.return_value
        client.post.return_value = mock_response
        with pytest.raises(STTRateLimitError):
            provider.transcribe(audio_path)


def test_openai_empty_response(tmp_path: Path) -> None:
    audio_path = tmp_path / "chunk.wav"
    _create_wav(audio_path)
    settings = Settings(openai_api_key="test-token", stt_max_retries=1)
    provider = OpenAISTTProvider(settings)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"text": "   "}

    with patch("app.providers.openai.httpx.Client") as client_cls:
        client = client_cls.return_value.__enter__.return_value
        client.post.return_value = mock_response
        with pytest.raises(EmptySTTResponseError):
            provider.transcribe(audio_path)


def test_huggingface_transcribe_success(tmp_path: Path) -> None:
    audio_path = tmp_path / "chunk.wav"
    _create_wav(audio_path)
    settings = Settings(huggingface_api_token="test-token")
    provider = HuggingFaceSTTProvider(settings)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"text": "hello world"}

    with patch("app.providers.huggingface.httpx.Client") as client_cls:
        client = client_cls.return_value.__enter__.return_value
        client.post.return_value = mock_response
        text = provider.transcribe(audio_path)

    assert text == "hello world"
