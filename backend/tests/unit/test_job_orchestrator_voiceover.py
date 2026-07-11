"""JobOrchestrator dispatch tests (Task 3 TDD cycle + plan 01-03 / BACK-10).

Satisfies D-11 (orchestrator dispatches ``voiceover`` to the new
``VoiceOverWorkflowService`` — was 501 in Phase 2) + D-12 follow-up
(combined ``translation+voiceover`` now dispatches to
``CombinedWorkflowService.run`` — was 501 in Phase 3) + plan 01-03 /
BACK-10 (per-provider subworkflow dispatch — the orchestrator reads
``job["provider"]`` from the row and routes to the matching
per-provider subworkflow).

Quick 260709-bso: per-dispatch adapter construction. The
``_make_orchestrator`` helper exposes the per-dispatch construction
seam (sentinel adapter classes + a per-call instance capture dict)
so each test can assert the orchestrator constructed a fresh
adapter with the right ``base_url=`` + ``model=`` /
``voice=`` kwargs. The previous "shared singleton +
``adapter._model = model`` mutation" pattern (quick 260709-lifespan)
is replaced — the orchestrator now constructs per-dispatch adapter
instances from the constructor's classes + base URLs and closes
them in a ``finally`` block.

The test profile uses stub workflows injected via
``_StubTranslationWorkflow`` / ``_StubVoiceoverWorkflow`` /
``_StubCombinedWorkflow`` shims that mirror the
``TranslationWorkflowService`` / ``VoiceOverWorkflowService`` /
``CombinedWorkflowService`` constructors. No live workflow in the
test (the per-workflow unit tests cover the real workflow logic;
this file is the dispatch contract).
"""

from __future__ import annotations

import pathlib
import tempfile
from typing import Any, ClassVar
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from epubtv.application.job_orchestrator import JobOrchestrator

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-01-UT07")]


# ---------------------------------------------------------------------------
# Per-dispatch capture helpers
# ---------------------------------------------------------------------------


class _CapturingAdapter:
    """Sentinel adapter class that captures its constructor kwargs.

    The orchestrator instantiates a fresh adapter per dispatch;
    this sentinel records the kwargs the orchestrator used (so the
    test can assert the right ``base_url=`` + ``model=`` /
    ``voice=`` was passed). The ``aclose()`` method is a no-op
    (records the call for verification) so the orchestrator's
    ``finally`` block succeeds.
    """

    instances: ClassVar[list[_CapturingAdapter]] = []

    def __init__(self, *, base_url: str, model: str, voice: str = "alloy") -> None:
        self.base_url = base_url
        self.model = model
        self.voice = voice
        self.aclose_called = False
        type(self).instances.append(self)

    async def aclose(self) -> None:
        self.aclose_called = True


class _CapturingOllamaAdapter(_CapturingAdapter):
    """Sentinel OllamaHttpTranslationAdapter shape (no voice kwarg)."""

    instances: ClassVar[list[_CapturingOllamaAdapter]] = []

    def __init__(self, *, base_url: str, model: str) -> None:
        super().__init__(base_url=base_url, model=model)


class _CapturingOpenAITranslationAdapter(_CapturingAdapter):
    """Sentinel OpenAIHttpTranslationAdapter shape (no voice kwarg)."""

    instances: ClassVar[list[_CapturingOpenAITranslationAdapter]] = []

    def __init__(self, *, base_url: str, model: str) -> None:
        super().__init__(base_url=base_url, model=model)


class _CapturingOpenAITTSAdapter(_CapturingAdapter):
    """Sentinel OpenAIHttpTTSAdapter shape (takes ``voice=``)."""

    instances: ClassVar[list[_CapturingOpenAITTSAdapter]] = []

    def __init__(self, *, base_url: str, model: str, voice: str) -> None:
        super().__init__(base_url=base_url, model=model, voice=voice)


@pytest.fixture(autouse=True)
def _reset_capturing_adapters() -> None:
    """Reset the per-test capture lists so each test sees a clean slate."""
    _CapturingAdapter.instances = []
    _CapturingOllamaAdapter.instances = []
    _CapturingOpenAITranslationAdapter.instances = []
    _CapturingOpenAITTSAdapter.instances = []


_DEFAULT_JOB_ROW: dict[str, Any] = {
    "id": "j1",
    "epub_id": "e1",
    "job_type": "translation",
    "status": "queued",
    "source_language": "en",
    "target_language": "de",
    "voice": None,
    "chapter_ids": [],
    "last_chunk_id": None,
    "provider": "ollama",
    "model": "translategemma:12b",
}


def _make_orchestrator(
    *,
    job_row: dict[str, Any] | None = None,
) -> tuple[JobOrchestrator, dict[str, Any]]:
    """Build a ``JobOrchestrator`` wired to the per-dispatch capture helpers.

    Returns the orchestrator + a dict of the per-dispatch state
    (adapter class + base URL maps + default voice + the
    ``JobProgressBus`` mock + the ``EpubService`` + ``FileStore``
    mocks). Each dispatch records the per-dispatch adapter
    instances in the capture lists; the test asserts the right
    ``base_url=`` + ``model=`` / ``voice=`` kwargs were used.

    The default ``job_row`` is a complete job row (with the
    columns the workflow services read — ``source_language``,
    ``target_language``, ``epub_id``, ``voice``) so the per-dispatch
    workflow services can run without raising ``KeyError`` on
    the missing field. The row's ``provider`` + ``model`` are
    what the orchestrator reads to construct the per-dispatch
    adapter.
    """
    effective_row = dict(_DEFAULT_JOB_ROW)
    if job_row is not None:
        effective_row.update(job_row)
    job_repo = MagicMock()
    job_repo.get_job = AsyncMock(return_value=effective_row)
    # Workflow services call ``await self._job_repo.update_status(...)``
    # on dispatch; provide an AsyncMock so the await succeeds.
    job_repo.update_status = AsyncMock()
    job_repo.append_chunk = AsyncMock()
    job_repo.list_chunks = AsyncMock(return_value=[])
    job_repo.register_audio_file = AsyncMock()

    translation_adapter_classes = {
        "ollama": _CapturingOllamaAdapter,
        "openai-compatible": _CapturingOpenAITranslationAdapter,
    }
    translation_base_urls = {
        "ollama": "http://mock-ollama:11434/",
        "openai-compatible": "http://mock-llm:8765/v1/",
    }
    tts_adapter_class = _CapturingOpenAITTSAdapter
    tts_base_url = "http://mock-llm:8765/v1/"
    default_voice = "alloy"

    progress_bus = MagicMock()
    epub_service = MagicMock()
    # The per-dispatch workflow services call
    # ``await self._epub_service.chapters_for_epub(...)`` and then
    # either translate / synthesize per chunk or exit early. An
    # empty chapter list short-circuits the per-chunk loop so the
    # dispatch contract test only exercises the per-dispatch
    # adapter construction + close.
    epub_service.chapters_for_epub = AsyncMock(return_value=[])
    epub_service.get_metadata = AsyncMock(return_value={"title": "Translated", "author": None})
    file_store = MagicMock()
    audio_stitcher = MagicMock()
    # Use real tmp paths for ``audio_dir`` + ``artifact_dir`` so
    # the combined workflow's per-chapter WAV writes + artifact
    # ZIP pre-builds do not fail on a ``MagicMock`` ``/`` operator.
    audio_dir = pathlib.Path(tempfile.mkdtemp(prefix="epubtv_test_audio_"))
    artifact_dir = pathlib.Path(tempfile.mkdtemp(prefix="epubtv_test_artifact_"))

    orchestrator = JobOrchestrator(
        job_repo=job_repo,
        translation_adapter_classes=translation_adapter_classes,
        translation_base_urls=translation_base_urls,
        tts_adapter_class=tts_adapter_class,
        tts_base_url=tts_base_url,
        default_voice=default_voice,
        progress_bus=progress_bus,
        epub_service=epub_service,
        file_store=file_store,
        audio_stitcher=audio_stitcher,
        audio_dir=audio_dir,
        artifact_dir=artifact_dir,
    )
    return orchestrator, {
        "translation_adapter_classes": translation_adapter_classes,
        "translation_base_urls": translation_base_urls,
        "tts_adapter_class": tts_adapter_class,
        "tts_base_url": tts_base_url,
        "default_voice": default_voice,
    }


# ---------------------------------------------------------------------------
# Phase 1 plan 01-03 / BACK-10: per-provider subworkflow dispatch
# ---------------------------------------------------------------------------


async def test_dispatch_translation_ollama_runs_translation_workflow() -> None:
    """``("translation", "ollama")`` → ``TranslationWorkflowService.run``.

    BACK-10: the orchestrator reads the stored provider from the
    job row and dispatches to a per-dispatch ``TranslationWorkflowService``
    bound to a fresh ``OllamaHttpTranslationAdapter`` (TRAN-02). The
    per-dispatch adapter is constructed with the row's stored
    ``model=`` + the per-provider ``base_url=`` (no shared
    singleton; quick 260709-bso).
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": "ollama", "model": "translategemma:12b", "status": "running"}
    )

    await orchestrator.dispatch("j1", "translation")

    # The orchestrator constructed exactly one Ollama translation
    # adapter with the row's model + the Ollama base URL.
    assert len(_CapturingOllamaAdapter.instances) == 1, _CapturingOllamaAdapter.instances
    adapter = _CapturingOllamaAdapter.instances[0]
    assert adapter.base_url == "http://mock-ollama:11434/"
    assert adapter.model == "translategemma:12b"
    # The adapter was closed in the finally block.
    assert adapter.aclose_called is True
    # The OpenAI-compatible adapter was NOT constructed.
    assert _CapturingOpenAITranslationAdapter.instances == []
    # The TTS adapter was NOT constructed (translation job_type).
    assert _CapturingOpenAITTSAdapter.instances == []


async def test_dispatch_translation_openai_runs_translation_workflow() -> None:
    """``("translation", "openai-compatible")`` → ``TranslationWorkflowService.run``.

    BACK-10: the OpenAI-compatible per-dispatch adapter is bound
    to ``OpenAIHttpTranslationAdapter`` (TRAN-02). The per-dispatch
    construction uses the OpenAI-compatible base URL.
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": "openai-compatible", "model": "gpt-4o-mini", "status": "running"}
    )

    await orchestrator.dispatch("j2", "translation")

    assert len(_CapturingOpenAITranslationAdapter.instances) == 1
    adapter = _CapturingOpenAITranslationAdapter.instances[0]
    assert adapter.base_url == "http://mock-llm:8765/v1/"
    assert adapter.model == "gpt-4o-mini"
    assert adapter.aclose_called is True
    # The Ollama adapter was NOT constructed.
    assert _CapturingOllamaAdapter.instances == []


async def test_dispatch_voiceover_openai_runs_voiceover_workflow() -> None:
    """``("voiceover", "openai-compatible")`` → ``VoiceOverWorkflowService.run``.

    BACK-10: TTS is OpenAI-only per TTS-02; the voiceover subworkflow
    is bound to the per-dispatch ``OpenAIHttpTTSAdapter``. The
    voiceover dispatch table has a single valid branch
    (openai-compatible). The per-dispatch TTS adapter receives
    the row's stored ``model=`` + ``voice=`` (or the lifespan's
    ``default_voice`` if ``voice`` is None).
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={
            "provider": "openai-compatible",
            "model": "tts-1",
            "voice": "nova",
            "status": "running",
        }
    )

    await orchestrator.dispatch("j3", "voiceover")

    assert len(_CapturingOpenAITTSAdapter.instances) == 1
    adapter = _CapturingOpenAITTSAdapter.instances[0]
    assert adapter.base_url == "http://mock-llm:8765/v1/"
    assert adapter.model == "tts-1"
    assert adapter.voice == "nova"
    assert adapter.aclose_called is True
    # No translation adapter was constructed.
    assert _CapturingOllamaAdapter.instances == []
    assert _CapturingOpenAITranslationAdapter.instances == []


async def test_dispatch_voiceover_ollama_returns_422() -> None:
    """``("voiceover", "ollama")`` → 422 ``validation_error``.

    BACK-10: Ollama has no TTS endpoint per PRD §6. The orchestrator
    rejects the unsupported TTS provider with 422 (the worker's
    error envelope is logged but does not propagate to the HTTP
    response; the voiceover preflight gate in the jobs router is
    the user-facing 422 surface). No TTS adapter is constructed.
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": "ollama", "model": "x", "status": "running"}
    )

    with pytest.raises(HTTPException) as exc_info:
        await orchestrator.dispatch("j-vo-ollama", "voiceover")
    assert exc_info.value.status_code == 422
    # pyrefly: ignore [bad-index]
    assert exc_info.value.detail["code"] == "validation_error"
    assert "ollama" in str(exc_info.value.detail).lower()
    # No adapter was constructed (the orchestrator 422s before
    # the per-dispatch construction branch for ollama-voiceover).
    assert _CapturingOpenAITTSAdapter.instances == []


async def test_dispatch_unknown_provider_returns_422() -> None:
    """Unknown ``provider`` for the given ``job_type`` → 422 ``validation_error``.

    BACK-10: a corrupted row with an unknown provider is rejected
    at the orchestrator's 6-branch dispatch table. The per-dispatch
    construction raises the 422 because the provider key is
    missing from the ``translation_adapter_classes`` /
    ``translation_base_urls`` map.
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": "unknown-provider", "model": "x", "status": "running"}
    )

    with pytest.raises(HTTPException) as exc_info:
        await orchestrator.dispatch("j-bad-provider", "translation")
    assert exc_info.value.status_code == 422
    # pyrefly: ignore [bad-index]
    assert exc_info.value.detail["code"] == "validation_error"


async def test_dispatch_legacy_row_missing_provider_returns_422() -> None:
    """A v1.1-style row (provider=NULL) → 422 ``validation_error``.

    BACK-10: legacy rows (provider=NULL, model=NULL) are loadable
    but undispatchable. The migration (BACK-09) is additive; legacy
    rows are not retroactively migrated. The user must re-create
    the job. The orchestrator's legacy-row branch returns 422
    with the "re-create the job" hint.
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": None, "model": None, "status": "running"}
    )

    with pytest.raises(HTTPException) as exc_info:
        await orchestrator.dispatch("j-legacy", "translation")
    assert exc_info.value.status_code == 422
    # pyrefly: ignore [bad-index]
    assert exc_info.value.detail["code"] == "validation_error"
    assert "re-create" in str(exc_info.value.detail).lower()


# ---------------------------------------------------------------------------
# Voiceover branch (D-11 regression guard)
# ---------------------------------------------------------------------------


async def test_dispatch_voiceover_calls_voiceover_workflow() -> None:
    """``voiceover`` job_type → voiceover workflow is dispatched (D-11)."""
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": "openai-compatible", "model": "tts-1", "status": "running"}
    )

    await orchestrator.dispatch("j1", "voiceover")
    # The per-dispatch TTS adapter was constructed.
    assert len(_CapturingOpenAITTSAdapter.instances) == 1


# ---------------------------------------------------------------------------
# Combined workflow dispatch (D-12 follow-up)
# ---------------------------------------------------------------------------


async def test_dispatch_translation_plus_voiceover_runs_combined_workflow_ollama() -> None:
    """``("translation+voiceover", "ollama")`` → ``CombinedWorkflowService.run``.

    Phase 4 / plan 04-02 + plan 01-03: combined jobs are dispatched
    to the combined workflow; the combined workflow reads the
    stored provider internally and dispatches to its per-provider
    leg. The per-dispatch construction creates a fresh
    translation adapter (Ollama for an Ollama combined job) and a
    fresh TTS adapter (OpenAI TTS only) — both are closed in the
    finally block.
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={
            "provider": "ollama",
            "model": "translategemma:12b",
            "status": "running",
        }
    )

    await orchestrator.dispatch("j-combined-ollama", "translation+voiceover")
    # The per-dispatch Ollama translation adapter was constructed.
    assert len(_CapturingOllamaAdapter.instances) == 1
    assert _CapturingOllamaAdapter.instances[0].model == "translategemma:12b"
    # The per-dispatch TTS adapter was also constructed (combined
    # workflow always runs the OpenAI TTS leg).
    assert len(_CapturingOpenAITTSAdapter.instances) == 1
    # Both adapters were closed in the finally block.
    assert _CapturingOllamaAdapter.instances[0].aclose_called is True
    assert _CapturingOpenAITTSAdapter.instances[0].aclose_called is True


async def test_dispatch_translation_plus_voiceover_runs_combined_workflow_openai() -> None:
    """``("translation+voiceover", "openai-compatible")`` → ``CombinedWorkflowService.run``."""
    orchestrator, _stubs = _make_orchestrator(
        job_row={
            "provider": "openai-compatible",
            "model": "gpt-4o-mini",
            "status": "running",
        }
    )

    await orchestrator.dispatch("j-combined-openai", "translation+voiceover")
    # The per-dispatch OpenAI translation adapter was constructed.
    assert len(_CapturingOpenAITranslationAdapter.instances) == 1
    assert _CapturingOpenAITranslationAdapter.instances[0].model == "gpt-4o-mini"
    # The per-dispatch TTS adapter was also constructed.
    assert len(_CapturingOpenAITTSAdapter.instances) == 1


# ---------------------------------------------------------------------------
# Regression: unknown job_type
# ---------------------------------------------------------------------------


async def test_dispatch_unknown_job_type_raises_422() -> None:
    """Unknown ``job_type`` → 422 ``validation_error`` (defensive guard)."""
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": "ollama", "model": "x", "status": "running"}
    )

    with pytest.raises(HTTPException) as exc_info:
        await orchestrator.dispatch("j-bad", "narration")
    assert exc_info.value.status_code == 422
    # pyrefly: ignore [bad-index]
    assert exc_info.value.detail["code"] == "validation_error"


# ---------------------------------------------------------------------------
# BACK-10 + quick 260709-bso: per-dispatch adapter construction
# ---------------------------------------------------------------------------


async def test_dispatch_translation_constructs_per_dispatch_adapter_with_model() -> None:
    """``dispatch`` constructs a fresh translation adapter with the row's model.

    The lifespan wires the per-provider adapter classes + base
    URLs (stable per-process); the orchestrator instantiates a
    fresh adapter with the row's stored model so the per-chunk
    adapter call uses the model the user picked (BACK-10). The
    new ``base_url=`` is read from the orchestrator's
    ``translation_base_urls[provider]`` map; the per-dispatch
    adapter is closed in the finally block (quick 260709-bso).
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={"provider": "ollama", "model": "custom-translate:7b", "status": "running"}
    )

    await orchestrator.dispatch("j-trans-1", "translation")

    # Exactly one Ollama adapter was constructed.
    assert len(_CapturingOllamaAdapter.instances) == 1
    adapter = _CapturingOllamaAdapter.instances[0]
    assert adapter.model == "custom-translate:7b"
    assert adapter.base_url == "http://mock-ollama:11434/"
    # The OpenAI-compatible adapter was NOT constructed (we
    # dispatched to the Ollama leg only).
    assert _CapturingOpenAITranslationAdapter.instances == []
    # The adapter was closed in the finally block.
    assert adapter.aclose_called is True


async def test_dispatch_voiceover_constructs_per_dispatch_tts_adapter_with_voice() -> None:
    """``dispatch`` constructs a fresh TTS adapter with the row's model + voice.

    The per-dispatch TTS adapter receives the row's stored
    ``model=`` + ``voice=``. The voice is read from
    ``job["voice"]`` (D-06). The per-dispatch TTS adapter is
    closed in the finally block (quick 260709-bso).
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={
            "provider": "openai-compatible",
            "model": "tts-1-hd",
            "voice": "nova",
            "status": "running",
        }
    )

    await orchestrator.dispatch("j-vo-1", "voiceover")

    assert len(_CapturingOpenAITTSAdapter.instances) == 1
    adapter = _CapturingOpenAITTSAdapter.instances[0]
    assert adapter.model == "tts-1-hd"
    assert adapter.voice == "nova"
    assert adapter.base_url == "http://mock-llm:8765/v1/"
    # The TTS adapter was closed in the finally block.
    assert adapter.aclose_called is True


async def test_dispatch_combined_constructs_per_dispatch_translation_and_tts_adapters() -> None:
    """``dispatch`` (combined) constructs a fresh translation + TTS adapter per dispatch.

    The combined workflow runs both legs (translation + voiceover);
    the orchestrator constructs a fresh translation adapter
    (bound to the per-provider adapter class) AND a fresh TTS
    adapter (OpenAI TTS only). Both are closed in the finally
    block.
    """
    orchestrator, _stubs = _make_orchestrator(
        job_row={
            "provider": "openai-compatible",
            "model": "gpt-4o",
            "voice": "echo",
            "status": "running",
        }
    )

    await orchestrator.dispatch("j-combined-1", "translation+voiceover")

    assert len(_CapturingOpenAITranslationAdapter.instances) == 1
    tx_adapter = _CapturingOpenAITranslationAdapter.instances[0]
    assert tx_adapter.model == "gpt-4o"
    assert tx_adapter.base_url == "http://mock-llm:8765/v1/"
    assert tx_adapter.aclose_called is True
    assert len(_CapturingOpenAITTSAdapter.instances) == 1
    tts_adapter = _CapturingOpenAITTSAdapter.instances[0]
    assert tts_adapter.model == "gpt-4o"
    assert tts_adapter.voice == "echo"
    assert tts_adapter.aclose_called is True
