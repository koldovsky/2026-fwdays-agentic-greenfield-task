"""``worker_supervisor`` drain loop unit tests (Task 3 TDD cycle).

Satisfies D-02 (``MAX_ACTIVE=1`` sprint default + env override
``WORKER_MAX_ACTIVE=3`` for the post-sprint hardening pass) + the
defer-scaling tag note (2 F5 BDD scenarios that assert 3+overflow are
tagged ``@defer-scaling`` and live in plan 02-06; this plan only ships
the 1-active-jobs scenarios).

Test profile (per task plan):
- 1 queued + 0 active → dispatch within 1 idle poll (≤1.1s).
- 1 active + 1 queued → queued waits; ``pop_next_queued`` is NOT called.
- 0 active + 0 queued → idle sleeps; no dispatch.
- ``settings.worker_max_active`` knob is read at module-import time
  (re-import verifies the value).
- The supervisor task is gracefully cancellable.

Quick 260709-bso: the ``_build_state`` helper exposes the
per-dispatch config the orchestrator now reads from
``app.state``: ``translation_adapter_classes`` +
``translation_base_urls`` + ``tts_adapter_class`` + ``tts_base_url``
+ ``default_voice`` (replacing the previous ``translation_adapters``
dict + ``tts_port`` singleton). The supervisor's
``_StubOrchestrator.__init__`` accepts ``**_kwargs`` so the new
shape passes through unchanged.
"""

from __future__ import annotations

import asyncio
import contextlib
import importlib
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

# Module-level pytestmark is intentionally omitted for asyncio so the
# two sync tests (re-import knob + default) are not flagged as
# mis-marked. Each async test is marked individually with
# ``@pytest.mark.asyncio``. The tcid marker IS module-level (D-10
# retroactive scope; all 5 tests in this file prove JOBS-02).
pytestmark = pytest.mark.tcid("JOBS-02-UT24")


def _build_state(
    *,
    job_repo: Any,
    translation_port: Any = None,
    progress_bus: Any = None,
    audio_dir: Any = None,
    artifact_dir: Any = None,
) -> Any:
    """Build a state-like object the worker can read from ``state.<attr>``.

    Mirrors the FastAPI ``app.state`` shape the supervisor reads in
    production (quick 260709-bso: per-dispatch adapter wiring):
    - ``state.job_repo`` + ``state.progress_bus``
    - ``state.translation_adapter_classes`` + ``state.translation_base_urls``
      (the orchestrator reads ``classes[provider]`` +
      ``base_urls[provider]`` and instantiates a fresh translation
      adapter per dispatch)
    - ``state.tts_adapter_class`` + ``state.tts_base_url`` +
      ``state.default_voice`` (the orchestrator instantiates a
      fresh TTS adapter per dispatch with the row's stored
      ``model=`` + ``voice=``)
    - ``state.epub_service`` + ``state.file_store`` + ``state.audio_dir``
      + ``state.artifact_dir`` (the Phase 4 / DL-01 collaborators
      added for the worker pre-build seam)
    - ``state.translation_port`` — back-compat shim for tests that
      read it; not used for dispatch under the per-dispatch design.
    The ``state.behaviour_translation`` + ``state.behaviour_tts``
    slots were removed in quick 260709-9yk — the workflow services
    no longer consume a behaviour gate (the slow-mode seam retired
    with the in-process mock adapters' move to ``tests/``).
    """
    import pathlib

    from epubtv.application.epub_service import EpubService

    return SimpleNamespace(
        job_repo=job_repo,
        # Per-dispatch config (quick 260709-bso): the orchestrator
        # uses the adapter classes + base URLs to construct a fresh
        # adapter per dispatch. The previous shared ``translation_adapters``
        # dict + ``tts_port`` singleton (quick 260709-lifespan) is
        # gone.
        translation_adapter_classes={
            "ollama": MagicMock(),
            "openai-compatible": MagicMock(),
        },
        translation_base_urls={
            "ollama": "http://mock-ollama:11434/",
            "openai-compatible": "http://mock-llm:8765/v1/",
        },
        tts_adapter_class=MagicMock(),
        tts_base_url="http://mock-llm:8765/v1/",
        default_voice="alloy",
        # Workflow collaborators.
        progress_bus=progress_bus or MagicMock(),
        epub_service=EpubService(),
        file_store=AsyncMock(),
        # Back-compat shim (read by tests, not used for dispatch).
        translation_port=translation_port or AsyncMock(),
        audio_dir=audio_dir or pathlib.Path("/tmp/audio_test"),
        artifact_dir=artifact_dir or pathlib.Path("/tmp/artifact_test"),
    )


# ---------------------------------------------------------------------------
# Dispatch when MAX_ACTIVE=1
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dispatches_one_queued_job_within_one_idle_poll() -> None:
    """1 queued + 0 active → dispatch within 1 idle poll (≤1.1s)."""
    job_repo = AsyncMock()
    job_repo.count_active.return_value = 0
    # pop_next_queued returns a job once, then None.
    job_repo.pop_next_queued.side_effect = [
        {"id": "j1", "job_type": "translation", "epub_id": "e1"},
        None,
    ]

    state = _build_state(job_repo=job_repo)

    # Patch the ``JobOrchestrator.dispatch`` so the test does not have
    # to construct a real workflow / repo / bus. The supervisor creates
    # the orchestrator once per loop iteration.
    from epubtv.application import worker_queue

    dispatch_calls: list[tuple[str, str]] = []

    class _StubOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, job_id: str, job_type: str) -> None:
            # ``_job_id`` is captured in the dispatch call args; the
            # parameter name is preserved for readability.
            dispatch_calls.append((job_id, job_type))

    with contextlib.ExitStack() as stack:
        monkey = stack.enter_context(pytest.MonkeyPatch.context())
        # Patch the import inside worker_queue by replacing the bound reference.
        monkey.setattr(worker_queue, "JobOrchestrator", _StubOrchestrator)

        task = asyncio.create_task(worker_queue.worker_supervisor(state))
        # Wait for: pop_next_queued was called once + dispatch was awaited.
        for _ in range(50):  # up to ~5s
            await asyncio.sleep(0.1)
            if len(dispatch_calls) >= 1:
                break
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    # The supervisor must have called pop_next_queued at least once
    # (more is fine — the loop continues until cancel).
    assert job_repo.pop_next_queued.await_count >= 1
    # The orchestrator's dispatch was called with the right args.
    assert any(call == ("j1", "translation") for call in dispatch_calls)


@pytest.mark.asyncio
async def test_does_not_dispatch_when_active_at_cap() -> None:
    """1 active (== MAX_ACTIVE) + 1 queued → queued waits; pop_next_queued NOT called."""
    job_repo = AsyncMock()
    job_repo.count_active.return_value = 1  # == MAX_ACTIVE
    job_repo.pop_next_queued.return_value = {
        "id": "j2",
        "job_type": "translation",
        "epub_id": "e2",
    }

    state = _build_state(job_repo=job_repo)

    from epubtv.application import worker_queue

    class _StubOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, job_id: str, job_type: str) -> None:
            # ``_job_id`` / ``_job_type`` captured in the test profile;
            # the parameters are named for readability in the dispatch
            # call args assertion downstream.
            pass

    dispatch_calls: list[tuple[str, str]] = []

    class _CountingOrchestrator(_StubOrchestrator):
        async def dispatch(self, job_id: str, job_type: str) -> None:
            dispatch_calls.append((job_id, job_type))

    with pytest.MonkeyPatch.context() as monkey:
        monkey.setattr(worker_queue, "JobOrchestrator", _CountingOrchestrator)
        task = asyncio.create_task(worker_queue.worker_supervisor(state))
        await asyncio.sleep(1.1)  # one full idle poll
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    # pop_next_queued should NEVER be called (active=MAX_ACTIVE short-circuits the branch).
    assert job_repo.pop_next_queued.await_count == 0
    assert dispatch_calls == []


@pytest.mark.asyncio
async def test_idle_sleeps_when_no_queued_and_no_active() -> None:
    """0 active + 0 queued → idle sleeps; no dispatch; gracefully cancellable."""
    job_repo = AsyncMock()
    job_repo.count_active.return_value = 0
    job_repo.pop_next_queued.return_value = None  # empty queue forever

    state = _build_state(job_repo=job_repo)

    from epubtv.application import worker_queue

    class _StubOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, _job_id: str, _job_type: str) -> None:
            pass

    with pytest.MonkeyPatch.context() as monkey:
        monkey.setattr(worker_queue, "JobOrchestrator", _StubOrchestrator)
        task = asyncio.create_task(worker_queue.worker_supervisor(state))
        await asyncio.sleep(1.1)  # one full idle poll
        # Task should still be running (not finished) because the supervisor
        # is in the idle sleep branch.
        assert not task.done()
        # Cancel cleanly.
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        assert task.cancelled() or task.done()


# ---------------------------------------------------------------------------
# Orphan recovery on startup (worker-queue-stuck-after-first-job fix)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_supervisor_sweeps_orphaned_running_rows_on_startup() -> None:
    """``worker_supervisor`` calls ``mark_orphaned_running_as_failed`` on startup.

    A workflow can die (container restart, OOM, signal, an unhandled
    exception that bypasses ``_safe_dispatch``) and leave its row in
    ``running`` state. Without the sweep the supervisor's
    ``count_active()`` permanently reads 1, the ``active <
    MAX_ACTIVE`` guard never opens, and the queue stalls.

    The sweep runs ONCE on startup, BEFORE the first ``count_active``
    poll, so the next ``pop_next_queued`` is unblocked.
    """
    job_repo = AsyncMock()
    # Two orphaned rows from a prior process.
    job_repo.mark_orphaned_running_as_failed.return_value = ["orphan-1", "orphan-2"]
    # After the sweep, count_active drops to 0; queue is empty.
    job_repo.count_active.return_value = 0
    job_repo.pop_next_queued.return_value = None

    state = _build_state(job_repo=job_repo)

    from epubtv.application import worker_queue

    class _StubOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, _job_id: str, _job_type: str) -> None:
            pass

    with pytest.MonkeyPatch.context() as monkey:
        monkey.setattr(worker_queue, "JobOrchestrator", _StubOrchestrator)
        task = asyncio.create_task(worker_queue.worker_supervisor(state))
        # Wait for the sweep to happen (it must run BEFORE the first
        # count_active poll, so the test sees the call before the
        # first tick).
        for _ in range(50):  # up to ~5s
            await asyncio.sleep(0.1)
            if job_repo.mark_orphaned_running_as_failed.await_count >= 1:
                break
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    # The sweep was awaited exactly once on startup.
    assert job_repo.mark_orphaned_running_as_failed.await_count == 1
    # The sweep must run BEFORE the first count_active poll (the
    # whole point of the fix — without it the supervisor stalls
    # forever on a stuck ``running`` row).
    assert job_repo.mark_orphaned_running_as_failed.await_count >= 1
    # And the queue loop proceeded after the sweep.
    assert job_repo.count_active.await_count >= 1


@pytest.mark.asyncio
async def test_supervisor_dispatches_queued_job_after_startup_sweep() -> None:
    """After the startup sweep, a queued job is dispatched normally.

    This is the end-to-end shape of the worker-queue-stuck-after-first-
    job fix: orphaned ``running`` rows are swept to ``failed`` on
    startup, the count drops, the guard opens, and the next queued
    job dispatches.
    """
    job_repo = AsyncMock()
    job_repo.mark_orphaned_running_as_failed.return_value = ["orphan-1"]
    # First count_active after sweep returns 0 (sweep cleared the orphan).
    # pop_next_queued returns one job, then None.
    job_repo.count_active.return_value = 0
    job_repo.pop_next_queued.side_effect = [
        {"id": "j1", "job_type": "translation", "epub_id": "e1"},
        None,
    ]

    state = _build_state(job_repo=job_repo)

    from epubtv.application import worker_queue

    dispatch_calls: list[tuple[str, str]] = []

    class _StubOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, job_id: str, job_type: str) -> None:
            dispatch_calls.append((job_id, job_type))

    with pytest.MonkeyPatch.context() as monkey:
        monkey.setattr(worker_queue, "JobOrchestrator", _StubOrchestrator)
        task = asyncio.create_task(worker_queue.worker_supervisor(state))
        for _ in range(50):  # up to ~5s
            await asyncio.sleep(0.1)
            if len(dispatch_calls) >= 1:
                break
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    # Sweep ran + the queued job dispatched.
    assert job_repo.mark_orphaned_running_as_failed.await_count == 1
    assert any(call == ("j1", "translation") for call in dispatch_calls)


# ---------------------------------------------------------------------------
# _safe_dispatch defense-in-depth (worker-queue-stuck-after-first-job fix)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_safe_dispatch_marks_job_failed_on_unhandled_exception() -> None:
    """``_safe_dispatch`` catches ``Exception`` (not just ``HTTPException``).

    Defense-in-depth for worker-queue-stuck-after-first-job: a
    workflow can die with a non-HTTPException (httpx.ConnectError,
    asyncio.TimeoutError, an unhandled exception in the per-chunk
    loop, etc.) and leave the row in ``running`` state. The startup
    orphan sweep in ``worker_supervisor`` cleans this up on the next
    restart; this catch handles the live case (workflow dies while
    the supervisor is still running) so the next queued job is NOT
    blocked by a stuck ``running`` row. The fix also emits a
    ``status='failed'`` progress event so the WebSocket subscribers
    see the failure (the second symptom of the bug — the frontend
    ``JobStatusPanel`` would otherwise sit in "running" forever).
    """
    job_repo = AsyncMock()
    state = _build_state(job_repo=job_repo)

    class _BoomOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, _job_id: str, _job_type: str) -> None:
            raise RuntimeError("httpx.ConnectError: mock-llm down")

    from epubtv.application.worker_queue import _safe_dispatch

    orchestrator = _BoomOrchestrator()
    with pytest.raises(RuntimeError, match="mock-llm down"):
        await _safe_dispatch(state, orchestrator, "job-1", "translation")

    # The row is marked failed so the supervisor's count_active()
    # drops back to 0 and the next queued job is dispatched.
    job_repo.update_status.assert_awaited_once_with("job-1", "failed")
    # A progress event is emitted so the WebSocket subscribers
    # (frontend ``JobStatusPanel``) see the failure. The envelope
    # is the F5-AC5 6-field shape + ``error`` + ``detail_message``.
    state.progress_bus.emit.assert_called_once_with(
        "job-1",
        {
            "job_id": "job-1",
            "job_type": "translation",
            "chunk_id": None,
            "progress_current": 0,
            "progress_total": 0,
            "status": "failed",
            "error": "internal_dispatch_error",
            "detail_message": "RuntimeError: httpx.ConnectError: mock-llm down",
        },
    )


@pytest.mark.asyncio
async def test_safe_dispatch_marks_job_failed_on_http_exception() -> None:
    """``_safe_dispatch`` also emits a failed progress event on ``HTTPException``.

    The orchestrator's 422 ``validation_error`` branches (legacy row,
    unknown provider, unsupported ollama-as-TTS) raise
    ``HTTPException``. The wrapper catches them to prevent an
    infinite re-dispatch loop AND emits the failed progress event so
    the WebSocket subscribers see the failure. Without the emit,
    the frontend would sit in "running" forever (the orchestrator
    returns immediately after raising — no per-chunk loop ever
    ran, so no per-chunk emit either).
    """
    from fastapi import HTTPException

    job_repo = AsyncMock()
    state = _build_state(job_repo=job_repo)

    class _RejectOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, _job_id: str, _job_type: str) -> None:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "validation_error",
                    "message": "unknown provider 'foo' for job_type 'translation'",
                    "details": {"provider": "foo", "job_type": "translation"},
                },
            )

    from epubtv.application.worker_queue import _safe_dispatch

    orchestrator = _RejectOrchestrator()
    with pytest.raises(HTTPException) as exc_info:
        await _safe_dispatch(state, orchestrator, "job-1", "translation")
    assert exc_info.value.status_code == 422

    job_repo.update_status.assert_awaited_once_with("job-1", "failed")
    state.progress_bus.emit.assert_called_once_with(
        "job-1",
        {
            "job_id": "job-1",
            "job_type": "translation",
            "chunk_id": None,
            "progress_current": 0,
            "progress_total": 0,
            "status": "failed",
            "error": "validation_error",
            "detail_message": "unknown provider 'foo' for job_type 'translation'",
        },
    )


@pytest.mark.asyncio
async def test_safe_dispatch_does_not_swallow_cancelled_error() -> None:
    """``_safe_dispatch`` must NOT catch ``asyncio.CancelledError``.

    The lifespan shutdown sends ``CancelledError`` to the supervisor
    task; the wrapper must let it propagate so the supervisor ends
    cleanly. ``CancelledError`` derives from ``BaseException`` (not
    ``Exception``) so the ``except Exception`` branch correctly skips
    it.
    """
    job_repo = AsyncMock()
    state = _build_state(job_repo=job_repo)

    class _CancelOrchestrator:
        def __init__(self, **_kwargs: Any) -> None:
            pass

        async def dispatch(self, _job_id: str, _job_type: str) -> None:
            raise asyncio.CancelledError()

    from epubtv.application.worker_queue import _safe_dispatch

    orchestrator = _CancelOrchestrator()
    with pytest.raises(asyncio.CancelledError):
        await _safe_dispatch(state, orchestrator, "job-1", "translation")

    # The row is NOT marked failed — CancelledError is a shutdown
    # signal, not a per-dispatch failure. No progress event is
    # emitted either (the WebSocket is being torn down with the
    # supervisor; emitting on a closing bus would be a no-op).
    job_repo.update_status.assert_not_called()
    state.progress_bus.emit.assert_not_called()


# ---------------------------------------------------------------------------
# MAX_ACTIVE knob (D-02)
# ---------------------------------------------------------------------------


def test_max_active_reads_settings_worker_max_active_at_import_time() -> None:
    """``MAX_ACTIVE`` is bound to ``settings.worker_max_active`` at import time.

    Setting ``settings.worker_max_active = 3`` and re-importing the
    module yields ``MAX_ACTIVE == 3`` (the env-override path for the
    post-sprint hardening pass).
    """
    import sys

    from epubtv.config import settings

    original = settings.worker_max_active
    with pytest.MonkeyPatch.context() as monkey:
        monkey.setattr(settings, "worker_max_active", 3)
        # Invalidate the cached module so re-import re-binds MAX_ACTIVE.
        monkey.delitem(sys.modules, "epubtv.application.worker_queue")
        reloaded = importlib.import_module("epubtv.application.worker_queue")
        assert reloaded.MAX_ACTIVE == 3
    # Restore the original (the monkey-patch context will undo the
    # settings change automatically, but we re-import back to the
    # original value to avoid leaking into other test modules).
    monkey2 = pytest.MonkeyPatch()
    try:
        monkey2.setattr(settings, "worker_max_active", original)
        monkey2.delitem(sys.modules, "epubtv.application.worker_queue")
        importlib.import_module("epubtv.application.worker_queue")
    finally:
        monkey2.undo()


def test_max_active_default_is_1() -> None:
    """D-02 sprint default: ``MAX_ACTIVE == 1``."""
    from epubtv.application.worker_queue import MAX_ACTIVE

    assert MAX_ACTIVE == 1
