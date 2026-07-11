"""Pydantic v2 API schemas (initial skeleton for Phase 1).

- ``ErrorPayload`` / ``ErrorResponse`` lock the ``{error:{code,message,details?}}``
  envelope shape (INFRA-03, api-contract.md).
- ``EpubUploadResponse`` is a *shell* in Phase 1 — Plan 02 wires the real
  F1 field population in ``routers/epubs.py``; here it exists so error
  handler return types and tests can reference it without import errors.

All models use ``model_config = ConfigDict(extra="forbid")`` so unknown keys
in responses are rejected at the schema layer (F4-AC1 schema-level gate
discipline carries forward to all later response models).

Phase 2 (plan 02-03) appends the JOBS-01 discriminated union + D-06
``GetEpubResponse`` + D-09 ``HealthNltkResponse``:
- ``TranslationFieldsMixin`` carries the translation-only fields
  (``provider``, ``model``, ``source_language``, ``target_language``).
  The mixin's ``extra="forbid"`` propagates to ``TranslationJobBody`` +
  ``CombinedJobBody`` (Pitfall 2). ``VoiceoverJobBody`` does NOT inherit
  the mixin — the schema-level gate rejects translation fields at parse
  time (F4-AC1 + D-05).
- ``JobCreateBody`` is a ``Annotated[Union[...], Field(discriminator=
  "job_type")]`` alias, NOT a BaseModel subclass. FastAPI consumes it as
  the request body model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# Locked discriminator string for ``JobCreateBody`` — exported for the
# unit tests that prove the D-05 wiring.
_JOB_TYPE_DISCRIMINATOR: str = "job_type"


class ErrorPayload(BaseModel):
    """Single error payload inside the envelope."""

    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    """Top-level error envelope: ``{error: {code, message, details?}}``."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorPayload


class EpubUploadResponse(BaseModel):
    """Shell for F1 ``POST /api/v1/epubs`` response.

    Plan 02 wires real population in ``routers/epubs.py``; Phase 1 only
    guarantees the shape exists so error handler response model refs and
    error-envelope tests do not import-fail.
    """

    model_config = ConfigDict(extra="forbid")

    epub_id: str
    title: str | None = None
    author: str | None = None
    declared_languages: list[str] = []
    chapter_count: int = 0
    chapter_ids: list[str] = []


# ---------------------------------------------------------------------------
# Phase 2 — JOBS-01 + CONF-01 + CONF-02 + D-09 (plan 02-03)
# ---------------------------------------------------------------------------


class TranslationFieldsMixin(BaseModel):
    """Mixin carrying the translation-only fields (D-05).

    ``extra="forbid"`` is set on the mixin's ``model_config`` so it
    propagates to ``TranslationJobBody`` + ``CombinedJobBody`` (Pitfall 2:
    a top-level ``extra="forbid"`` on the union does NOT propagate to
    variants; the gate MUST be on each variant class).

    The voiceover variant does NOT inherit this mixin — the schema-level
    gate is the F4-AC1 + D-05 contract: any translation field on a
    voiceover body is rejected at parse time, before the 501 dispatch
    fires.

    Phase 1 plan 02: ``provider_base_url`` is the user-chosen base URL
    for the translation provider (Ollama or OpenAI-compatible). The
    field is optional for the sprint — the in-process
    ``MockTranslationAdapter`` ignores it; the consolidated mock
    service (Plan 04) is the consumer. The field is
    forward-compat-friendly: a missing field defaults to ``None`` so
    pre-Plan 02 SPA builds still validate cleanly.
    """

    model_config = ConfigDict(extra="forbid")

    provider: Literal["ollama", "openai-compatible"]
    model: str
    source_language: str | None = None
    target_language: str
    provider_base_url: str | None = None


class TranslationJobBody(TranslationFieldsMixin):
    """JOBS-01 translation body: translation-only fields + epub + chapter_ids."""

    model_config = ConfigDict(extra="forbid")

    job_type: Literal["translation"]
    epub_id: str
    chapter_ids: list[str] | None = None


class VoiceoverJobBody(BaseModel):
    """JOBS-01 + F4-AC1 voiceover body — does NOT inherit ``TranslationFieldsMixin``.

    The ``extra="forbid"`` below is the schema-level gate: a client posting
    a voiceover body with a stray ``source_language`` /
    ``target_language`` field gets a 422 from FastAPI BEFORE the router's
    501 dispatch check runs. This is the D-05 + F4-AC1 contract enforced
    at parse time.

    Phase 1 plan 03: ``provider_base_url`` + ``provider_api_key`` are
    the user-chosen TTS provider config (OpenAI-compatible for the
    voice-over pipeline). Both are optional for the sprint — the
    in-process ``MockTTSAdapter`` ignores them; the consolidated
    mock service (Plan 04) is the consumer.

    Quick 260709-54r: ``provider`` + ``model`` have defaults (BACK-09).
    The only sprint-legal TTS provider is ``"openai-compatible"`` per
    TTS-02 and the only sprint-legal TTS model is ``"tts-1"`` (the
    consolidated mock service is single-model per provider; the SPA
    does not surface a model picker). The defaults restore the
    user-visible behavior: the SPA's voiceover form submits a body
    with ``{job_type, epub_id, voice}`` and the row carries the
    sprint defaults — no Pydantic 422 at parse time. The
    ``extra="forbid"`` gate stays: a stray translation field on a
    voiceover body is still rejected at parse time (F4-AC1 + D-15).
    """

    model_config = ConfigDict(extra="forbid")

    job_type: Literal["voiceover"]
    epub_id: str
    voice: str
    provider: Literal["openai-compatible"] = "openai-compatible"
    model: str = "tts-1"
    provider_base_url: str | None = None
    provider_api_key: str | None = None
    chapter_ids: list[str] | None = None


class CombinedJobBody(TranslationFieldsMixin):
    """JOBS-01 combined body — translation fields + voice field."""

    model_config = ConfigDict(extra="forbid")

    job_type: Literal["translation+voiceover"]
    epub_id: str
    voice: str
    chapter_ids: list[str] | None = None


# D-05 + JOBS-01 discriminated union. ``Annotated[Union[...], Field(
# discriminator="job_type")]`` lets FastAPI pick the right variant
# based on the ``job_type`` literal in the request body. Unknown
# ``job_type`` → 422 (T-02-13 mitigation).
JobCreateBody = Annotated[
    TranslationJobBody | VoiceoverJobBody | CombinedJobBody,
    Field(discriminator=_JOB_TYPE_DISCRIMINATOR),
]


class JobView(BaseModel):
    """JOBS-05 single-job view (response model for POST/GET ``/jobs``).

    Phase 3 / D-06: the ``voice`` field is included so the SPA can
    display the chosen voice in the ``JobStatusPanel``. ``None`` for
    translation jobs (the column default); non-``None`` for voiceover
    jobs (the value the router preflight validated against
    ``VOICES`` — the canonical OpenAI voice list).

    Phase 1 plan 03 / BACK-09: ``provider`` + ``model`` are included so
    the SPA can display the per-provider dispatch choice. Both are
    nullable for the v1.1 back-compat (the v1.1 demo's legacy rows
    have neither column populated; the orchestrator returns 422 for
    them but the row is loadable through the repo).
    """

    model_config = ConfigDict(extra="forbid")

    id: str
    epub_id: str
    job_type: str
    status: str
    source_language: str | None
    target_language: str | None
    voice: str | None
    provider: str | None = None
    model: str | None = None
    chapter_ids: list[str]
    last_chunk_id: str | None
    created_at: datetime
    updated_at: datetime


class JobListResponse(BaseModel):
    """JOBS-05 list response: ``{jobs: [JobView, ...]}``."""

    model_config = ConfigDict(extra="forbid")

    jobs: list[JobView]


class HealthNltkResponse(BaseModel):
    """D-09 locked ``/health/nltk`` response shape.

    Four fields per the locked contract:
    - ``supported_languages`` (list[str]; ISO 639-1; the 19 closed set
      NLTK ships as ``punkt_tab``)
    - ``fallback_languages`` (list[str]; ISO 639-1; ``supported_languages -
      installed_supported`` — the languages the regex fallback is used for
      until the ``punkt_tab`` pickle is installed on disk)
    - ``suggest_command`` (str | None; ``python -m nltk.downloader
      punkt_tab`` when missing, ``None`` when already baked)
    - ``install_size_mb_estimate`` (int | None; the install footprint for
      the missing packages, ``None`` when already baked)
    """

    model_config = ConfigDict(extra="forbid")

    supported_languages: list[str]
    fallback_languages: list[str]
    suggest_command: str | None = None
    install_size_mb_estimate: int | None = None


class GetEpubResponse(BaseModel):
    """D-06 + F1 ``GET /api/v1/epubs/{id}`` response shape.

    Powers the SPA's source-language prefill: the SPA fetches
    ``declared_languages`` from this endpoint to populate the translation
    config panel.
    """

    model_config = ConfigDict(extra="forbid")

    epub_id: str
    title: str | None = None
    author: str | None = None
    declared_languages: list[str] = []
    chapter_count: int = 0
    chapter_ids: list[str] = []


__all__ = [
    "_JOB_TYPE_DISCRIMINATOR",
    "CombinedJobBody",
    "EpubUploadResponse",
    "ErrorPayload",
    "ErrorResponse",
    "GetEpubResponse",
    "HealthNltkResponse",
    "JobCreateBody",
    "JobListResponse",
    "JobView",
    "TranslationFieldsMixin",
    "TranslationJobBody",
    "VoiceoverJobBody",
]
