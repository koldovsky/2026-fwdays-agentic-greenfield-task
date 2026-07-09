"""LLMProvider interface and the v1 OpenAI-compatible implementation.

v1 targets LM Studio on the host, but any OpenAI-compatible endpoint works:
configure LLM_BASE_URL and LLM_MODEL.
"""

import os
import re
from abc import ABC, abstractmethod

import httpx

DEFAULT_BASE_URL = "http://host.docker.internal:1234/v1"
DEFAULT_MODEL = "google/gemma-4-e4b"

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


def strip_think(text: str) -> str:
    """Remove reasoning-model <think> blocks — deliberation, not answer."""
    return _THINK_RE.sub("", text).strip()


class LLMError(RuntimeError):
    """The LLM endpoint failed or returned an unusable response.

    A transport/HTTP/parsing failure is NOT an honest "not in corpus" refusal —
    it is surfaced as an error so callers don't fabricate a refusal on an outage.
    """


class LLMProvider(ABC):
    """Interface: "generate an answer from context"."""

    @abstractmethod
    def complete(self, system: str, user: str) -> str: ...


class OpenAICompatibleProvider(LLMProvider):
    def __init__(self, base_url: str | None = None, model: str | None = None):
        self._base_url = (base_url or os.environ.get("LLM_BASE_URL", DEFAULT_BASE_URL)).rstrip("/")
        self._model = model or os.environ.get("LLM_MODEL", DEFAULT_MODEL)

    def complete(self, system: str, user: str) -> str:
        try:
            response = httpx.post(
                f"{self._base_url}/chat/completions",
                json={
                    "model": self._model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0,
                },
                timeout=120,
            )
            response.raise_for_status()
        except httpx.HTTPError as e:
            raise LLMError(f"LLM-запит не вдався ({self._base_url}, {self._model}): {e}") from e

        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise LLMError(f"LLM повернув неочікувану відповідь: {e}") from e
        return strip_think(content)
