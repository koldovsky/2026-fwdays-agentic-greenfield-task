"""``/health/nltk`` data-shape unit tests (Task 1 TDD cycle, D-09).

The HTTP route is wired in plan 02-03 (router); this module exercises
``compute_health()`` from ``domain/nltk_languages`` which is the single
source of truth for the locked response shape:
``{supported_languages, fallback_languages, suggest_command,
install_size_mb_estimate}``.

The legacy ``punkt`` package is deprecated by NLTK and is NOT installed;
only ``punkt_tab`` is baked.

Behaviours:
- ``test_health_shape_matches_locked_contract`` — exactly the four
  fields above, in the locked shape.
- ``test_suggest_command_is_punkt_tab_install`` — the suggest command
  is the single install command that flips the missing packages to
  installed; starts with ``python -m nltk.downloader`` and names
  ``punkt_tab``; ``None`` when everything is already baked.
- ``test_health_with_no_nltk_data_reports_fallback`` — when the
  package is not installed (monkeypatched), ``fallback_languages``
  equals the supported set and ``suggest_command`` is set.
- ``test_supported_languages_uses_19_closed_set`` — the 19 ISO 639-1
  codes from ``SUPPORTED_LANGUAGES`` are the only valid supported
  languages; nothing else.
"""

from __future__ import annotations

import nltk
import pytest

from epubtv.domain.nltk_languages import (
    ISO_639_1_BY_NLTK_NAME,
    SUPPORTED_LANGUAGES,
    TARGET_LANGUAGES,
    compute_health,
)

pytestmark = pytest.mark.tcid("XLATE-01-UT07")


def test_health_shape_matches_locked_contract() -> None:
    """The ``compute_health()`` return shape is the locked D-09 envelope."""
    health = compute_health()
    assert set(health.keys()) == {
        "supported_languages",
        "fallback_languages",
        "suggest_command",
        "install_size_mb_estimate",
    }
    assert isinstance(health["supported_languages"], list)
    assert isinstance(health["fallback_languages"], list)
    assert health["suggest_command"] is None or isinstance(health["suggest_command"], str)
    assert health["install_size_mb_estimate"] is None or isinstance(
        health["install_size_mb_estimate"], int
    )


def test_suggest_command_is_punkt_tab_install() -> None:
    """The suggest command is the single install command for punkt_tab."""
    health = compute_health()
    if health["suggest_command"] is None:
        # Already baked; install_size_mb_estimate is also None.
        assert health["install_size_mb_estimate"] is None
        return
    assert health["suggest_command"].startswith("python -m nltk.downloader")
    # punkt_tab is the only package NLTK ships now (punkt is deprecated).
    assert "punkt_tab" in health["suggest_command"]
    assert "punkt" not in health["suggest_command"].replace("punkt_tab", "")


def test_health_with_no_nltk_data_reports_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    """When no NLTK data is installed, ``fallback_languages`` equals the
    supported set and ``suggest_command`` is populated.
    """
    monkeypatch.setattr(
        "epubtv.domain.nltk_languages._nltk_resource_installed",
        lambda resource: False,
    )
    health = compute_health()
    assert set(health["supported_languages"]) == set(SUPPORTED_LANGUAGES)
    assert set(health["fallback_languages"]) == set(SUPPORTED_LANGUAGES)
    assert health["suggest_command"] is not None
    assert "punkt_tab" in health["suggest_command"]
    assert health["install_size_mb_estimate"] is not None
    assert health["install_size_mb_estimate"] > 0


def test_health_with_all_data_reports_empty_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When all NLTK pickles are present, ``fallback_languages`` is empty
    and ``suggest_command`` is ``None`` (everything is installed).
    """
    monkeypatch.setattr(
        "epubtv.domain.nltk_languages._nltk_resource_installed",
        lambda resource: True,
    )
    health = compute_health()
    assert set(health["supported_languages"]) == set(SUPPORTED_LANGUAGES)
    assert health["fallback_languages"] == []
    assert health["suggest_command"] is None
    assert health["install_size_mb_estimate"] is None


def test_supported_languages_is_19_closed_set() -> None:
    """The 19 ISO 639-1 codes per D-09 + ADR 0010."""
    assert len(SUPPORTED_LANGUAGES) == 19
    assert (
        frozenset(
            {
                "cs",
                "da",
                "nl",
                "en",
                "et",
                "fi",
                "fr",
                "de",
                "el",
                "it",
                "ml",
                "no",
                "pl",
                "pt",
                "ru",
                "sl",
                "es",
                "sv",
                "tr",
            }
        )
        == SUPPORTED_LANGUAGES
    )


def test_target_languages_is_at_least_55() -> None:
    """F2 AC: target language list has ≥55 ISO 639-1 codes."""
    assert len(TARGET_LANGUAGES) >= 55


def test_iso_639_1_mapping_covers_all_supported_languages() -> None:
    """Every entry in ``ISO_639_1_BY_NLTK_NAME`` is in ``SUPPORTED_LANGUAGES``."""
    assert set(ISO_639_1_BY_NLTK_NAME.values()) == set(SUPPORTED_LANGUAGES)


def test_nltk_data_path_walk_works_in_current_environment() -> None:
    """Sanity: ``nltk.data.find`` is callable for the punkt_tab resource."""
    # Just exercise the import path; do not assert on actual data.
    nltk.data.find("tokenizers/punkt_tab")  # may raise LookupError, that's fine
