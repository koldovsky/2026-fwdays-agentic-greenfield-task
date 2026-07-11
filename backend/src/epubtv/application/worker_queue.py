"""Worker supervisor — D-02 in-process queue drain loop.

Per D-02 (Phase 2 sprint scope) and the architecture contract:
- ``MAX_ACTIVE = settings.worker_max_active`` (default 1; env override
  ``WORKER_MAX_ACTIVE=3`` for the post-sprint hardening pass).
- The supervisor shares the FastAPI event loop (single-worker
  ``--workers 1`` — backend/AGENTS.md §Mandatory gotchas).
- It polls every 1s; pops the next queued job FIFO via
  ``SQLiteJobRepository.pop_next_queued``; dispatches via
  ``JobOrchestrator.dispatch``; lets ``create_task`` schedule the
  per-job coroutine so the drain loop keeps running.
- Gracefully cancellable: ``asyncio.CancelledError`` propagates
  cleanly; the lifespan shutdown in ``api/app.py`` swallows it.

The 2 F5 BDD scenarios asserting 3+overflow queue depth are tagged
``@defer-scaling`` (plan 02-06). The unit tests in this module cover
only the 1-active-jobs sprint path; the worker_supervisor itself
respects ``MAX_ACTIVE`` regardless of the value (the @defer-scaling
tag is about the BDD contract, not the implementation).

WR-03 dispatch safety net (Phase 1 plan 01-REVIEW): the
``_safe_dispatch`` helper wraps ``JobOrchestrator.dispatch`` in a
try/except that:
- catches ``HTTPException`` (the orchestrator's 422 ``validation_error``
  branches for legacy rows, unknown providers, and unsupported
  ``ollama``-as-TTS raise ``HTTPException``);
- marks the job row as ``"failed"`` via ``job_repo.update_status`` so
  a dispatcher failure does not leave the job row in ``"queued"``
  forever (the supervisor would re-pop it on the next tick → infinite
  loop);
- emits a structured log line with the error code + message;
- re-raises the ``HTTPException`` so the outer lifespan exception
  handler still records the API error in the lifecycle logs.

The ``KeyError`` for a missing job is NOT caught here (it is a
programming error, not a per-dispatch failure); ``asyncio.Task``
exception tracking surfaces it.

Quick 260709-bso: ``_build_orchestrator`` no longer constructs the
per-provider translation + voiceover subworkflows up-front. The
orchestrator now receives ADAPTER CLASSES + BASE URLS + the
default voice + the workflow collaborators (job_repo, progress_bus,
epub_service, file_store, audio_stitcher, audio_dir, artifact_dir)
and constructs a fresh translation + TTS adapter (and the matching
per-provider workflow) for every dispatch. This replaces the
"shared singleton + ``adapter._model = model`` mutation" pattern
(quick 260709-lifespan) so two concurrent jobs under
``WORKER_MAX_ACTIVE=3`` hardening can use different models /
voices without a race condition.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import HTTPException

from epubtv.config import settings

_logger = logging.getLogger(__name__)

# D-02 sprint default = 1; env override ``WORKER_MAX_ACTIVE=3`` flips
# this at process boot. The constant is read at import time; tests that
# want to flip it must ``delitem sys.modules`` and re-import (the
# test_worker_queue suite covers this).
MAX_ACTIVE: int = settings.worker_max_active

# Imported at module scope so unit tests can monkey-patch
# ``worker_queue.JobOrchestrator`` for stub dispatchers. The
# ``TranslationWorkflowService`` is constructed inside
# ``_build_orchestrator`` per dispatch (cheap; stateless wrapper).
from epubtv.application.job_orchestrator import JobOrchestrator  # noqa: E402

__all__ = ["MAX_ACTIVE", "worker_supervisor"]


def _build_orchestrator(state: Any) -> JobOrchestrator:
    """Build a fresh ``JobOrchestrator`` for one dispatch.

    The orchestrator + workflows are stateless wrappers; the only
    collaborators they need are read from ``state`` (the FastAPI
    ``app.state``). Constructing a fresh set per dispatch is cheap.

    Phase 3 / D-11 + D-12 wires the voiceover workflow alongside
    the translation workflow; the orchestrator receives both.
    The ``MAX_ACTIVE=1`` invariant (D-12) is unchanged.

    Phase 4 / plan 04-02 wires the combined-workflow service
    alongside the two single-workflow services; the orchestrator
    receives all three. The combined workflow owns its own
    artifact pre-builds for the combined ``job_type`` (the
    per-workflow pre-builds in translation / voiceover are
    gated on the corresponding single-workflow ``job_type``).

    Phase 1 plan 01-03 / BACK-10: per-provider subworkflow
    dispatch. The factory now wires ADAPTER CLASSES + BASE URLS
    + the default voice (stable per-process) into the
    orchestrator; the orchestrator instantiates a fresh
    translation + TTS adapter (and the matching per-provider
    workflow) for every dispatch and closes the adapters in a
    ``finally`` block. This replaces the previous "shared
    singleton + ``adapter._model = model`` mutation" pattern
    (quick 260709-lifespan) so two concurrent jobs under
    ``WORKER_MAX_ACTIVE=3`` hardening never race on the model
    attribute.
    """
    from epubtv.adapters.audio.audio_stitcher import AudioStitcher

    return JobOrchestrator(
        job_repo=state.job_repo,
        # Per-dispatch adapter config (stable per-process) — the
        # orchestrator constructs a fresh adapter for every
        # dispatch from the class + base URL + the job row's
        # model / voice. Replaces the previous ``translation_adapters``
        # dict + ``tts_port`` singleton (quick 260709-lifespan).
        translation_adapter_classes=state.translation_adapter_classes,
        translation_base_urls=state.translation_base_urls,
        tts_adapter_class=state.tts_adapter_class,
        tts_base_url=state.tts_base_url,
        default_voice=state.default_voice,
        # Workflow collaborators.
        progress_bus=state.progress_bus,
        epub_service=state.epub_service,
        file_store=state.file_store,
        audio_stitcher=AudioStitcher(),
        audio_dir=state.audio_dir,
        artifact_dir=state.artifact_dir,
    )


async def _safe_dispatch(
    state: Any,
    orchestrator: JobOrchestrator,
    job_id: str,
    job_type: str,
) -> None:
    """Wrap ``JobOrchestrator.dispatch`` so a per-dispatch failure marks the job failed.

    Two failure modes are caught here so the supervisor's
    ``count_active()`` can never read 1 for a dead workflow:

    1. ``HTTPException`` (the orchestrator's 422 ``validation_error``
       branches for legacy rows, unknown providers, and unsupported
       ``ollama``-as-TTS). The row is NOT marked failed by the
       orchestrator, so a re-dispatch on the next supervisor tick
       would re-raise the same 422 forever (infinite loop). Mark
       the row failed, emit a ``status="failed"`` progress event so
       the WebSocket subscribers see the failure, log with the
       orchestrator's code + message, re-raise so the outer task
       is cancelled cleanly.

    2. Any other ``Exception`` (defense-in-depth for the
       worker-queue-stuck-after-first-job bug). A workflow can die
       with a non-HTTPException (httpx.ConnectError, an asyncio
       TimeoutError that escapes the workflow's ``wait_for``, an
       unhandled exception in the per-chunk loop, etc.) and leave
       the row in ``running`` state. The startup orphan sweep in
       ``worker_supervisor`` cleans this up on NEXT restart; this
       catch handles the live case (workflow dies while the
       supervisor is still running). Mark the row failed with
       ``internal_dispatch_error``, emit a ``status="failed"``
       progress event, log with the exception type + message,
       re-raise.

    The F5-AC5 6-field progress envelope (``job_id`` + ``job_type`` +
    ``chunk_id`` + ``progress_current`` + ``progress_total`` +
    ``status``) is always emitted on failure. ``chunk_id`` is
    ``None`` and the progress counters are ``0`` because the
    workflow never reached the chunk loop; the frontend
    ``JobStatusPanel`` renders the ``error`` field for the
    terminal-failed state (see ``JobStatusPanel.tsx`` —
    ``testId="status-failed"``). Without this emit the WebSocket
    subscribers would sit in "running" forever (the workflow is
    gone but no event was ever pushed), which is the
    frontend-did-not-notify-user bug from this session's second
    symptom.

    ``BaseException`` (``asyncio.CancelledError``, ``KeyboardInterrupt``,
    ``SystemExit``) is NOT caught — the lifespan shutdown sends
    ``CancelledError`` and we want it to propagate so the supervisor
    task ends cleanly.
    """
    try:
        await orchestrator.dispatch(job_id, job_type)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        code = detail.get("code", "unknown")
        detail_message = detail.get("message", str(exc.detail))
        try:
            await state.job_repo.update_status(job_id, "failed")
        except Exception as update_exc:
            _logger.exception(
                "safe_dispatch.status_update_failed",
                extra={"job_id": job_id, "error": str(update_exc)},
            )
        try:
            state.progress_bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": job_type,
                    "chunk_id": None,
                    "progress_current": 0,
                    "progress_total": 0,
                    "status": "failed",
                    "error": code,
                    "detail_message": detail_message,
                },
            )
        except Exception as emit_exc:
            _logger.exception(
                "safe_dispatch.progress_emit_failed",
                extra={"job_id": job_id, "error": str(emit_exc)},
            )
        _logger.warning(
            "job_dispatch_failed",
            extra={
                "job_id": job_id,
                "job_type": job_type,
                "code": code,
                "detail_message": detail_message,
            },
        )
        raise
    except Exception as exc:
        try:
            await state.job_repo.update_status(job_id, "failed")
        except Exception as update_exc:
            _logger.exception(
                "safe_dispatch.status_update_failed",
                extra={"job_id": job_id, "error": str(update_exc)},
            )
        try:
            state.progress_bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": job_type,
                    "chunk_id": None,
                    "progress_current": 0,
                    "progress_total": 0,
                    "status": "failed",
                    "error": "internal_dispatch_error",
                    "detail_message": f"{type(exc).__name__}: {exc}",
                },
            )
        except Exception as emit_exc:
            _logger.exception(
                "safe_dispatch.progress_emit_failed",
                extra={"job_id": job_id, "error": str(emit_exc)},
            )
        _logger.warning(
            "job_dispatch_failed",
            extra={
                "job_id": job_id,
                "job_type": job_type,
                "code": "internal_dispatch_error",
                "detail_message": f"{type(exc).__name__}: {exc}",
            },
        )
        raise


async def worker_supervisor(state: Any) -> None:
    """Drain loop: pop queued jobs FIFO, dispatch up to ``MAX_ACTIVE`` concurrent.

    Per D-02: ``MAX_ACTIVE=1`` sprint default; env override
    ``WORKER_MAX_ACTIVE=3`` for the post-sprint hardening pass. The
    supervisor NEVER spawns more than ``MAX_ACTIVE`` coroutines at
    once (the FIFO helper is gated on ``active < MAX_ACTIVE``).

    Cancellation safety: the outer ``while True`` is wrapped so
    ``asyncio.CancelledError`` from lifespan shutdown propagates
    cleanly; the existing ``app.py`` shutdown swallows it.

    Per WR-03, each dispatch is wrapped in ``_safe_dispatch`` so a
    per-dispatch ``HTTPException`` (legacy row, unknown provider,
    ollama-as-TTS) marks the job ``"failed"`` instead of leaving
    it in ``"queued"`` for the next tick to re-dispatch forever.

    Startup orphan sweep (worker-queue-stuck-after-first-job fix):
    a workflow can die (container restart, OOM kill, signal, an
    unhandled exception that bypasses ``_safe_dispatch``) and
    leave its row in ``running`` state. Without recovery, the
    supervisor's ``count_active()`` permanently reads 1, the
    ``active < MAX_ACTIVE`` guard never opens, and the queue
    stalls. The supervisor calls
    ``mark_orphaned_running_as_failed`` ONCE on startup, BEFORE
    the first ``count_active`` poll, so any orphan from the
    previous process is cleared before the new process starts
    dispatching. The sweep is idempotent (no-op when the queue is
    clean) and is logged at INFO with the swept id count for
    postmortem.
    """
    # Quick 260709-54r: DEBUG-level breadcrumb to confirm the
    # supervisor is alive (the chain previously died silently at
    # the first dispatch when ``AudioStitcher`` import raised on
    # Python 3.13 — see ADR 0014). Operators opt in via
    # ``EPUBTV_LOG_LEVEL=DEBUG``.
    _logger.debug("worker_supervisor.start max_active=%d", MAX_ACTIVE)
    # Startup orphan sweep: see docstring above. The sweep runs
    # BEFORE the orchestrator is built so the first ``count_active``
    # poll sees a clean state.
    try:
        swept_ids = await state.job_repo.mark_orphaned_running_as_failed()
    except Exception:
        # Defensive: a DB error during the sweep must not block the
        # supervisor from starting. Log + carry on; the operator
        # can clear the orphan manually if the sweep is the failure
        # mode.
        _logger.exception("worker_supervisor.orphan_sweep_failed")
        swept_ids = []
    if swept_ids:
        _logger.info(
            "worker_supervisor.orphan_sweep_swept",
            extra={"count": len(swept_ids), "job_ids": swept_ids},
        )
    else:
        _logger.debug("worker_supervisor.orphan_sweep_clean")
    orchestrator = _build_orchestrator(state)
    _logger.debug("worker_supervisor.orchestrator_built")
    # Track in-flight dispatch tasks so the lifespan shutdown can
    # ``gather`` them cleanly. Without this, a task that raises an
    # exception would log a "Task exception was never retrieved" warning.
    _inflight: set[asyncio.Task[None]] = set()
    while True:
        active = await state.job_repo.count_active()
        _logger.debug("worker_supervisor.tick active=%d", active)
        if active < MAX_ACTIVE:
            next_job = await state.job_repo.pop_next_queued()
            _logger.debug("worker_supervisor.popped next_job=%s", next_job)
            if next_job is not None:
                # Schedule the dispatch and keep draining — don't sleep.
                # ``_safe_dispatch`` catches the orchestrator's
                # ``HTTPException`` branches and marks the row failed
                # so the next supervisor tick does not re-dispatch
                # the same row in an infinite loop.
                task = asyncio.create_task(
                    _safe_dispatch(
                        state,
                        orchestrator,
                        next_job["id"],
                        next_job["job_type"],
                    )
                )
                _inflight.add(task)
                task.add_done_callback(_inflight.discard)
                continue
        await asyncio.sleep(1.0)
