"""Pydantic v2 schema unit tests (TDD Task 1 RED — plan 02-03).

Locks the discriminated-union behaviour for ``JobCreateBody`` (D-05), the
``HealthNltkResponse`` shape (D-09), the ``GetEpubResponse`` shape (D-06),
and the ``error_codes`` constants.

No FastAPI / httpx — pure Pydantic. The HTTP-layer tests live in
``test_jobs_router.py`` / ``test_health_nltk_endpoint.py`` /
``test_get_epub_endpoint.py``.
"""

from __future__ import annotations

from typing import Annotated, Union, get_args, get_origin

import pytest
from pydantic import ValidationError

from epubtv.api.error_codes import (
    PHASE_NOT_YET_IMPLEMENTED,
    PROVIDER_TIMEOUT,
    SOURCE_LANGUAGE_REQUIRED,
    VALIDATION_ERROR,
)
from epubtv.api.schemas import (
    CombinedJobBody,
    GetEpubResponse,
    HealthNltkResponse,
    JobCreateBody,
    JobListResponse,
    JobView,
    TranslationFieldsMixin,
    TranslationJobBody,
    VoiceoverJobBody,
)

pytestmark = pytest.mark.tcid("JOBS-01-UT16")

# ---------------------------------------------------------------------------
# TranslationFieldsMixin (D-05)
# ---------------------------------------------------------------------------


def test_translation_fields_mixin_rejects_extra_field() -> None:
    """``extra="forbid"`` propagates from the mixin to a concrete variant."""

    # Use a direct subclass so the test isolates the mixin behaviour.
    class _Body(TranslationFieldsMixin):
        job_type: str  # any literal; we're only testing the mixin itself

    # The mixin fields accept their declared types.
    _Body(job_type="translation", provider="ollama", model="x", target_language="de")
    # Extra fields are forbidden at the schema layer (Pitfall 2).
    with pytest.raises(ValidationError) as exc:
        _Body(
            job_type="translation",
            provider="ollama",
            model="x",
            target_language="de",
            # pyrefly: ignore [unexpected-keyword]
            unknown_field="x",
        )
    assert "unknown_field" in str(exc.value)


# ---------------------------------------------------------------------------
# TranslationJobBody
# ---------------------------------------------------------------------------


def test_translation_job_body_happy_path() -> None:
    """A well-formed translation body constructs successfully."""
    body = TranslationJobBody(
        job_type="translation",
        epub_id="e1",
        provider="ollama",
        model="translategemma:12b",
        source_language="en",
        target_language="de",
    )
    assert body.job_type == "translation"
    assert body.provider == "ollama"
    assert body.target_language == "de"
    assert body.source_language == "en"
    assert body.epub_id == "e1"
    assert body.chapter_ids is None


def test_translation_job_body_rejects_extra_field() -> None:
    """``extra="forbid"`` rejects stray fields at parse time (Pitfall 2)."""
    with pytest.raises(ValidationError) as exc:
        TranslationJobBody(
            job_type="translation",
            epub_id="e1",
            provider="ollama",
            model="x",
            target_language="de",
            # pyrefly: ignore [unexpected-keyword]
            unknown_field="x",
        )
    assert "unknown_field" in str(exc.value)


def test_translation_job_body_source_language_optional() -> None:
    """``source_language`` is Optional — D-06 router pre-flight fills it in."""
    body = TranslationJobBody(
        job_type="translation",
        epub_id="e1",
        provider="ollama",
        model="x",
        target_language="de",
    )
    assert body.source_language is None


def test_translation_job_body_chapter_ids_optional() -> None:
    """``chapter_ids`` is Optional (None → all chapters per CONTEXT)."""
    body = TranslationJobBody(
        job_type="translation",
        epub_id="e1",
        provider="ollama",
        model="x",
        target_language="de",
    )
    assert body.chapter_ids is None
    body2 = TranslationJobBody(
        job_type="translation",
        epub_id="e1",
        provider="ollama",
        model="x",
        target_language="de",
        chapter_ids=["chapter_1", "chapter_3"],
    )
    assert body2.chapter_ids == ["chapter_1", "chapter_3"]


# ---------------------------------------------------------------------------
# VoiceoverJobBody (F4-AC1 + D-05)
# ---------------------------------------------------------------------------


def test_voiceover_job_body_happy_path() -> None:
    """A well-formed voiceover body constructs with the new required fields."""
    body = VoiceoverJobBody(
        job_type="voiceover",
        epub_id="e1",
        voice="female",
        # Phase 1 plan 01-03 / BACK-09: ``provider`` + ``model`` are
        # now REQUIRED on the voiceover body.
        provider="openai-compatible",
        model="tts-1",
    )
    assert body.job_type == "voiceover"
    assert body.voice == "female"
    assert body.epub_id == "e1"
    assert body.provider == "openai-compatible"
    assert body.model == "tts-1"
    assert body.chapter_ids is None


def test_voiceover_job_body_provider_field_has_default() -> None:
    """F4-AC1: ``provider`` has a default of ``"openai-compatible"`` on a voiceover body.

    Quick 260709-54r changed the ``VoiceoverJobBody`` contract
    from BACK-09's REQUIRED ``provider`` to a DEFAULT
    (``"openai-compatible"``) because the SPA's voiceover form
    does not send ``provider`` (the chooser dispatches to the
    TTS-only leg; the default is the only TTS provider per
    TTS-02). A body that omits ``provider`` constructs
    successfully and the field carries the default; an
    explicit ``provider`` overrides the default. The
    ``extra="forbid"`` gate is preserved (unknown fields
    still 422).
    """
    # Default value: omitting ``provider`` constructs successfully.
    body_default = VoiceoverJobBody(  # pyrefly: ignore[missing-argument]
        job_type="voiceover",
        epub_id="e1",
        voice="female",
        model="tts-1",
    )
    assert body_default.provider == "openai-compatible"

    # Explicit value: the caller can still override the default.
    body_explicit = VoiceoverJobBody(
        job_type="voiceover",
        epub_id="e1",
        voice="female",
        provider="openai-compatible",
        model="tts-1",
    )
    assert body_explicit.provider == "openai-compatible"


def test_voiceover_job_body_model_field_has_default() -> None:
    """F4-AC1: ``model`` has a default of ``"tts-1"`` on a voiceover body.

    Quick 260709-54r changed the ``VoiceoverJobBody`` contract
    from BACK-09's REQUIRED ``model`` to a DEFAULT (``"tts-1"``)
    because the SPA's voiceover form does not send ``model``
    (the chooser dispatches to the TTS-only leg; the default
    is the canonical TTS model). A body that omits ``model``
    constructs successfully and the field carries the default;
    an explicit ``model`` overrides the default.
    """
    # Default value: omitting ``model`` constructs successfully.
    body_default = VoiceoverJobBody(  # pyrefly: ignore[missing-argument]
        job_type="voiceover",
        epub_id="e1",
        voice="female",
        provider="openai-compatible",
    )
    assert body_default.model == "tts-1"

    # Explicit value: the caller can still override the default.
    body_explicit = VoiceoverJobBody(
        job_type="voiceover",
        epub_id="e1",
        voice="female",
        provider="openai-compatible",
        model="tts-1",
    )
    assert body_explicit.model == "tts-1"


def test_voiceover_job_body_rejects_source_language_field() -> None:
    """F4-AC1: ``source_language`` is rejected on a voiceover body at parse time."""
    with pytest.raises(ValidationError) as exc:
        VoiceoverJobBody(
            job_type="voiceover",
            epub_id="e1",
            voice="female",
            provider="openai-compatible",
            model="tts-1",
            # pyrefly: ignore [unexpected-keyword]
            source_language="en",
        )
    assert "source_language" in str(exc.value)


def test_voiceover_job_body_rejects_target_language_field() -> None:
    """F4-AC1: ``target_language`` is rejected on a voiceover body at parse time."""
    with pytest.raises(ValidationError) as exc:
        VoiceoverJobBody(
            job_type="voiceover",
            epub_id="e1",
            voice="female",
            provider="openai-compatible",
            model="tts-1",
            # pyrefly: ignore [unexpected-keyword]
            target_language="de",
        )
    assert "target_language" in str(exc.value)


# ---------------------------------------------------------------------------
# CombinedJobBody
# ---------------------------------------------------------------------------


def test_combined_job_body_happy_path() -> None:
    """A well-formed combined body includes both translation and voiceover fields."""
    body = CombinedJobBody(
        job_type="translation+voiceover",
        epub_id="e1",
        provider="ollama",
        model="translategemma:12b",
        target_language="de",
        voice="female",
    )
    assert body.job_type == "translation+voiceover"
    assert body.provider == "ollama"
    assert body.voice == "female"
    assert body.source_language is None


# ---------------------------------------------------------------------------
# JobCreateBody discriminated union
# ---------------------------------------------------------------------------


def test_job_create_body_is_annotated_union() -> None:
    """``JobCreateBody`` is a discriminated union of 3 variants (D-05)."""
    # ``JobCreateBody`` is ``Annotated[Union[...], Field(discriminator=...)]``.
    # The outer ``get_origin`` is ``typing.Annotated``; ``get_args`` returns
    # ``(Union[...], Field(discriminator='job_type'))``. The first arg is
    # the union; the second is the discriminator metadata.
    import types

    assert get_origin(JobCreateBody) is Annotated
    args = get_args(JobCreateBody)
    union_arg, _field_arg = args[0], args[1]
    # Python 3.10+ ``X | Y`` syntax maps to ``types.UnionType``; the older
    # ``typing.Union`` is also possible if the source is rewritten.
    assert get_origin(union_arg) in (Union, types.UnionType)
    union_members = get_args(union_arg)
    assert set(union_members) == {TranslationJobBody, VoiceoverJobBody, CombinedJobBody}


def test_job_create_body_discriminator_is_job_type() -> None:
    """The discriminator is ``job_type`` (D-05 verbatim)."""
    from epubtv.api.schemas import _JOB_TYPE_DISCRIMINATOR

    assert _JOB_TYPE_DISCRIMINATOR == "job_type"


# ---------------------------------------------------------------------------
# JobView
# ---------------------------------------------------------------------------


def test_job_view_happy_path() -> None:
    """A JobView constructs from a valid dict."""
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    view = JobView(
        id="j1",
        epub_id="e1",
        job_type="translation",
        status="queued",
        source_language="en",
        target_language="de",
        voice=None,  # Phase 3 / D-06: translation jobs have no voice
        chapter_ids=[],
        last_chunk_id=None,
        created_at=now,
        updated_at=now,
    )
    assert view.id == "j1"
    assert view.job_type == "translation"
    assert view.voice is None


def test_job_view_rejects_extra_field() -> None:
    """``extra="forbid"`` on JobView."""
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    with pytest.raises(ValidationError) as exc:
        JobView(
            id="j1",
            epub_id="e1",
            job_type="translation",
            status="queued",
            source_language=None,
            target_language=None,
            voice=None,
            chapter_ids=[],
            last_chunk_id=None,
            created_at=now,
            updated_at=now,
            # pyrefly: ignore [unexpected-keyword]
            extra_field="x",
        )
    assert "extra_field" in str(exc.value)


def test_job_list_response_rejects_extra_field() -> None:
    """``extra="forbid"`` on JobListResponse."""
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    with pytest.raises(ValidationError) as exc:
        JobListResponse(
            jobs=[
                JobView(
                    id="j1",
                    epub_id="e1",
                    job_type="translation",
                    status="queued",
                    source_language=None,
                    target_language=None,
                    voice=None,
                    chapter_ids=[],
                    last_chunk_id=None,
                    created_at=now,
                    updated_at=now,
                )
            ],
            # pyrefly: ignore [unexpected-keyword]
            extra_field="x",
        )
    assert "extra_field" in str(exc.value)


# ---------------------------------------------------------------------------
# HealthNltkResponse (D-09)
# ---------------------------------------------------------------------------


def test_health_nltk_response_happy_path() -> None:
    """The 4-key D-09 shape constructs successfully."""
    resp = HealthNltkResponse(
        supported_languages=["en", "de"],
        fallback_languages=["fr"],
        suggest_command="python -m nltk.downloader punkt_tab",
        install_size_mb_estimate=4,
    )
    assert resp.suggest_command == "python -m nltk.downloader punkt_tab"
    assert resp.install_size_mb_estimate == 4


def test_health_nltk_response_with_baked_data() -> None:
    """When everything is baked, ``suggest_command`` + ``install_size_mb_estimate`` are ``None``."""
    resp = HealthNltkResponse(
        supported_languages=["en", "de"],
        fallback_languages=[],
    )
    assert resp.suggest_command is None
    assert resp.install_size_mb_estimate is None


def test_health_nltk_response_rejects_extra_field() -> None:
    """``extra="forbid"`` on HealthNltkResponse."""
    with pytest.raises(ValidationError) as exc:
        HealthNltkResponse(
            supported_languages=[],
            fallback_languages=[],
            # pyrefly: ignore [unexpected-keyword]
            extra="y",
        )
    assert "extra" in str(exc.value)


# ---------------------------------------------------------------------------
# GetEpubResponse (D-06)
# ---------------------------------------------------------------------------


def test_get_epub_response_happy_path() -> None:
    """A GetEpubResponse constructs with the 6-field shape."""
    resp = GetEpubResponse(
        epub_id="e1",
        title="The Prince",
        author="Saint-Exupéry",
        declared_languages=["fr"],
        chapter_count=10,
        chapter_ids=[f"chapter_{i + 1}" for i in range(10)],
    )
    assert resp.epub_id == "e1"
    assert resp.chapter_count == 10


def test_get_epub_response_defaults() -> None:
    """Defaults: title/author None, declared_languages=[], chapter_count=0."""
    resp = GetEpubResponse(epub_id="e1")
    assert resp.title is None
    assert resp.author is None
    assert resp.declared_languages == []
    assert resp.chapter_count == 0
    assert resp.chapter_ids == []


def test_get_epub_response_rejects_extra_field() -> None:
    """``extra="forbid"`` on GetEpubResponse."""
    with pytest.raises(ValidationError) as exc:
        GetEpubResponse(
            epub_id="e1",
            # pyrefly: ignore [unexpected-keyword]
            extra="y",
        )
    assert "extra" in str(exc.value)


# ---------------------------------------------------------------------------
# error_codes
# ---------------------------------------------------------------------------


def test_error_codes_strings() -> None:
    """The 4 error code constants are stable, named string literals."""
    assert PHASE_NOT_YET_IMPLEMENTED == "phase_not_yet_implemented"
    assert SOURCE_LANGUAGE_REQUIRED == "source_language_required"
    assert PROVIDER_TIMEOUT == "provider_timeout"
    assert VALIDATION_ERROR == "validation_error"
