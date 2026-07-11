"""FastAPI app factory with lifespan DI composition root (Pattern 1).

Phase 1 plan 01 + plan 02 binds (quick 260709-bso: per-dispatch
adapter wiring):
- ``app.state.translation_adapter_classes = {"ollama": OllamaHttpTranslationAdapter, "openai-compatible": OpenAIHttpTranslationAdapter}``
- ``app.state.translation_base_urls       = {"ollama": settings.default_ollama_url, "openai-compatible": settings.default_openai_url}``
- ``app.state.tts_adapter_class          = OpenAIHttpTTSAdapter``
- ``app.state.tts_base_url               = settings.default_openai_url``
- ``app.state.default_voice              = "alloy"``
- ``app.state.translation_port           = OpenAIHttpTranslationAdapter(...)`` (back-compat shim for tests that read it; never used for dispatch under the per-dispatch design)
- ``app.state.job_repo                   = await SQLiteJobRepository.create(db_path=settings.db_path)``
- ``app.state.file_store                 = LocalFileStore(scratch_dir=settings.scratch_dir)``
- ``app.state.progress_bus               = JobProgressBus()`` + ``attach_loop(...)``
- ``app.state.worker_task                = asyncio.create_task(worker_supervisor(app.state))`` (idle Phase 1)

The per-provider URL surface is split (per WR-06): the Ollama
adapter reads ``settings.default_ollama_url`` and the OpenAI-
compatible adapter + TTS adapter read
``settings.default_openai_url``. The legacy ``MOCK_LLM_URL`` env
var is removed — the demo container's ``docker compose.yml`` wires
two separate env vars
(``EPUBTV_DEFAULT_OLLAMA_URL`` /
``EPUBTV_DEFAULT_OPENAI_URL``) to point at the in-network
``mock-llm`` service for both providers. The per-provider
dispatch happens in plan 01-03 via the orchestrator.

Quick 260709-bso: the lifespan wires ADAPTER CLASSES + BASE URLs
(stable per-process) instead of a shared singleton dict / TTS port.
The orchestrator instantiates a fresh translation + TTS adapter
for every dispatch (with the job row's stored model / voice) and
closes them in a ``finally`` block. The previous "shared singleton
+ ``adapter._model = model`` mutation" pattern (quick
260709-lifespan) was removed because two concurrent jobs under
``WORKER_MAX_ACTIVE=3`` hardening would race on the model
attribute.

On shutdown: cancel the worker task (awaiting it swallowing CancelledError)
+ dispose the SQLite engine + close the back-compat shim translation
adapter. Wraps the whole startup in a single
``@asynccontextmanager lifespan`` — FastAPI's deprecated
``@app.on_event("startup")`` is NOT used (RESEARCH §Anti-Patterns).

CORS env-gating (D-03 + RESEARCH §Open Q4):
- ``env == "dev"`` → ``CORSMiddleware`` with ``allow_origins=["*"]``;
- ``env == "prod"`` → no CORS middleware (StaticFiles mount is same-origin);
- NEVER ``allow_credentials=True`` together with ``allow_origins=["*"]``
  (Security §CORS misconfiguration).

Static mount (D-03 prod path): ``app.mount("/", StaticFiles(directory=
settings.frontend_out, html=True), name="spa")`` only when
``settings.serve_static is True``.

Error envelope (INFRA-03): ``app.add_exception_handler(HTTPException,
http_exception_handler)`` registered here. ``EpubValidationError`` handler
is registered in Plan 02 once ``routers/epubs.py`` exists.

Phase 3 / D-13 also binds ``app.state.audio_dir`` (a ``pathlib.Path``)
from ``settings.audio_dir`` so the worker supervisor can construct
``VoiceOverWorkflowService`` with the audio output directory.

Plan 01-02 (BACK-01 + BACK-08) and quick 260709-9yk: the in-process
``Mock*Adapter`` + ``BehaviourSpec`` (env-var reader) +
``AdapterBehaviour`` Pydantic model are no longer imported by the
production lifespan. The behaviour seam is test-only now; the
``app.state.behaviour_translation`` + ``app.state.behaviour_tts`` slots
are gone and the workflow services construct without a behaviour gate
(the slow-mode sleep retired with the in-process mocks' move to
``tests/``).
"""

from __future__ import annotations

import asyncio
import logging
import pathlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository
from epubtv.adapters.progress.job_progress_bus import JobProgressBus
from epubtv.adapters.storage.local_file_store import LocalFileStore
from epubtv.adapters.translation.http_translation_adapter import HttpTranslationAdapter
from epubtv.adapters.translation.ollama_http_translation_adapter import OllamaHttpTranslationAdapter
from epubtv.adapters.translation.openai_http_translation_adapter import (
    OpenAIHttpTranslationAdapter,
)
from epubtv.adapters.tts.openai_http_tts_adapter import OpenAIHttpTTSAdapter
from epubtv.api.error_handlers import epub_validation_handler, http_exception_handler
from epubtv.api.routers import download, epubs, health, jobs, providers, voices
from epubtv.application.epub_service import EpubService
from epubtv.application.worker_queue import worker_supervisor
from epubtv.config import settings
from epubtv.tools.db_migrations import run_alembic_upgrade

logger = logging.getLogger("epubtv")
logger.setLevel(settings.resolve_log_level())


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Bind the four ports + worker supervisor to ``app.state`` (Pattern 1).

    Migration contract (quick 260708-t1t + ADR 0013): the first
    action on startup is ``alembic upgrade head`` (in a thread so
    the loop stays responsive). The call is **in-process** —
    ``epubtv.tools.db_migrations.run_alembic_upgrade`` constructs
    an ``alembic.config.Config`` from ``backend/alembic.ini`` and
    invokes ``alembic.command.upgrade(cfg, "head")`` directly, with
    no subprocess. This funnels schema apply through the lifespan
    so every entrypoint — local ``uv run uvicorn``, ``docker compose
    up``, the Playwright ``webServer``, ``TestClient`` /
    ``ASGITransport`` tests — picks up new migrations without a
    separate operator step. Idempotency: ``alembic upgrade head`` is
    a no-op when the DB is already at head, so the per-boot cost
    is one ``SELECT current_version`` round-trip. Failure: the
    underlying ``alembic.command.upgrade`` exception propagates;
    uvicorn / docker compose surface the failing boot.
    """

    logger.info("epubtv lifaspan called")
    # 0. apply pending alembic migrations (quick 260708-t1t + ADR
    # 0013). The migration must run BEFORE any repo opens a
    # connection, so the tables it needs exist by the time
    # ``SQLiteJobRepository.create`` below opens the SQLite file.
    # ``asyncio.to_thread`` keeps the event loop responsive while
    # alembic runs (the in-process call still goes through a
    # worker thread because ``alembic.command.upgrade`` is sync).
    await asyncio.to_thread(run_alembic_upgrade)

    # 1. (removed) behaviour gate — quick 260709-9yk retired the
    # ``app.state.behaviour_translation`` / ``app.state.behaviour_tts``
    # slots and the corresponding ``AdapterBehaviour`` constructor
    # along with the in-process mock adapters' move to ``tests/``.
    # The workflow services no longer consume a behaviour gate.

    # 2-3. Translation + TTS adapter wiring. The per-provider HTTP
    # adapter classes (TRAN-02 + TTS-02) point at per-provider base
    # URLs (WR-06): ``settings.default_ollama_url`` for the Ollama
    # adapter; ``settings.default_openai_url`` for the OpenAI-
    # compatible translation adapter + the TTS adapter. The legacy
    # ``MOCK_LLM_URL`` env var is removed; the demo container
    # wires two separate env vars (``EPUBTV_DEFAULT_OLLAMA_URL`` /
    # ``EPUBTV_DEFAULT_OPENAI_URL``) to point at the in-network
    # ``mock-llm`` service for both providers.
    #
    # Quick 260709-bso: the lifespan wires ADAPTER CLASSES + BASE
    # URLs (stable per-process). The orchestrator instantiates a
    # fresh translation + TTS adapter for every dispatch (with the
    # job row's stored model / voice) and closes them in a
    # ``finally`` block. The previous "shared singleton +
    # ``adapter._model = model`` mutation" pattern (quick
    # 260709-lifespan) is removed because two concurrent jobs under
    # ``WORKER_MAX_ACTIVE=3`` hardening would race on the model
    # attribute. The ``app.state.translation_port`` shim stays as a
    # back-compat shim for tests that read it (it points at the
    # OpenAI-compatible adapter by default — the SPA's "Load
    # Models" button in plan 01-04 defaults to OpenAI-compatible);
    # the shim is NOT used for dispatch under the new design.
    app.state.translation_adapter_classes = {
        "ollama": OllamaHttpTranslationAdapter,
        "openai-compatible": OpenAIHttpTranslationAdapter,
    }
    app.state.translation_base_urls = {
        "ollama": settings.default_ollama_url,
        "openai-compatible": settings.default_openai_url,
    }
    app.state.tts_adapter_class = OpenAIHttpTTSAdapter
    app.state.tts_base_url = settings.default_openai_url
    app.state.default_voice = "alloy"
    # Back-compat shim: a single ``OpenAIHttpTranslationAdapter``
    # instance for tests that read ``app.state.translation_port`` —
    # not used by the dispatch path under the per-dispatch design.
    app.state.translation_port = OpenAIHttpTranslationAdapter(
        base_url=settings.default_openai_url,
        model=settings.default_openai_model,
    )

    # 4-5. Persistence + file store + progress bus.
    app.state.job_repo = await SQLiteJobRepository.create(db_path=str(settings.db_path))
    app.state.file_store = LocalFileStore(scratch_dir=settings.scratch_dir)
    app.state.progress_bus = JobProgressBus()
    app.state.progress_bus.attach_loop(asyncio.get_running_loop())
    # Phase 2: bind the EpubService on app.state so the worker
    # supervisor can construct the translation workflow with the
    # chapter-loading collaborator.
    app.state.epub_service = EpubService()
    # Phase 3 / D-13: bind the audio output directory so the worker
    # supervisor can construct ``VoiceOverWorkflowService`` with the
    # target path. ``settings.audio_dir`` defaults to ``data/audio``
    # (relative path under CWD); production overrides via env.
    app.state.audio_dir = pathlib.Path(settings.audio_dir)

    # Phase 4 / DL-01: bind the artifact pre-build directory so the
    # worker supervisor can construct the workflows with the target
    # path for the translated EPUB + per-chapter audio ZIP. Mirrors
    # the ``audio_dir`` shape; ``settings.artifact_dir`` defaults to
    # ``data/artifacts``.
    app.state.artifact_dir = pathlib.Path(settings.artifact_dir)

    # 6. worker supervisor task (Phase 1 idle; Phase 2 drains the queue)
    app.state.worker_task = asyncio.create_task(worker_supervisor(app.state))

    logger.info("epubtv initialized")

    try:
        yield
    finally:
        logger.info("epubtv shtting down")
        # shutdown: cancel worker, dispose engine.
        app.state.worker_task.cancel()
        with suppress(asyncio.CancelledError):
            await app.state.worker_task
        # Close the back-compat shim translation adapter (only the
        # shim — the per-dispatch adapters are owned by the
        # orchestrator and are closed per dispatch in a ``finally``).
        if isinstance(app.state.translation_port, HttpTranslationAdapter):
            await app.state.translation_port.aclose()
        await app.state.job_repo.dispose()


def create_app() -> FastAPI:
    """Construct the FastAPI app with lifespan DI + routers + envelope."""
    app = FastAPI(
        lifespan=lifespan,
        title="EPUB Translator & Voice-Over",
        version="0.1.0",
    )

    # Routers ----------------------------------------------------------------
    # Bare /health (Phase 1 liveness probe) — defined inline so its
    # unprefixed path is preserved (plan 02-03: keep bare path, add
    # /api/v1/health/nltk as a new prefixed route).
    @app.get("/health", tags=["health"])
    async def _bare_health() -> dict[str, str]:
        return {"status": "ok"}

    # Phase 2 /api/v1/health/* (D-09 etc.).
    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    app.include_router(epubs.router, prefix="/api/v1", tags=["epubs"])
    app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
    app.include_router(download.router, prefix="/api/v1", tags=["download"])
    app.include_router(providers.router, prefix="/api/v1", tags=["providers"])
    # Phase 3 / D-07: voices router (per-language TTS voice catalog).
    # Mirrors the ``providers`` registration; the SPA's
    # ``VoiceoverConfigStep`` calls ``GET /api/v1/voices`` on mount
    # to populate the voice dropdown (plan 03-04).
    app.include_router(voices.router, prefix="/api/v1", tags=["voices"])

    # Error envelope (INFRA-03) ---------------------------------------------
    app.add_exception_handler(HTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(epubs.EpubValidationError, epub_validation_handler)

    # CORS (D-03 env-gated) --------------------------------------------------
    cors_origins = settings.effective_cors_origins()
    if cors_origins is not None:
        # SECURITY: never combine ``allow_credentials=True`` with
        # ``allow_origins=["*"]`` (Security §CORS misconfiguration).
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
            allow_credentials=False,
        )

    # Static SPA mount (D-03 prod path) -------------------------------------
    if settings.serve_static:
        app.mount(
            "/",
            StaticFiles(directory=str(settings.frontend_out), html=True),
            name="spa",
        )

    return app


app = create_app()
