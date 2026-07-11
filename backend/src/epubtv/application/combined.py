"""CombinedWorkflowService — translation+voiceover orchestrator (per-chapter gate).

CONTEXT.md D-04 / Phase 4 plan 04-02: minimal combined orchestrator
with a per-chapter ``asyncio.Event`` gate. Both legs share the same
worker (single-writer seam, ``MAX_ACTIVE=1``). The translation leg
runs first per-chapter; after each chapter's translation chunks
commit, the per-chapter event is set, unblocking the voiceover leg
for that chapter. The voiceover leg reads the TRANSLATED text from
``self._translated_chapter_texts`` (not the source text) — this is
the headline demo behaviour.

Failure modes (CONTEXT.md D-04):
- Translation leg fails on chapter N → voiceover leg never starts;
  job_state="failed"; no EPUB / ZIP pre-built.
- Voiceover leg fails after the translation leg completes → EPUB
  artifact IS pre-built (the translation succeeded); ZIP artifact
  is NOT pre-built; job_state="failed".

Artifacts pre-built only on full success (both legs complete). The
single-workflow pre-builds in ``TranslationWorkflowService`` and
``VoiceOverWorkflowService`` are GATED on
``job["job_type"] == "translation"`` and ``job["job_type"] ==
"voiceover"`` respectively — combined jobs skip the single-workflow
pre-builds because the combined workflow owns the artifact
construction (no double-builds).

Implementation note: the per-chunk loops in ``_translate_chapter``
and ``_synth_chapter`` reach into the single-workflow services'
collaborators (``_translation_port``, ``_tts_port``, ``_chunker``,
``_audio_stitcher``, ``PROVIDER_TIMEOUT_SECONDS``) instead of
calling ``translation_workflow.run`` / ``voiceover_workflow.run``.
This is intentional — the combined workflow reuses the per-chunk
collaborators without re-implementing the chunking / TTS / stitching
logic. The single underscore is a soft convention; the combined
workflow is a known internal collaborator.
"""

from __future__ import annotations

import asyncio
import io
from pathlib import Path
from typing import TYPE_CHECKING

from pydub import AudioSegment

from epubtv.application.artifact_service import ArtifactBuilder
from epubtv.domain.chunkers import SentenceChunker

if TYPE_CHECKING:
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.epub_service import EpubService
    from epubtv.application.translation_workflow import TranslationWorkflowService
    from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
    from epubtv.ports.file_store_port import FileStorePort
    from epubtv.ports.job_repo_port import JobRepoPort

__all__ = ["CombinedWorkflowService"]


class CombinedWorkflowService:
    """Combined translation+voiceover orchestrator with per-chapter gate.

    The class holds two pieces of per-run state:

    - ``_translated_chapter_texts: dict[int, str]`` — translation leg's
      accumulator. Populated by ``_translate_chapter``; consumed by
      ``_synth_chapter`` for TTS input.
    - ``_chapter_gates: dict[int, asyncio.Event]`` — per-chapter signals.
      Set by the translation leg after each chapter's chunks commit;
      awaited by the voiceover leg before consuming that chapter.

    The implementation chose ``asyncio.Event`` over
    ``asyncio.Condition`` because each event is set exactly once
    (CONTEXT.md §the agent's Discretion: "Event is enough since each
    event is set exactly once").

    Phase 1 plan 01-03 / BACK-10: the constructor grows 3 new per-provider
    subworkflow kwargs (``ollama_translation_workflow`` +
    ``openai_translation_workflow`` + ``openai_voiceover_workflow``).
    The ``run`` method reads the stored provider from the job row
    and dispatches to the matching per-provider leg. The legacy
    ``translation_workflow`` + ``voiceover_workflow`` kwargs are
    REMOVED — every call site must use the per-provider pair.
    """

    def __init__(
        self,
        *,
        ollama_translation_workflow: TranslationWorkflowService,
        openai_translation_workflow: TranslationWorkflowService,
        openai_voiceover_workflow: VoiceOverWorkflowService,
        file_store: FileStorePort,
        epub_service: EpubService,
        job_repo: JobRepoPort,
        artifact_builder: ArtifactBuilder,
        progress_bus: JobProgressBus,
        audio_dir: Path,
        artifact_dir: Path,
    ) -> None:
        self._ollama_tx = ollama_translation_workflow
        self._openai_tx = openai_translation_workflow
        self._openai_vo = openai_voiceover_workflow
        self._file_store = file_store
        self._epub_service = epub_service
        self._job_repo = job_repo
        self._artifact_builder = artifact_builder
        self._progress_bus = progress_bus
        self._audio_dir = audio_dir
        self._artifact_dir = artifact_dir
        # Per-run state. Reset on every ``run`` call.
        self._translated_chapter_texts: dict[int, str] = {}
        self._chapter_gates: dict[int, asyncio.Event] = {}
        # The active per-provider subworkflows, selected by
        # ``run`` from the stored provider on the job row. Reset on
        # every ``run`` call.
        self._tx: TranslationWorkflowService = ollama_translation_workflow
        self._vo: VoiceOverWorkflowService = openai_voiceover_workflow

    async def run(self, job_id: str) -> None:
        """Run the combined translation+voiceover workflow for ``job_id``.

        Sequence (per CONTEXT.md D-04 + plan 01-03 / BACK-10):
        1. Load the job; 404 / idempotent-reentry guards.
        2. ``update_status("running")``.
        3. **Per-provider dispatch** — read ``job["provider"]`` and
           select the matching per-provider subworkflows. The
           Ollama / OpenAI translation legs are bound to the
           matching ``TranslationPort``; the OpenAI TTS leg is
           bound to ``state.tts_port``. Phase 1 plan 01-03 / BACK-10.
        4. Load chapters via ``EpubService.chapters_for_epub``.
        5. **Translation leg** — per chapter: set the gate, translate
           per chunk, accumulate the translated text, set the event.
           On failure: ``update_status("failed")`` + provider_timeout
           envelope; early return (no voiceover, no artifacts).
        6. **Voiceover leg** — per chapter: await the gate, run
           per-sentence TTS on the TRANSLATED text, stitch WAV.
           On failure: pre-build the EPUB artifact (translation
           succeeded); ``update_status("failed")`` + provider_timeout
           envelope; early return.
        7. **Pre-build artifacts** (only on full success): call both
           ``ArtifactBuilder.build_translated_epub`` +
           ``ArtifactBuilder.build_audio_zip``. ``update_status(
           "completed")`` + terminal 6-field envelope.
        """
        job = await self._job_repo.get_job(job_id)
        if job is None:
            raise KeyError(f"job_id {job_id!r} not found")
        if job["status"] in {"completed", "failed", "cancelled"}:
            return  # idempotent re-entry
        await self._job_repo.update_status(job_id, "running")
        source_language = job["source_language"]
        target_language = job["target_language"]
        voice = job.get("voice") or "alloy"

        # Phase 1 plan 01-03 / BACK-10: select the per-provider
        # subworkflows based on the stored provider. The combined
        # orchestrator dispatches to its per-provider leg
        # internally; the orchestrator just hands off. The
        # ``provider`` column is REQUIRED for new jobs (BACK-09
        # adds the column with the per-variant
        # ``extra="forbid"`` enforcing it on the Pydantic
        # discriminated union); a None value here is a defensive
        # guard against a corrupted row.
        provider = job.get("provider")
        if provider == "ollama":
            self._tx = self._ollama_tx
            self._vo = self._openai_vo
        elif provider == "openai-compatible":
            self._tx = self._openai_tx
            self._vo = self._openai_vo
        else:
            # Defensive: should not happen (the orchestrator's 422
            # gate catches unknown providers before reaching here),
            # but raise a loud error for forward-compat.
            raise ValueError(
                f"unknown provider {provider!r} for combined workflow; "
                "expected 'ollama' or 'openai-compatible'"
            )

        # Reset per-run state.
        self._translated_chapter_texts = {}
        self._chapter_gates = {}

        chapters = await self._epub_service.chapters_for_epub(
            job["epub_id"],
            self._file_store,
            job["chapter_ids"] or None,
        )

        # ------------------------------------------------------------------
        # Translation leg — per chapter.
        # ------------------------------------------------------------------
        translation_ok = True
        for ch_idx, ch_html in chapters:
            self._chapter_gates[ch_idx] = asyncio.Event()
            try:
                translated = await self._translate_chapter(
                    job_id, ch_idx, ch_html, source_language, target_language
                )
            except Exception:
                translation_ok = False
                break
            self._translated_chapter_texts[ch_idx] = translated
            self._chapter_gates[ch_idx].set()

        if not translation_ok:
            await self._job_repo.update_status(job_id, "failed")
            self._progress_bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "translation+voiceover",
                    "chunk_id": None,
                    "progress_current": 0,
                    "progress_total": 0,
                    "status": "failed",
                    "error": "provider_timeout",
                },
            )
            return

        # ------------------------------------------------------------------
        # Voiceover leg — per chapter, gated on the per-chapter event.
        # ------------------------------------------------------------------
        voiceover_ok = True
        for ch_idx, _ch_html in chapters:
            await self._chapter_gates[ch_idx].wait()
            translated_text = self._translated_chapter_texts[ch_idx]
            try:
                await self._synth_chapter(job_id, ch_idx, translated_text, source_language, voice)
            except Exception:
                voiceover_ok = False
                break

        # ------------------------------------------------------------------
        # Pre-build artifacts.
        # ------------------------------------------------------------------
        if voiceover_ok:
            # Full success: build both artifacts.
            try:
                book_meta = await self._epub_service.get_metadata(job["epub_id"], self._file_store)
                title = book_meta.get("title") or "Translated"
                author = book_meta.get("author")
            except Exception:
                title, author = "Translated", None
            await self._artifact_builder.build_translated_epub(
                job_id,
                dict(self._translated_chapter_texts),
                self._artifact_dir / job_id / "translated.epub",
                title=str(title),
                author=str(author) if author else None,
            )
            audio_files = [
                (c, self._audio_dir / job_id / f"ch{c}.wav") for c in self._translated_chapter_texts
            ]
            await self._artifact_builder.build_audio_zip(
                job_id, audio_files, self._artifact_dir / job_id / "audio.zip"
            )
            await self._job_repo.update_status(job_id, "completed")
            self._progress_bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "translation+voiceover",
                    "chunk_id": None,
                    "progress_current": len(chapters),
                    "progress_total": len(chapters),
                    "status": "completed",
                },
            )
        else:
            # Voiceover failed: EPUB still built (translation succeeded),
            # ZIP NOT built. Job state = failed.
            try:
                book_meta = await self._epub_service.get_metadata(job["epub_id"], self._file_store)
                title = book_meta.get("title") or "Translated"
                author = book_meta.get("author")
            except Exception:
                title, author = "Translated", None
            await self._artifact_builder.build_translated_epub(
                job_id,
                dict(self._translated_chapter_texts),
                self._artifact_dir / job_id / "translated.epub",
                title=str(title),
                author=str(author) if author else None,
            )
            await self._job_repo.update_status(job_id, "failed")
            self._progress_bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "translation+voiceover",
                    "chunk_id": None,
                    "progress_current": 0,
                    "progress_total": 0,
                    "status": "failed",
                    "error": "provider_timeout",
                },
            )

    # ------------------------------------------------------------------
    # Private per-chapter loops.
    # ------------------------------------------------------------------

    async def _translate_chapter(
        self,
        job_id: str,
        ch_idx: int,
        ch_html: str,
        source_language: str,
        target_language: str,
    ) -> str:
        """Drive the translation workflow's per-chunk loop for one chapter.

        Reuses the translation workflow's collaborators + 60s timeout +
        1 retry envelope. The translated chunks are concatenated into
        a single HTML string (one chapter = one concatenated HTML block).
        """
        chunker = SentenceChunker()
        translated = ""
        chunk_objs = chunker.chunk(ch_html, source_language, ch_idx)
        for chunk in chunk_objs:
            chunk_idx = int(chunk.chunk_id.rsplit("_s", 1)[-1])
            result: str | None = None
            for attempt in (1, 2):
                try:
                    result = await asyncio.wait_for(
                        self._tx._translation_port.translate(
                            chunk.chunk_id,
                            chunk.text,
                            source_language,
                            target_language,
                        ),
                        timeout=self._tx.PROVIDER_TIMEOUT_SECONDS,
                    )
                    break
                except TimeoutError:
                    if attempt == 2:
                        await self._job_repo.append_chunk(
                            job_id,
                            ch_idx,
                            chunk_idx,
                            "failed",
                            chunk_namespace="tx",
                        )
                        raise
            if result is None:
                raise RuntimeError("translation returned None")
            await self._job_repo.append_chunk(
                job_id, ch_idx, chunk_idx, "completed", chunk_namespace="tx"
            )
            translated += result
        return translated

    async def _synth_chapter(
        self,
        job_id: str,
        ch_idx: int,
        ch_html: str,
        source_language: str,
        voice: str,
    ) -> None:
        """Drive the voiceover workflow's per-sentence TTS for one chapter.

        Reads the TRANSLATED text from the caller (the combined workflow
        has the translated text in ``self._translated_chapter_texts``).
        Per-sentence TTS + per-chapter stitching + ``register_audio_file``
        are reused from the voiceover workflow's collaborators.
        """
        chunker = self._vo._chunker
        wavs: list[bytes] = []
        sentence_chunks = chunker.chunk(ch_html, source_language, ch_idx)
        for chunk in sentence_chunks:
            chunk_idx = int(chunk.chunk_id.rsplit("_a", 1)[-1])
            result: tuple[bytes, float] | None = None
            for attempt in (1, 2):
                try:
                    result = await asyncio.wait_for(
                        self._vo._tts_port.synthesize(
                            chunk.chunk_id,
                            chunk.text,
                            source_language,
                            source_language,
                            voice,
                        ),
                        timeout=60.0,
                    )
                    break
                except TimeoutError:
                    if attempt == 2:
                        await self._job_repo.append_chunk(
                            job_id,
                            ch_idx,
                            chunk_idx,
                            "failed",
                            chunk_namespace="vo",
                        )
                        raise
            if result is None:
                raise RuntimeError("TTS returned None")
            wavs.append(result[0])
            await self._job_repo.append_chunk(
                job_id, ch_idx, chunk_idx, "completed", chunk_namespace="vo"
            )
        # Stitch the per-sentence WAVs into a single per-chapter WAV
        # (pydub concat). The D-13 per-chapter WAV file path mirrors
        # the single-workflow voiceover service: ``audio_dir / job_id
        # / ch{N}.wav``.
        if wavs:
            segments = [AudioSegment.from_wav(io.BytesIO(b)) for b in wavs]
            combined = segments[0]
            for seg in segments[1:]:
                combined += seg
            buf = io.BytesIO()
            combined.export(buf, format="wav")
            wav = buf.getvalue()
        else:
            wav = b""
        chapter_dir = self._audio_dir / job_id
        chapter_dir.mkdir(parents=True, exist_ok=True)
        wav_path = chapter_dir / f"ch{ch_idx}.wav"
        wav_path.write_bytes(wav)
        await self._job_repo.register_audio_file(job_id, ch_idx, str(wav_path), fmt="wav")
