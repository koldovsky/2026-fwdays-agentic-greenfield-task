"""ArtifactBuilder — worker-invoked artifact pre-builder (DL-01 single-writer seam).

The ``TranslationWorkflowService`` calls :meth:`build_translated_epub`
at job completion; the ``VoiceOverWorkflowService`` calls
:meth:`build_audio_zip`. The :class:`DownloadRouter` reads the
prebuilt files from ``{artifact_dir}/{job_id}/`` — it does NOT
build anything.

Why the pre-build is the worker's job and NOT the download endpoint
(DL-01): the worker holds the only ``MAX_ACTIVE=1`` slot; building
the artifact inline at the request would couple download latency to
the worker's progress, and a concurrent download + worker collision
on a shared file would race. Pre-build on the job-completion
transition is the single-writer seam.

The class is a stateless function-holder: it carries no constructor
args and no per-instance state. Both methods are ``async`` for
Future-Proof Seam (#2056) — the current implementation is
sync-but-async-wrapped (the sync I/O is fast for the sprint
artifact sizes), but the signature lets a future phase swap in
real async I/O without changing the call sites.
"""

from __future__ import annotations

import zipfile
from pathlib import Path
from typing import Any

__all__ = ["ArtifactBuilder"]


class ArtifactBuilder:
    """Worker-invoked artifact pre-builder (DL-01 single-writer seam)."""

    async def build_translated_epub(
        self,
        job_id: str,
        chapter_texts: dict[int, str],
        output_path: Path,
        *,
        title: str = "Translated",
        author: str | None = None,
    ) -> Path:
        """Write a valid EPUB to ``output_path`` with the chapter texts in the spine.

        Parameters
        ----------
        job_id:
            The job id; used as the EPUB identifier so the result is
            traceable back to the worker.
        chapter_texts:
            ``{chapter_idx: translated_html_str}``. The chapter order
            in the spine is the sorted key order. Each value is the
            concatenated translated chunks for that chapter (the
            mock-translator preserves HTML structure, so each value
            is a valid HTML fragment).
        output_path:
            The destination path. Parent dirs are created on demand.
        title, author:
            Dublin Core metadata for the output EPUB. Defaults are
            the F1 upload fallback (``"Translated"``, ``None``).

        Returns
        -------
        Path
            ``output_path`` (so callers can chain).
        """
        # Imports are kept inside the function body because the
        # module is loaded at app startup; ebooklib is heavy and we
        # do NOT want the import cost on the fast path.
        from ebooklib import epub

        output_path.parent.mkdir(parents=True, exist_ok=True)

        book = epub.EpubBook()
        book.set_identifier(f"epubtv-{job_id}")
        book.set_title(title)
        if author:
            book.add_author(author)
        book.set_language("en")

        chapters: list[Any] = []
        for ch_idx in sorted(chapter_texts.keys()):
            html = f"<html><body>{chapter_texts[ch_idx]}</body></html>"
            ch = epub.EpubHtml(
                title=f"Chapter {ch_idx + 1}",
                file_name=f"chap_{ch_idx:02d}.xhtml",
                lang="en",
                content=html,
            )
            book.add_item(ch)
            chapters.append(ch)

        book.toc = tuple(chapters)
        book.spine = ["nav", *chapters]
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        epub.write_epub(str(output_path), book, {})
        return output_path

    async def build_audio_zip(
        self,
        job_id: str,
        audio_files: list[tuple[int, Path]],
        output_path: Path,
    ) -> Path:
        """Write a ZIP of per-chapter WAVs to ``output_path``.

        The ZIP entries are named ``chapter_{NN:02d}.wav`` where
        ``NN`` is the zero-padded chapter index from each
        ``audio_files`` entry. The bytes are copied verbatim from
        the source paths.

        An empty ``audio_files`` list still produces a valid empty
        ZIP (zero entries). This matches the
        ``AudioStitcher.stitch([]) → b""`` degenerate case so a
        voiceover job with no chapters (should not happen in
        practice, but the seam is exercised by the unit test) does
        NOT crash the job-completion path.

        Parameters
        ----------
        job_id:
            The job id; unused by the ZIP itself (the artifact_dir
            is the on-disk namespace) but kept in the signature for
            future audit-log seams.
        audio_files:
            ``[(chapter_idx, wav_path), ...]``. Order is the
            ``audio_files`` table order (chapter ASC); the method
            sorts by ``chapter_idx`` to be defensive against
            caller-side ordering drift.
        output_path:
            The destination path. Parent dirs are created on demand.

        Returns
        -------
        Path
            ``output_path``.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for ch_idx, wav_path in sorted(audio_files, key=lambda x: x[0]):
                zf.write(wav_path, f"chapter_{ch_idx:02d}.wav")
        return output_path
