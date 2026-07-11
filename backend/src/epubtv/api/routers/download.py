"""Download router — F6 streaming artifact delivery (DL-01..04).

Endpoints (mounted at ``/api/v1`` in ``api/app.py``):

- ``GET /api/v1/jobs/{job_id}/download?artifact=epub|zip`` —
  streams a pre-built artifact via ``aiofiles`` 64KB chunks
  (DL-03). The artifact is pre-built by the worker at job
  completion (DL-01 single-writer seam: the worker writes,
  the router reads).

The endpoint is public (no auth) per CONTEXT.md D-04 — consistent
with the rest of the v1 single-tenant API.

Error envelopes (per ``api/error_codes.py``):

- 409 ``job_not_completed`` — job is not in ``completed`` state.
- 404 ``artifact_not_applicable`` — artifact not produced by the
  job type (e.g. ZIP on a translation-only job, EPUB on a
  voiceover-only job), or the artifact has not been pre-built yet.
- 404 ``not_found`` — ``job_id`` does not exist.

Filename: ``safe_filename(book_title, suffix, lang)`` per DL-02
(the title is sanitised; the resulting filename is a single
basename segment with no ``/`` or ``\\``). The
``Content-Disposition`` uses RFC 5987 ``filename*=UTF-8''...`` for
Unicode-safe transport.
"""

from __future__ import annotations

import urllib.parse
from pathlib import Path

import aiofiles
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from epubtv.api.error_codes import (
    ARTIFACT_NOT_APPLICABLE,
    JOB_NOT_COMPLETED,
)
from epubtv.tools.safe_filename import safe_filename

__all__ = ["router"]


router = APIRouter()

# DL-03: 64KB chunk size keeps first-byte latency low (<2s for
# ≤500 MB files) without making the request loop hot. 64KB is
# also the FastAPI/Starlette default for ``FileResponse`` so
# downstream proxies are sized for it.
_STREAM_CHUNK_BYTES = 65536


async def _stream_file(path: Path, chunk_size: int = _STREAM_CHUNK_BYTES):
    """Async generator that yields the file in ``chunk_size`` blocks."""
    async with aiofiles.open(path, "rb") as f:
        while True:
            chunk = await f.read(chunk_size)
            if not chunk:
                return
            yield chunk


def _content_disposition(filename: str) -> str:
    """Build the RFC 5987 ``Content-Disposition`` header value.

    The ``filename*=UTF-8''...`` form is preferred over the legacy
    ``filename=...`` for Unicode-safe transport: per RFC 5987 the
    ``lang`` tag (empty here) is the language of the filename
    value, and the percent-encoded form is the bytes-after-UTF-8
    encoding. For ASCII filenames it is byte-identical to the
    legacy form; for non-ASCII it preserves the bytes.
    """
    quoted = urllib.parse.quote(filename, safe="")
    return f"attachment; filename*=UTF-8''{quoted}"


def _filename_for(artifact: str, job_type: str) -> str | None:
    """Return the on-disk filename for ``artifact`` produced by ``job_type``.

    Returns ``None`` for combinations the job_type does not
    produce — the caller maps that to the 404
    ``artifact_not_applicable`` envelope. The mapping is the
    locked contract between the worker pre-build path (DL-01) and
    the download router (this module).

    Phase 4 plan 04-01 + 04-02 mapping:

    - ``translation`` + ``epub`` → ``translated.epub``
    - ``translation`` + ``zip``   → ``None`` (translation does
      not produce a ZIP)
    - ``voiceover`` + ``epub``   → ``None`` (voiceover does
      not produce an EPUB)
    - ``voiceover`` + ``zip``    → ``audio.zip``
    - ``translation+voiceover`` + ``epub`` → ``translated.epub``
      (the combined workflow pre-builds the EPUB at job
      completion; the translation leg succeeded)
    - ``translation+voiceover`` + ``zip``  → ``audio.zip``
      (the combined workflow pre-builds the ZIP at job
      completion; both legs succeeded)
    """
    if artifact == "epub":
        if job_type in {"translation", "translation+voiceover"}:
            return "translated.epub"
        return None
    # artifact == "zip"
    if job_type in {"voiceover", "translation+voiceover"}:
        return "audio.zip"
    return None


@router.get("/jobs/{job_id}/download")
async def download_artifact(
    job_id: str,
    request: Request,
    artifact: str = Query(..., pattern="^(epub|zip)$"),
) -> StreamingResponse:
    """Stream the pre-built ``artifact`` for ``job_id`` (DL-01..04).

    The worker pre-builds both artifacts at job completion; this
    endpoint resolves the path on disk + streams the bytes. The
    filename is the book's title (sanitised) + language + extension.
    """
    job_repo = request.app.state.job_repo
    artifact_dir: Path = request.app.state.artifact_dir
    epub_service = request.app.state.epub_service
    file_store = request.app.state.file_store

    job = await job_repo.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": f"job {job_id!r} not found"},
        )
    if job["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail={
                "code": JOB_NOT_COMPLETED,
                "message": (f"job {job_id!r} is {job['status']!r}; download requires 'completed'"),
                "details": {"job_id": job_id, "status": job["status"]},
            },
        )

    ext = "epub" if artifact == "epub" else "zip"
    # The on-disk filename depends on the producing workflow. The
    # translation workflow writes ``translated.epub``; the
    # voiceover workflow writes ``audio.zip``. Combined-workflow
    # (plan 04-02) writes both; that path will extend the mapping
    # with a per-job_type lookup. For Phase 4 plan 04-01 the
    # single-workflow paths are the only ones in play (combined
    # jobs still 501 from the jobs router).
    artifact_filename = _filename_for(artifact, job["job_type"])
    if artifact_filename is None:
        # The job_type does not produce the requested artifact kind.
        # This is the same envelope as a missing file, but lets the
        # caller branch on a more specific reason when they need to.
        raise HTTPException(
            status_code=404,
            detail={
                "code": ARTIFACT_NOT_APPLICABLE,
                "message": (f"job {job_id!r} ({job['job_type']!r}) has no {artifact!r} artifact"),
                "details": {
                    "job_id": job_id,
                    "job_type": job["job_type"],
                    "artifact": artifact,
                },
            },
        )
    artifact_path = artifact_dir / job_id / artifact_filename
    if not artifact_path.is_file():
        raise HTTPException(
            status_code=404,
            detail={
                "code": ARTIFACT_NOT_APPLICABLE,
                "message": (f"job {job_id!r} ({job['job_type']!r}) has no {artifact!r} artifact"),
                "details": {
                    "job_id": job_id,
                    "job_type": job["job_type"],
                    "artifact": artifact,
                },
            },
        )

    # Build the safe filename. lang = target_language for EPUB
    # (translated artifact), source_language for ZIP (spoken-audio
    # artifact). The EpubService metadata fetch is wrapped in
    # try/except for EPUBs whose metadata is unavailable
    # (defensive — should not happen for a completed job).
    lang = job["target_language"] if artifact == "epub" else job["source_language"]
    try:
        meta = await epub_service.get_metadata(job["epub_id"], file_store)
        title = meta.get("title") or "untitled"
    except Exception:
        title = "untitled"
    filename = safe_filename(str(title), suffix=ext, lang=lang or "en")

    media_type = "application/epub+zip" if ext == "epub" else "application/zip"
    return StreamingResponse(
        _stream_file(artifact_path),
        media_type=media_type,
        headers={
            "Content-Disposition": _content_disposition(filename),
            "Content-Length": str(artifact_path.stat().st_size),
        },
    )
