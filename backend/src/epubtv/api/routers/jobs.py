"""Jobs router — JOBS-01 + JOBS-03 + JOBS-05 + CONF-01 + CONF-02 (plan 02-03 + plan 03-03 + plan 04-02).

Endpoints (mounted at ``/api/v1`` in ``api/app.py``):

- ``POST /api/v1/jobs`` — create a job. D-05 discriminated union parse
  (the schema gate rejects stray fields per variant + unknown
  ``job_type`` at parse time → 422). For ``translation`` jobs, the
  D-06 pre-flight computes the effective source language from the
  EPUB's ``declared_languages`` when the request omits it. For
  ``voiceover`` jobs, the D-08 + D-09 pre-flight auto-resolves
  ``source_language`` via ``EpubService.resolve_voiceover_language``
  (single-language → that language; ≥2 declared → first-spine
  chapter's ``xml:lang``; 0 declared + no chapter ``xml:lang`` →
  422 ``source_language_required``); the D-06 voice catalog check
  validates ``body.voice in VOICES_BY_LANGUAGE[source_language]``.
  For ``translation+voiceover`` (combined) jobs, the body now
  reaches ``create_job`` directly — the combined-workflow 501 from
  Phase 2/3 is REMOVED in Phase 4 / plan 04-02 because the
  combined-workflow orchestrator (``CombinedWorkflowService``) is
  now implemented. Returns 202 + ``JobView`` (the view includes the
  ``voice`` field for voiceover jobs).

- ``GET /api/v1/jobs`` — list jobs (most recent first; ``limit=50``).

- ``GET /api/v1/jobs/{id}`` — single ``JobView``; 404 ``not_found`` on
  unknown.

- ``DELETE /api/v1/jobs/{id}`` — Quick 260710-oih / JOBS-06 cancel
  surface. Marks the row ``"cancelled"`` (so the worker supervisor's
  FIFO helper skips it on the next tick) and then physically deletes
  the ``jobs`` row + its ``job_chunks`` + its ``audio_files`` in one
  transaction. Returns 204 on success; 404 ``not_found`` for an
  unknown id; 409 ``job_not_cancellable`` when the job is in a
  terminal state (``completed`` / ``failed`` / ``cancelled``). The
  in-flight task is NOT aborted mid-chunk — the running task is
  left to finish its current chunk; the row is gone before any next
  chunk write, so any in-flight ``append_chunk`` would write
  orphan ``job_chunks`` rows with no parent (the FK is intentionally
  not declared per ``schema.py``). Sprint-scope acceptable per
  Quick 260710-oih; a follow-up can add a status check at the top
  of each chunk loop in the workflow services.

- ``WS /api/v1/jobs/{id}/events`` — D-03 + F5-AC5 progress stream.
  Closes 1008 on unknown id (Pitfall 3). Subscribes a per-connection
  ``asyncio.Queue`` to the ``JobProgressBus``; the queue is dropped in
  the ``finally`` block so the subscriber set is empty on disconnect
  (no queue leak). Forwards events as the 6-field envelope
  ``{job_id, job_type, chunk_id, progress_current, progress_total, status}``.

Custom error codes live in ``api.error_codes``; the
``{error:{code,message,details?}}`` envelope is rendered by
``api.error_handlers.http_exception_handler`` (registered in
``api/app.py``).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from epubtv.api.error_codes import (
    JOB_NOT_CANCELLABLE,
    SOURCE_LANGUAGE_REQUIRED,
)
from epubtv.api.schemas import (
    JobCreateBody,
    JobListResponse,
    JobView,
)

router = APIRouter()


# WebSocket close codes (D-09 + Pitfall 3):
# - 1000 = normal closure
# - 1008 = policy violation (unknown id; the policy is "we only stream
#   events for jobs that exist")
# - 1011 = internal error (defensive; raised by Starlette if the
#   handler itself crashes mid-stream)
_WS_CLOSE_NORMAL: int = 1000
_WS_CLOSE_POLICY: int = 1008
_WS_CLOSE_INTERNAL: int = 1011


@router.post(
    "/jobs",
    response_model=JobView,
    status_code=202,
    responses={
        422: {
            "description": "schema validation / D-06 source-language required / D-06 voice catalog"
        },
    },
)
async def create_job(body: JobCreateBody, request: Request) -> JobView:
    """D-05 + D-06 + D-08 + D-09 + D-11 + D-13 + plan 04-02: parse + pre-flights.

    Sequence:
    1. FastAPI parses the body against ``JobCreateBody`` (the
       discriminated union). Unknown ``job_type`` or stray fields
       per variant → 422 (Pydantic). The handler does NOT run.
    2. D-06 pre-flight (translation only): if ``source_language is
       None``, fetch ``declared_languages`` from the persisted EPUB
       via ``EpubService.get_metadata``. 0 declared + 0 source → 422
       ``source_language_required`` (no row created). 1 declared →
       use that. >1 declared → leave source as None; the SPA warns
       the user.
    3. D-08 + D-09 pre-flight (voiceover only): if
       ``source_language is None``, auto-resolve via
       ``EpubService.resolve_voiceover_language``. 0 declared + no
       chapter ``xml:lang`` → 422 ``source_language_required``. 1
       declared → use that. ≥2 declared → first-spine chapter's
       ``xml:lang`` (D-08 first-spine rule).
     4. D-06 voice catalog check (voiceover only): validate
        ``body.voice in VOICES`` (the canonical OpenAI voice list —
        Pydantic ``min_length=1`` is the first gate at parse time;
       the router adds the catalog check for forward-compat with
       Phase 4 real-TTS providers).
    5. Persist the row via ``JobRepo.create_job(voice=...)``.
    6. Return the resulting ``JobView`` (202 + body). The view now
       includes the ``voice`` field (D-06).
    """
    # 1. FastAPI has already parsed the body; no further check needed
    #    here for stray fields (the discriminated union + per-variant
    #    extra=forbid did that).

    # 2. D-06 pre-flight (translation + combined).
    # ``getattr`` with a ``None`` default handles all three variants
    # of the discriminated union: ``TranslationJobBody`` and
    # ``CombinedJobBody`` have the ``source_language`` field;
    # ``VoiceoverJobBody`` does NOT (F4-AC1 + D-15: extra=forbid on
    # translation fields on the voiceover variant).
    effective_source = getattr(body, "source_language", None)
    if body.job_type in {"translation", "translation+voiceover"} and effective_source is None:
        # Re-parse the persisted EPUB bytes to read declared_languages.
        try:
            meta = await request.app.state.epub_service.get_metadata(
                body.epub_id,
                file_store=request.app.state.file_store,
            )
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "not_found",
                    "message": f"epub {body.epub_id!r} not found",
                },
            ) from exc
        declared = list(meta.get("declared_languages", []))  # type: ignore[arg-type]
        if len(declared) == 0:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": SOURCE_LANGUAGE_REQUIRED,
                    "message": ("EPUB declares no dc:language and source_language is unset"),
                    "details": {
                        "epub_id": body.epub_id,
                        "declared_languages": declared,
                    },
                },
            )
        if len(declared) == 1:
            effective_source = declared[0]
        # else: multi-language — leave effective_source as None; the
        # SPA shows a hint and the backend tolerates the omission.

    # 3. D-08 + D-09 pre-flight (voiceover only).
    effective_source_vo: str | None = None
    if body.job_type == "voiceover":
        # The VoiceoverJobBody schema does NOT declare a
        # ``source_language`` field (F4-AC1 + D-15: extra=forbid on
        # translation fields), so the Pydantic v2 discriminated union
        # returns a VoiceoverJobBody instance without the attribute.
        # Use ``getattr`` with a ``None`` default so the same code
        # handles all three variants of the discriminated union.
        effective_source_vo = getattr(body, "source_language", None)
        if effective_source_vo is None:
            # Auto-resolve from EPUB metadata.
            try:
                meta = await request.app.state.epub_service.get_metadata(
                    body.epub_id,
                    file_store=request.app.state.file_store,
                )
            except FileNotFoundError as exc:
                raise HTTPException(
                    status_code=404,
                    detail={
                        "code": "not_found",
                        "message": f"epub {body.epub_id!r} not found",
                    },
                ) from exc
            declared = list(meta.get("declared_languages", []))  # type: ignore[arg-type]
            if len(declared) == 0:
                # 0 declared: try resolve_voiceover_language (the EPUB
                # might still have a chapter xml:lang even if
                # dc:language is missing). If None, raise 422.
                resolved = await request.app.state.epub_service.resolve_voiceover_language(
                    body.epub_id,
                    file_store=request.app.state.file_store,
                )
                if resolved is None:
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "code": SOURCE_LANGUAGE_REQUIRED,
                            "message": (
                                "EPUB declares no dc:language and source_language is unset"
                            ),
                            "details": {
                                "epub_id": body.epub_id,
                                "declared_languages": declared,
                            },
                        },
                    )
                effective_source_vo = resolved
            elif len(declared) == 1:
                # Single declared language: use that (D-09 zero-config).
                effective_source_vo = declared[0]
            else:
                # ≥2 declared: use first-spine chapter's xml:lang
                # (D-08 first-spine rule).
                resolved = await request.app.state.epub_service.resolve_voiceover_language(
                    body.epub_id,
                    file_store=request.app.state.file_store,
                )
                effective_source_vo = resolved if resolved else declared[0]

        # 4. D-06 voice catalog check (voiceover only).
        # The Pydantic ``min_length=1`` is the first gate at parse
        # time; the catalog check is the second gate (forward-compat
        # for Phase 4 real-TTS provider validation). OpenAI voices are
        # a fixed set — the catalog is a single flat list, not a
        # per-language matrix.
        from epubtv.api.routers.voices import VOICES

        if body.voice not in VOICES:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "validation_error",
                    "message": (
                        f"voice {body.voice!r} is not in the catalog; "
                        f"available voices: {list(VOICES)}"
                    ),
                    "details": {"voice": body.voice, "language": effective_source_vo},
                },
            )

    # 4b. D-06 voice catalog check (combined). Combined jobs carry
    # both translation fields (source_language, target_language) and
    # a voice (the same D-08 + D-09 source-language resolver as
    # voiceover applies; the catalog check mirrors voiceover).
    if body.job_type == "translation+voiceover":
        from epubtv.api.routers.voices import VOICES

        # Reuse the translation source if present; otherwise reuse
        # the combined body. For combined jobs the user may either
        # pass source_language explicitly OR leave it unset to let
        # the EPUB metadata drive it (mirroring voiceover D-09).
        combined_source = effective_source
        if combined_source is None:
            # Auto-resolve from EPUB metadata (D-08 + D-09).
            try:
                meta = await request.app.state.epub_service.get_metadata(
                    body.epub_id,
                    file_store=request.app.state.file_store,
                )
            except FileNotFoundError as exc:
                raise HTTPException(
                    status_code=404,
                    detail={
                        "code": "not_found",
                        "message": f"epub {body.epub_id!r} not found",
                    },
                ) from exc
            declared = list(meta.get("declared_languages", []))  # type: ignore[arg-type]
            if len(declared) == 0:
                resolved = await request.app.state.epub_service.resolve_voiceover_language(
                    body.epub_id,
                    file_store=request.app.state.file_store,
                )
                if resolved is None:
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "code": SOURCE_LANGUAGE_REQUIRED,
                            "message": (
                                "EPUB declares no dc:language and source_language is unset"
                            ),
                            "details": {
                                "epub_id": body.epub_id,
                                "declared_languages": declared,
                            },
                        },
                    )
                combined_source = resolved
            elif len(declared) == 1:
                combined_source = declared[0]
            else:
                resolved = await request.app.state.epub_service.resolve_voiceover_language(
                    body.epub_id,
                    file_store=request.app.state.file_store,
                )
                combined_source = resolved if resolved else declared[0]
            effective_source = combined_source
        if body.voice not in VOICES:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "validation_error",
                    "message": (
                        f"voice {body.voice!r} is not in the catalog; "
                        f"available voices: {list(VOICES)}"
                    ),
                    "details": {"voice": body.voice, "language": combined_source},
                },
            )

    # 4c. Phase 1 / BACK-10 voiceover preflight gate: only
    # ``"openai-compatible"`` is supported for TTS (Ollama has no TTS
    # endpoint per PRD §6). A 422 here is the user-facing surface
    # for an unsupported TTS provider — the worker-drain path would
    # also return 422 via the orchestrator's HTTPException, but a
    # 422 surfaced from a worker task does NOT propagate to the
    # HTTP response (the request has already returned 202). The
    # preflight gate is the synchronous user-facing 422.
    if body.job_type == "voiceover" and getattr(body, "provider", None) != "openai-compatible":
        raise HTTPException(
            status_code=422,
            detail={
                "code": "validation_error",
                "message": (
                    f"TTS provider {getattr(body, 'provider', None)!r} is not supported; "
                    "the only supported TTS provider is openai-compatible"
                ),
                "details": {"provider": getattr(body, "provider", None)},
            },
        )

    # 5. Persist the row.
    job_id = await request.app.state.job_repo.create_job(
        epub_id=body.epub_id,
        job_type=body.job_type,
        chapter_ids=body.chapter_ids or [],
        source_language=(
            effective_source
            if body.job_type in {"translation", "translation+voiceover"}
            else effective_source_vo
        ),
        target_language=(
            body.target_language
            if body.job_type in {"translation", "translation+voiceover"}
            else None
        ),
        voice=body.voice if body.job_type in {"voiceover", "translation+voiceover"} else None,
        # Phase 1 / BACK-09: forward the provider + model from the
        # discriminated union variant. Translation + combined bodies
        # carry them via ``TranslationFieldsMixin``; voiceover bodies
        # carry them via the per-variant ``VoiceoverJobBody`` schema
        # (added in plan 01-03). The ``getattr`` with a ``None`` default
        # keeps the code defensive against a future variant that omits
        # one of the two fields.
        provider=getattr(body, "provider", None),
        model=getattr(body, "model", None),
    )

    # 7. Return the JobView.
    job = await request.app.state.job_repo.get_job(job_id)
    assert job is not None  # just-created row; invariant
    return _job_row_to_view(job)


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(request: Request) -> JobListResponse:
    """JOBS-05: list jobs (most recent first; default ``limit=50``)."""
    rows = await request.app.state.job_repo.list_jobs(limit=50)
    return JobListResponse(jobs=[_job_row_to_view(r) for r in rows])


@router.get(
    "/jobs/{job_id}",
    response_model=JobView,
    responses={404: {"description": "not_found"}},
)
async def get_job(job_id: str, request: Request) -> JobView:
    """JOBS-05: single-job view; 404 ``not_found`` for unknown ids."""
    job = await request.app.state.job_repo.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": f"job {job_id!r} not found"},
        )
    return _job_row_to_view(job)


@router.delete(
    "/jobs/{job_id}",
    status_code=204,
    responses={
        404: {"description": "not_found"},
        409: {"description": "job_not_cancellable"},
    },
)
async def cancel_job(job_id: str, request: Request) -> Response:
    """JOBS-06 (Quick 260710-oih): cancel a queued/running job.

    Sequence:
    1. Fetch the row. 404 ``not_found`` for an unknown id (matches
       the GET handler shape).
    2. If the row is in a terminal state (``completed`` /
       ``failed`` / ``cancelled``), raise 409 ``job_not_cancellable``
       so the SPA's Cancel button does NOT silently succeed on a
       finished job. The terminal-state set mirrors the workflow
       services' "already-finished" guard at the top of
       ``TranslationWorkflowService.run`` /
       ``VoiceOverWorkflowService.run`` (both check
       ``{"completed", "failed", "cancelled"}``).
    3. For non-terminal rows (queued / running / connecting):
       first ``update_status(job_id, "cancelled")`` so the worker
       supervisor's FIFO helper ``pop_next_queued`` skips the row
       on its next tick (the helper filters on
       ``status == "queued"``; a running task is left to finish its
       current chunk, but the row is deleted before any next chunk
       write, so the in-flight ``append_chunk`` would write orphan
       ``job_chunks`` rows with no parent — the FK is intentionally
       not declared per ``schema.py``).
    4. Call ``delete_job(job_id)`` to wipe the ``jobs`` row + its
       ``job_chunks`` + its ``audio_files`` in one transaction.
    5. Return ``Response(status_code=204)`` (no body — the 204
       No-Content envelope is documented in
       ``docs/agents/api-contract.md``).
    """
    job = await request.app.state.job_repo.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": f"job {job_id!r} not found"},
        )
    terminal_statuses = {"completed", "failed", "cancelled"}
    if job["status"] in terminal_statuses:
        raise HTTPException(
            status_code=409,
            detail={
                "code": JOB_NOT_CANCELLABLE,
                "message": (
                    f"job {job_id!r} is in terminal state {job['status']!r} and cannot be cancelled"
                ),
                "details": {"status": job["status"]},
            },
        )
    # Non-terminal: mark cancelled first (so the worker's next
    # ``pop_next_queued`` tick skips the row), then physically delete
    # the row + its chunks + its audio files. The ``update_status``
    # is a no-op on an unknown id (defensive — the existence check
    # above already gated the 404 path).
    await request.app.state.job_repo.update_status(job_id, "cancelled")
    await request.app.state.job_repo.delete_job(job_id)
    return Response(status_code=204)


@router.websocket("/jobs/{job_id}/events")
async def job_events(websocket: WebSocket, job_id: str) -> None:
    """D-03 + F5-AC5: stream per-chunk progress events over WS.

    Behaviour:
    - ``job_id`` is validated against the SQLite store. Unknown id →
      close ``1008`` (policy violation: we only stream events for jobs
      that exist). This is the WS analogue of the HTTP 404.
    - On accept: subscribe a per-connection ``asyncio.Queue`` to the
      ``JobProgressBus`` topic for ``job_id``. The Phase 1 bus
      contract is "no replay" — late subscribers receive the NEXT
      event only.
    - The handler loops on ``q.get()`` and forwards each event as
      JSON to the client. The 6-field envelope is the F5-AC5
      contract.
    - On disconnect (or any exception): unsubscribe the queue from
      the bus. The ``finally`` block is critical — without it the
      subscriber set would leak queues (Pitfall 3).
    """
    # Validate the id BEFORE accept so the 1008 close is sent cleanly
    # without a back-and-forth handshake.
    job_repo = websocket.app.state.job_repo
    bus = websocket.app.state.progress_bus
    job = await job_repo.get_job(job_id)
    if job is None:
        await websocket.close(code=_WS_CLOSE_POLICY)
        return

    await websocket.accept()
    q = bus.subscribe(job_id)
    try:
        while True:
            event = await q.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        # Client-initiated close; normal flow.
        pass
    finally:
        # The Pitfall 3 queue-leak guard — must always run, even on
        # unexpected exceptions in the loop.
        bus.unsubscribe(job_id, q)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _job_row_to_view(row: dict[str, Any]) -> JobView:
    """Convert a ``JobRepo.get_job`` / ``list_jobs`` row dict to ``JobView``."""
    return JobView(
        id=str(row["id"]),
        epub_id=str(row["epub_id"]),
        job_type=str(row["job_type"]),
        status=str(row["status"]),
        source_language=row.get("source_language"),
        target_language=row.get("target_language"),
        # Phase 3 / D-06: voiceover jobs carry the voice id; translation
        # jobs have ``None`` (the column default). The view surfaces the
        # voice so the SPA can display the chosen voice in the
        # ``JobStatusPanel``.
        voice=row.get("voice"),
        # Phase 1 / BACK-09: surface the persisted provider + model on
        # every ``JobView``. ``None`` for v1.1 legacy rows that pre-date
        # the column. The view's nullable defaults keep the schema
        # contract back-compat.
        provider=row.get("provider"),
        model=row.get("model"),
        chapter_ids=list(row.get("chapter_ids", []) or []),
        last_chunk_id=row.get("last_chunk_id"),
        # The repository stores tz-aware UTC datetimes; normalise to
        # naive (the schema's ``datetime`` accepts both).
        created_at=_coerce_datetime(row.get("created_at")),
        updated_at=_coerce_datetime(row.get("updated_at")),
    )


def _coerce_datetime(value: Any) -> datetime:
    """Coerce a stored datetime (or ISO string) to a ``datetime``.

    Pydantic v2 ``datetime`` accepts both ``datetime`` instances and
    ISO-8601 strings, but the in-memory representation is a tz-aware
    ``datetime`` (the SQLModel default factory uses ``datetime.now(
    UTC)``). This helper keeps the conversion explicit and defensive.
    """
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    # Last resort — current time (should not happen in practice).
    return datetime.utcnow()


# Keep unused imports out of the linter's sight. ``JSONResponse`` is
# not used in the current handler set (FastAPI renders the response
# model directly) but is kept as a future-proofing seam for Phase 4
# streaming download.
_ = JSONResponse
