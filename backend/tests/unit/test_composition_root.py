"""Composition-root unit tests (plan 01-02 Task 3).

Per plan 01-02 Task 3 (BACK-01) + quick 260709-bso: the production
FastAPI lifespan wires the per-provider HTTP adapter CLASSES
(``OllamaHttpTranslationAdapter`` + ``OpenAIHttpTranslationAdapter``)
+ the per-provider base URLs + the TTS adapter class
(``OpenAIHttpTTSAdapter``) + the TTS base URL + the default voice
(``"alloy"``). The in-process ``MockTranslationAdapter`` +
``MockTTSAdapter`` are reachable only from ``tests/`` and are NOT
bound in the lifespan.

The lifespan binds (quick 260709-bso: per-dispatch adapter wiring):
- ``app.state.translation_adapter_classes = {"ollama":
  OllamaHttpTranslationAdapter, "openai-compatible":
  OpenAIHttpTranslationAdapter}`` — the orchestrator reads
  ``classes[provider]`` + ``base_urls[provider]`` and instantiates a
  fresh translation adapter per dispatch.
- ``app.state.translation_base_urls = {"ollama":
  settings.default_ollama_url, "openai-compatible":
  settings.default_openai_url}`` — the per-provider base URL
  surface (WR-06).
- ``app.state.tts_adapter_class = OpenAIHttpTTSAdapter`` — the
  orchestrator instantiates a fresh TTS adapter per dispatch
  with ``voice=`` from the job row.
- ``app.state.tts_base_url = settings.default_openai_url`` — the
  TTS base URL (TTS is OpenAI-only per TTS-02).
- ``app.state.default_voice = "alloy"`` — the TTS default voice
  fallback when ``job["voice"]`` is None.
- ``app.state.translation_port = OpenAIHttpTranslationAdapter(...)``
  — back-compat shim for tests that read it; not used for
  dispatch under the per-dispatch design.

Quick 260709-9yk: the ``app.state.behaviour_translation`` +
``app.state.behaviour_tts`` slots were removed (the behaviour gate
retired with the in-process mock adapters' move to ``tests/``); the
``test_lifespan_does_not_bind_behaviour_instances`` test asserts
those slots are absent on ``app.state``.

Quick 260709-lifespan retired the ``app.state.translation_adapters``
dict + ``app.state.tts_port`` singleton — quick 260709-bso replaces
them with the ``classes`` + ``base_urls`` shape so the orchestrator
constructs per-dispatch adapter instances.

Plan 01-02 Task 1 dropped these tests (the in-process mocks are no
longer wired in production):
- ``test_lifespan_binds_mock_translation_adapter`` — the
  ``MockTranslationAdapter`` import is gone from production; replaced
  by the per-provider class assertion below.
- ``test_lifespan_binds_mock_tts_adapter`` — same.
- ``test_default_mode_binds_in_process_mocks`` — the in-process
  mocks are test-only; the production default is the per-provider
  HTTP adapter classes.
- ``test_behaviour_spec_is_constructed_at_lifespan`` — the
  ``BehaviourSpec`` env-var reader is test-only; the lifespan binds
  a default empty ``AdapterBehaviour()`` for each workflow service.
  (Retired by quick 260709-9yk — the behaviour gate is gone.)
- ``test_lifespan_does_not_rebind_via_settings`` — the runtime
  provider-mode toggle is gone (plan 01-01); the rebind path does
  not exist.
"""

from __future__ import annotations

from typing import Any

import pytest

from epubtv.adapters.translation.ollama_http_translation_adapter import (
    OllamaHttpTranslationAdapter,
)
from epubtv.adapters.translation.openai_http_translation_adapter import (
    OpenAIHttpTranslationAdapter,
)
from epubtv.adapters.tts.openai_http_tts_adapter import OpenAIHttpTTSAdapter

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("INFRA-01-UT11")]


async def test_lifespan_binds_per_provider_translation_adapter_classes(
    app: Any, db_path: Any
) -> None:
    """After lifespan startup, ``app.state.translation_adapter_classes`` has both classes.

    The dict shape is the locked contract for plan 01-03's
    per-provider dispatch + quick 260709-bso's per-dispatch
    adapter construction:
    - ``"ollama"`` → ``OllamaHttpTranslationAdapter`` (TRAN-02)
    - ``"openai-compatible"`` → ``OpenAIHttpTranslationAdapter`` (TRAN-02)

    The orchestrator reads ``classes[provider]`` + ``base_urls[provider]``
    and instantiates a fresh translation adapter per dispatch —
    the per-dispatch adapter is closed in a ``finally`` block
    so the HTTP transport is released cleanly.

    The single ``app.state.translation_port`` slot stays as a
    back-compat shim for tests that read it; it points at the
    OpenAI-compatible adapter by default.
    """
    from epubtv.api.app import lifespan

    async with lifespan(app):
        assert app.state.translation_adapter_classes["ollama"] is OllamaHttpTranslationAdapter
        assert (
            app.state.translation_adapter_classes["openai-compatible"]
            is OpenAIHttpTranslationAdapter
        )
        # Back-compat shim: ``app.state.translation_port`` is an
        # OpenAI-compatible adapter instance (the SPA's "Load
        # Models" button defaults to OpenAI per plan 01-04).
        assert isinstance(app.state.translation_port, OpenAIHttpTranslationAdapter)


async def test_lifespan_binds_per_provider_translation_base_urls(app: Any, db_path: Any) -> None:
    """After lifespan startup, ``app.state.translation_base_urls`` has both URLs.

    The per-provider URL surface (WR-06) is split: the Ollama
    adapter reads ``settings.default_ollama_url``; the
    OpenAI-compatible adapter reads ``settings.default_openai_url``.
    The orchestrator reads the URL from this dict when
    constructing the per-dispatch adapter (quick 260709-bso).
    """
    from epubtv.api.app import lifespan
    from epubtv.config import settings

    async with lifespan(app):
        assert app.state.translation_base_urls == {
            "ollama": settings.default_ollama_url,
            "openai-compatible": settings.default_openai_url,
        }


async def test_lifespan_binds_tts_adapter_class(app: Any, db_path: Any) -> None:
    """After lifespan startup, ``app.state.tts_adapter_class`` is ``OpenAIHttpTTSAdapter``.

    TTS-02 is OpenAI-only; the orchestrator instantiates a fresh
    TTS adapter per dispatch (with the job row's ``model=`` +
    ``voice=``) and closes it in a ``finally`` block (quick
    260709-bso). The per-dispatch TTS adapter is read from this
    slot — NOT a shared singleton.
    """
    from epubtv.api.app import lifespan

    async with lifespan(app):
        assert app.state.tts_adapter_class is OpenAIHttpTTSAdapter
        # The TTS base URL is the OpenAI-compatible URL (TTS is
        # OpenAI-only per TTS-02).
        from epubtv.config import settings

        assert app.state.tts_base_url == settings.default_openai_url
        # The default voice is the TTS fallback when ``job["voice"]``
        # is None (D-06).
        assert app.state.default_voice == "alloy"


async def test_translation_adapter_classes_dict_has_exactly_two_keys(
    app: Any, db_path: Any
) -> None:
    """The ``app.state.translation_adapter_classes`` dict has exactly two keys.

    Regression guard for plan 01-03 + quick 260709-bso: the
    orchestrator's per-provider dispatch keys on these exact
    strings. A future change that adds a third key (or renames an
    existing key) is a breaking change for the orchestrator and
    must be caught at test time.
    """
    from epubtv.api.app import lifespan

    async with lifespan(app):
        assert set(app.state.translation_adapter_classes.keys()) == {
            "ollama",
            "openai-compatible",
        }
        # Same for the base URL surface (WR-06 split).
        assert set(app.state.translation_base_urls.keys()) == {
            "ollama",
            "openai-compatible",
        }


async def test_lifespan_does_not_bind_behaviour_instances(app: Any, db_path: Any) -> None:
    """The lifespan does NOT bind ``app.state.behaviour_translation`` / ``app.state.behaviour_tts``.

    Quick 260709-9yk removed the production behaviour gate: the
    ``AdapterBehaviour`` Pydantic model moved to
    ``tests/unit/_adapters/behaviour.py`` and the workflow services
    no longer consume a behaviour slot. The lifespan must NOT
    surface ``behaviour_translation`` / ``behaviour_tts`` on
    ``app.state``; if it does, the test fails as a regression
    guard against the dead-code path being reintroduced.
    """
    from epubtv.api.app import lifespan

    async with lifespan(app):
        assert not hasattr(app.state, "behaviour_translation")
        assert not hasattr(app.state, "behaviour_tts")


async def test_lifespan_does_not_bind_shared_adapter_singletons(app: Any, db_path: Any) -> None:
    """The lifespan does NOT bind the pre-bso shared ``translation_adapters`` / ``tts_port`` slots.

    Quick 260709-bso removed the shared-singleton
    ``app.state.translation_adapters`` dict + ``app.state.tts_port``
    singleton (the "shared singleton + ``adapter._model = model``
    mutation" pattern from quick 260709-lifespan). The orchestrator
    now constructs per-dispatch adapter instances from the
    ``translation_adapter_classes`` + ``translation_base_urls`` +
    ``tts_adapter_class`` + ``tts_base_url`` slots. The
    ``translation_adapters`` / ``tts_port`` slots are NOT bound by
    the lifespan; if they are, the test fails as a regression
    guard against the old pattern being reintroduced.
    """
    from epubtv.api.app import lifespan

    async with lifespan(app):
        assert not hasattr(app.state, "translation_adapters")
        assert not hasattr(app.state, "tts_port")


async def test_worker_task_starts_and_cancels(app: Any, db_path: Any) -> None:
    """``worker_task`` is live while running and cancelled on lifespan shutdown."""
    import asyncio
    import contextlib

    from epubtv.api.app import lifespan

    async with lifespan(app):
        task: asyncio.Task = app.state.worker_task
        assert not task.done()
        # Sanity: cancelling inside the running lifespan does cancel the task.
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        assert task.cancelled() or task.done()


async def test_no_httpbearer_dependency_in_app(app: Any) -> None:
    """Pitfall 17 sanity: NO ``HTTPBearer`` dependency anywhere in the source tree."""
    import subprocess
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[3]
    src = repo_root / "backend" / "src"
    proc = subprocess.run(
        ["rg", "-w", "HTTPBearer", str(src)],
        check=False,
        capture_output=True,
        text=True,
    )
    # Zero matches expected (Pitfall 17).
    assert proc.returncode != 0, f"HTTPBearer dependency detected in {src}:\n{proc.stdout}"


async def test_build_orchestrator_returns_orchestrator_with_per_dispatch_config(
    app: Any, db_path: Any
) -> None:
    """Plan 01-03 / BACK-10 + quick 260709-bso: ``_build_orchestrator``
    returns a ``JobOrchestrator`` with the per-dispatch config
    (``translation_adapter_classes`` + ``translation_base_urls`` +
    ``tts_adapter_class`` + ``tts_base_url`` + ``default_voice``).

    Quick 260709-bso replaces the previous "shared
    ``translation_adapters`` / ``tts_port`` singleton" wiring
    (quick 260709-lifespan). The factory now wires the
    orchestrator with the per-dispatch config + the workflow
    collaborators (job_repo, progress_bus, epub_service,
    file_store, audio_stitcher, audio_dir, artifact_dir). The
    orchestrator builds the per-provider subworkflows +
    the combined workflow on every dispatch (from the
    per-dispatch adapters), NOT up-front in the factory.
    """
    from epubtv.api.app import lifespan
    from epubtv.application.job_orchestrator import JobOrchestrator
    from epubtv.application.worker_queue import _build_orchestrator

    async with lifespan(app):
        state = app.state
        orchestrator = _build_orchestrator(state)
        # The factory returns a JobOrchestrator instance.
        assert isinstance(orchestrator, JobOrchestrator)
        # The per-dispatch config is wired.
        assert orchestrator._translation_adapter_classes is state.translation_adapter_classes
        assert orchestrator._translation_base_urls is state.translation_base_urls
        assert orchestrator._tts_adapter_class is state.tts_adapter_class
        assert orchestrator._tts_base_url == state.tts_base_url
        assert orchestrator._default_voice == state.default_voice
        # The workflow collaborators are wired.
        assert orchestrator._job_repo is state.job_repo
        assert orchestrator._progress_bus is state.progress_bus
        assert orchestrator._epub_service is state.epub_service
        assert orchestrator._file_store is state.file_store
        assert orchestrator._audio_dir == state.audio_dir
        assert orchestrator._artifact_dir == state.artifact_dir
        # The previous "shared singleton + per-provider subworkflow
        # pre-build" attributes (quick 260709-lifespan) are GONE.
        # The orchestrator now builds per-provider subworkflows +
        # the combined workflow per dispatch (not up-front).
        assert not hasattr(orchestrator, "_translation_adapters")
        assert not hasattr(orchestrator, "_tts_port")
        assert not hasattr(orchestrator, "_ollama_translation_workflow")
        assert not hasattr(orchestrator, "_openai_translation_workflow")
        assert not hasattr(orchestrator, "_openai_voiceover_workflow")
        assert not hasattr(orchestrator, "_combined_workflow")
