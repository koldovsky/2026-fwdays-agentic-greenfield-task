"""JobOrchestrator — ``job_type`` + per-provider subworkflow dispatch (D-05 + D-11 + D-12 + BACK-10).

The orchestrator wraps one workflow per (job_type, provider) pair
read from the persisted job row. Phase 2 wired:
- ``translation`` → ``TranslationWorkflowService.run``
- ``voiceover`` / ``translation+voiceover`` → 501
  ``phase_not_yet_implemented`` (D-05; voiceover / combined land in
  Phase 3 / Phase 4).
- unknown job_type → 422 ``validation_error`` (defensive against a
  corrupted row).

Phase 3 / D-11 changes the voiceover branch:
- ``voiceover`` → ``VoiceOverWorkflowService.run`` (NEW — was 501
  in Phase 2).

Phase 4 / plan 04-02 (D-12 follow-up) wires the combined-workflow
branch:
- ``translation+voiceover`` → ``CombinedWorkflowService.run`` (NEW
  — was 501 in Phase 3). The 501 is REMOVED entirely; the body now
  reaches ``CombinedWorkflowService.run`` via the worker dispatch
  table in ``application/worker_queue.py``.

Phase 1 plan 01-03 / BACK-10: per-provider subworkflow dispatch.
The orchestrator reads ``job["provider"]`` from the row and routes
to the matching subworkflow (the per-provider binding is a
constructor concern; the workflow services stay unaware of provider
names). The 6-branch dispatch table:
- ``("translation", "ollama")`` → fresh ``TranslationWorkflowService``
  bound to a per-dispatch ``OllamaHttpTranslationAdapter`` (TRAN-02).
- ``("translation", "openai-compatible")`` → fresh
  ``TranslationWorkflowService`` bound to a per-dispatch
  ``OpenAIHttpTranslationAdapter`` (TRAN-02).
- ``("voiceover", "openai-compatible")`` → fresh
  ``VoiceOverWorkflowService`` bound to a per-dispatch
  ``OpenAIHttpTTSAdapter`` (TTS-02).
- ``("voiceover", "ollama")`` → 422 ``validation_error`` (Ollama has no
  TTS endpoint per PRD §6)
- ``("translation+voiceover", "ollama")`` → fresh
  ``CombinedWorkflowService`` (Ollama leg) — built with 3 per-dispatch
  subworkflows (Ollama + OpenAI translation + OpenAI voiceover).
- ``("translation+voiceover", "openai-compatible")`` → fresh
  ``CombinedWorkflowService`` (OpenAI leg) — same shape.
- unknown ``provider`` → 422 ``validation_error``
- legacy row with ``provider=NULL, model=NULL`` → 422
  ``validation_error`` ("job row missing required provider/model
  columns; re-create the job") — the legacy rows are not
  retroactively migrated; new jobs always carry the columns per
  BACK-09.

Quick 260709-bso: per-dispatch adapter construction. The orchestrator
instantiates a fresh translation + TTS adapter for every dispatch
(``base_url=`` from the lifespan's per-provider URL surface;
``model=`` from ``job["model"]``; TTS ``voice=`` from
``job["voice"]`` or the lifespan's ``default_voice``). The
per-dispatch adapters are closed in a ``finally`` block so the
HTTP transport (httpx client / openai.AsyncOpenAI /
ollama.AsyncClient) is released cleanly. The previous "shared
singleton + ``adapter._model = model`` mutation" pattern (quick
260709-lifespan) is removed: two concurrent jobs under
``WORKER_MAX_ACTIVE=3`` hardening now get independent adapters
and never race on the model attribute.

The orchestrator's only job is the ``(job_type, provider)`` branch;
the per-chunk loop lives in the workflow service. The router in
plan 02-03 catches the 501 exception via the registered
``HTTPException`` envelope handler.
"""

from __future__ import annotations

import logging
import pathlib
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException

from epubtv.ports.job_repo_port import JobRepoPort

if TYPE_CHECKING:
    from epubtv.adapters.audio.audio_stitcher import AudioStitcher
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.combined import CombinedWorkflowService
    from epubtv.application.epub_service import EpubService
    from epubtv.application.translation_workflow import TranslationWorkflowService
    from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
    from epubtv.ports.file_store_port import FileStorePort


logger = logging.getLogger("epubtv.application.job_orchestrator")


class JobOrchestrator:
    """Dispatch a job to the per-provider subworkflow matching its row (D-05 + D-11 + D-12 + BACK-10).

    The constructor stores per-dispatch config — adapter classes,
    base URLs, the default voice — plus a small set of collaborators
    the workflow services need (job_repo, progress_bus, epub_service,
    file_store, audio_stitcher, audio_dir, artifact_dir). The
    translation + TTS adapters are NOT stored on the instance:
    they are constructed per dispatch and closed in a ``finally``
    block, so two concurrent jobs under ``WORKER_MAX_ACTIVE=3``
    hardening can use different models / voices without a race
    condition (quick 260709-bso).
    """

    def __init__(
        self,
        *,
        job_repo: JobRepoPort,
        translation_adapter_classes: dict[str, type],
        translation_base_urls: dict[str, str],
        tts_adapter_class: type,
        tts_base_url: str,
        default_voice: str,
        progress_bus: JobProgressBus,
        epub_service: EpubService,
        file_store: FileStorePort,
        audio_stitcher: AudioStitcher,
        audio_dir: pathlib.Path,
        artifact_dir: pathlib.Path,
    ) -> None:
        self._job_repo = job_repo
        # Per-dispatch config: the lifespan wires the classes + base
        # URLs (stable per-process), the orchestrator reads them and
        # constructs a fresh adapter for every dispatch (so two
        # concurrent jobs can use different models / voices without a
        # race condition on ``_model`` / ``_voice``).
        self._translation_adapter_classes = translation_adapter_classes
        self._translation_base_urls = translation_base_urls
        self._tts_adapter_class = tts_adapter_class
        self._tts_base_url = tts_base_url
        self._default_voice = default_voice
        # Workflow collaborators — same set as the previous plan's
        # ``_build_orchestrator`` body, minus the per-provider
        # subworkflows (the orchestrator now builds them per
        # dispatch).
        self._progress_bus = progress_bus
        self._epub_service = epub_service
        self._file_store = file_store
        self._audio_stitcher = audio_stitcher
        self._audio_dir = audio_dir
        self._artifact_dir = artifact_dir

    # ------------------------------------------------------------------
    # Per-dispatch workflow builders (mirror the previous
    # ``_build_orchestrator`` body shape — chunker is
    # ``SentenceChunker()`` for translation / ``CharacterChunker()``
    # for voiceover).
    # ------------------------------------------------------------------

    def _build_translation_workflow(self, translation_port: Any) -> TranslationWorkflowService:
        """Build a fresh ``TranslationWorkflowService`` bound to ``translation_port``.

        The chunker is ``SentenceChunker()`` (D-04 namespace
        ``tx_ch{N}_s{M}``). The collaborators are read from the
        orchestrator's constructor kwargs (set by the lifespan via
        ``_build_orchestrator``).
        """
        from epubtv.application.translation_workflow import TranslationWorkflowService
        from epubtv.domain.chunkers import SentenceChunker

        return TranslationWorkflowService(
            job_repo=self._job_repo,
            translation_port=translation_port,
            progress_bus=self._progress_bus,
            chunker=SentenceChunker(),
            epub_service=self._epub_service,
            file_store=self._file_store,
            artifact_dir=self._artifact_dir,
        )

    def _build_voiceover_workflow(self, tts_port: Any) -> VoiceOverWorkflowService:
        """Build a fresh ``VoiceOverWorkflowService`` bound to ``tts_port``.

        The chunker is ``CharacterChunker()`` (D-04 namespace
        ``vo_ch{N}_a{M}``). The combined workflow's voiceover leg
        reaches into ``self._vo._chunker`` so the chunker must
        match.
        """
        from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
        from epubtv.domain.chunkers import CharacterChunker

        return VoiceOverWorkflowService(
            job_repo=self._job_repo,
            tts_port=tts_port,
            progress_bus=self._progress_bus,
            chunker=CharacterChunker(),
            epub_service=self._epub_service,
            file_store=self._file_store,
            audio_stitcher=self._audio_stitcher,
            audio_dir=self._audio_dir,
            artifact_dir=self._artifact_dir,
        )

    def _build_combined_workflow(
        self, translation_port: Any, tts_port: Any
    ) -> CombinedWorkflowService:
        """Build a fresh ``CombinedWorkflowService`` with 3 per-dispatch subworkflows.

        The combined workflow owns 3 per-provider subworkflows
        (Ollama translation + OpenAI translation + OpenAI
        voiceover); only the active leg selected by
        ``job["provider"]`` runs, but the combined workflow's
        constructor holds all three. The subworkflows are built
        with per-dispatch adapters so two concurrent jobs do not
        share an HTTP client.
        """
        from epubtv.application.artifact_service import ArtifactBuilder
        from epubtv.application.combined import CombinedWorkflowService

        ollama_translation_workflow = self._build_translation_workflow(translation_port)
        openai_translation_workflow = self._build_translation_workflow(translation_port)
        openai_voiceover_workflow = self._build_voiceover_workflow(tts_port)
        return CombinedWorkflowService(
            ollama_translation_workflow=ollama_translation_workflow,
            openai_translation_workflow=openai_translation_workflow,
            openai_voiceover_workflow=openai_voiceover_workflow,
            file_store=self._file_store,
            epub_service=self._epub_service,
            job_repo=self._job_repo,
            artifact_builder=ArtifactBuilder(),
            progress_bus=self._progress_bus,
            audio_dir=self._audio_dir,
            artifact_dir=self._artifact_dir,
        )

    async def dispatch(self, job_id: str, job_type: str) -> None:
        """Run the per-provider subworkflow for ``(job_id, job_type)``.

        Reads ``job["provider"]`` from the row; branches on the
        ``(job_type, provider)`` pair. The 6-branch dispatch table
        is documented in the module docstring. The translation +
        TTS adapters are constructed per dispatch from the
        constructor's classes + base URLs + ``job["model"]`` /
        ``job["voice"]``; they are closed in a ``finally`` block
        so the HTTP transport is released cleanly.
        """

        logger.debug("JobOrchestrator.dispatch entry job_id=%s job_type=%s", job_id, job_type)
        # 1. Load the job row to discover the stored provider + model + voice.
        job = await self._job_repo.get_job(job_id)
        if job is None:
            raise KeyError(f"job_id {job_id!r} not found")
        provider = job.get("provider")
        model = job.get("model")
        voice = job.get("voice") or self._default_voice

        # 2. Legacy row check: a v1.1-style row has provider=NULL +
        # model=NULL. The migration (BACK-09) is additive; legacy
        # rows are loadable but undispatchable. Return 422 instead of
        # silently picking a default (loud failure — the user must
        # re-create the job).
        if provider is None or model is None:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "validation_error",
                    "message": (
                        "job row missing required provider/model columns; re-create the job"
                    ),
                    "details": {"job_id": job_id},
                },
            )

        # 2b. Pre-flight provider gate. Reject ``("voiceover",
        # "ollama")`` early (Ollama has no TTS endpoint per PRD §6)
        # so the orchestrator does NOT construct a TTS adapter
        # that would not be used. Reject unknown providers
        # regardless of ``job_type`` (defensive guard against a
        # corrupted row).
        if job_type == "voiceover" and provider == "ollama":
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "validation_error",
                    "message": (
                        "TTS provider ollama is not supported; "
                        "the only supported TTS provider is openai-compatible"
                    ),
                    "details": {"provider": provider},
                },
            )
        if (
            job_type in ("translation", "translation+voiceover")
            and provider not in self._translation_adapter_classes
        ):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "validation_error",
                    "message": f"unknown provider {provider!r} for job_type {job_type!r}",
                    "details": {"provider": provider, "job_type": job_type},
                },
            )

        # 3. Per-dispatch adapter construction. The lifespan wires
        # the adapter classes + per-provider base URLs (stable
        # per-process); the orchestrator instantiates a fresh
        # adapter with the row's stored model (translation + TTS)
        # + voice (TTS) on every dispatch, and closes the adapter
        # in a ``finally`` block. This replaces the previous
        # "shared singleton + ``adapter._model = model`` mutation"
        # pattern (quick 260709-lifespan) so two concurrent jobs
        # under ``WORKER_MAX_ACTIVE=3`` hardening never race on
        # the model / voice attribute.
        translation_port: Any = None
        tts_port: Any = None
        try:
            if job_type in ("translation", "translation+voiceover"):
                adapter_cls = self._translation_adapter_classes.get(provider)
                base_url = self._translation_base_urls.get(provider)
                # ``adapter_cls`` / ``base_url`` are guaranteed to be
                # non-None by the 2b pre-flight gate above.
                assert adapter_cls is not None and base_url is not None
                translation_port = adapter_cls(base_url=base_url, model=model)
            if job_type in ("voiceover", "translation+voiceover"):
                tts_port = self._tts_adapter_class(
                    base_url=self._tts_base_url,
                    model=model,
                    voice=voice,
                )

            # 4. Branch on (job_type, provider) and run the
            # matching per-dispatch workflow.
            if job_type == "translation":
                workflow = self._build_translation_workflow(translation_port)
                await workflow.run(job_id)
                return
            if job_type == "voiceover":
                # TTS is OpenAI-only per TTS-02; one branch.
                workflow = self._build_voiceover_workflow(tts_port)
                await workflow.run(job_id)
                return
            if job_type == "translation+voiceover":
                workflow = self._build_combined_workflow(translation_port, tts_port)
                await workflow.run(job_id)
                return

            # Defensive: unknown job_type (the ``job_type`` field
            # is gated by the Pydantic discriminated union at the
            # router, so reaching here means a corrupted row).
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "validation_error",
                    "message": f"unknown job_type {job_type!r}",
                    "details": {"job_type": job_type, "provider": provider},
                },
            )
        finally:
            # Release the per-dispatch HTTP transports. The
            # ``aclose()`` methods are idempotent (httpx /
            # openai / ollama all guarantee it).
            if translation_port is not None:
                try:
                    await translation_port.aclose()
                except Exception as exc:  # pragma: no cover - defensive
                    logger.warning(
                        "translation adapter aclose failed job_id=%s error=%s",
                        job_id,
                        exc,
                    )
            if tts_port is not None:
                try:
                    await tts_port.aclose()
                except Exception as exc:  # pragma: no cover - defensive
                    logger.warning(
                        "tts adapter aclose failed job_id=%s error=%s",
                        job_id,
                        exc,
                    )


__all__ = ["JobOrchestrator"]
