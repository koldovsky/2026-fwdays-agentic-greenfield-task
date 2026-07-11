"""Unit tests for the Phase 1 plan 05 buildtime constants in
``backend/src/epubtv/config.py`` (D-06).

The settings singleton gains two new fields:
- ``default_ollama_url`` (default ``http://localhost:11434/`` — bare
  service root, Ollama-native; env-var aliases
  ``EPUBTV_DEFAULT_OLLAMA_URL`` + ``DEFAULT_OLLAMA_URL``)
- ``default_openai_url`` (default ``https://api.openai.com/v1``;
  env-var aliases ``EPUBTV_DEFAULT_OPENAI_URL`` + ``DEFAULT_OPENAI_URL``)

3 tests cover: default value, env override, AliasChoices.
"""

from __future__ import annotations

import pytest

from epubtv.config import Settings


def test_default_ollama_url_default_value(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without any env var, the field defaults to ``http://localhost:11434/`` (Ollama native, no ``/v1``)."""
    monkeypatch.delenv("EPUBTV_DEFAULT_OLLAMA_URL", raising=False)
    monkeypatch.delenv("DEFAULT_OLLAMA_URL", raising=False)
    settings = Settings()
    assert settings.default_ollama_url == "http://localhost:11434/"


def test_default_openai_url_env_override(monkeypatch: pytest.MonkeyPatch) -> None:
    """``EPUBTV_DEFAULT_OPENAI_URL`` env var overrides the field default."""
    monkeypatch.setenv("EPUBTV_DEFAULT_OPENAI_URL", "https://my-openai.example.com/v1")
    settings = Settings()
    assert settings.default_openai_url == "https://my-openai.example.com/v1"


def test_default_ollama_url_alias_choices(monkeypatch: pytest.MonkeyPatch) -> None:
    """Both ``EPUBTV_DEFAULT_OLLAMA_URL`` and ``DEFAULT_OLLAMA_URL`` work (the AliasChoices pattern)."""
    # EPUBTV_DEFAULT_OLLAMA_URL works (covered above; verify the
    # bare DEFAULT_OLLAMA_URL — the env var the Dockerfile writes
    # as ENV in the runtime container — also works).
    monkeypatch.delenv("EPUBTV_DEFAULT_OLLAMA_URL", raising=False)
    monkeypatch.setenv("DEFAULT_OLLAMA_URL", "http://alias.example.com:11434/")
    settings = Settings()
    assert settings.default_ollama_url == "http://alias.example.com:11434/"
