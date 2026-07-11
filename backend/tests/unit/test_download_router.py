"""Download router unit tests (DL-01..04 — plan 04-01 Task 4 TDD).

Five TDD tests cover the streaming artifact-download endpoint:

1. ``test_download_epub_happy_path`` — pre-build the EPUB; mark the
   job completed; assert 200 + RFC 5987 ``Content-Disposition`` +
   ``Content-Type: application/epub+zip`` + the response body matches
   the prebuilt bytes.
2. ``test_download_zip_happy_path`` — pre-build the ZIP; mark the
   job completed; assert 200 + RFC 5987 ``Content-Disposition`` +
   ``Content-Type: application/zip`` + the response body matches.
3. ``test_download_returns_409_for_running_job`` — job is
   ``running``; assert 409 + ``error.code == "job_not_completed"``.
4. ``test_download_returns_404_for_zip_on_translation_job`` —
   translation job marked completed with no pre-built ZIP; assert
   404 + ``error.code == "artifact_not_applicable"``.
5. ``test_download_returns_404_for_epub_on_voiceover_job`` —
   voiceover job marked completed with no pre-built EPUB; assert
   404 + ``error.code == "artifact_not_applicable"``.

The tests bypass the full app lifespan (which would start the
worker supervisor) — instead they construct the app, manually
populate ``app.state`` with a stub ``JobRepo`` and a tmp-path
``artifact_dir``, then drive the router through ``httpx.ASGITransport``.
This keeps the test self-contained: the worker never starts, the
job state is whatever the stub returns.
"""

from __future__ import annotations

import zipfile
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
import pytest_asyncio

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("DL-01-UT04")]


# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------


class _StubJobRepo:
    """Minimal ``JobRepoPort`` stub — just enough surface for the download router.

    The router only reads ``get_job`` + ``update_status`` (not called
    here, but listed for completeness). The stub holds one job in
    memory; the test mutates ``self._status`` directly to drive the
    state transitions.
    """

    def __init__(
        self,
        *,
        job_id: str,
        job_type: str,
        status: str,
        source_language: str,
        target_language: str,
        epub_id: str,
    ) -> None:
        self._job_id = job_id
        self._row: dict[str, Any] = {
            "id": job_id,
            "job_type": job_type,
            "status": status,
            "source_language": source_language,
            "target_language": target_language,
            "epub_id": epub_id,
        }

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        return dict(self._row) if job_id == self._job_id else None

    async def update_status(self, job_id: str, status: str) -> None:
        if job_id == self._job_id:
            self._row["status"] = status


class _StubEpubService:
    """Minimal ``EpubService`` stub returning a fixed metadata dict."""

    def __init__(self, title: str = "My Book", author: str | None = "Anon") -> None:
        self._title = title
        self._author = author

    async def get_metadata(self, _epub_id: str, _file_store: Any) -> dict[str, Any]:
        return {"title": self._title, "author": self._author}


class _StubFileStore:
    """Stub ``FileStorePort`` — not used by the download router, but bound to ``app.state``."""

    async def read_epub(self, _epub_id: str) -> bytes:
        return b""


@pytest_asyncio.fixture
async def download_app(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Any:
    """Construct a FastAPI app for download-router tests with stub state.

    The lifespan is NOT entered — the worker supervisor would
    otherwise start + interfere with the stub state. The router
    only needs ``app.state.job_repo``, ``app.state.artifact_dir``,
    ``app.state.epub_service``, ``app.state.file_store`` — all
    populated manually below.
    """
    from epubtv.api.app import create_app
    from epubtv.config import settings

    artifact_dir = tmp_path / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "artifact_dir", artifact_dir)

    app = create_app()
    # Populate app.state WITHOUT entering the lifespan (which would
    # start the worker supervisor). The download router only reads
    # these four attributes.
    app.state.job_repo = SimpleNamespace()  # replaced per-test
    app.state.artifact_dir = artifact_dir
    app.state.epub_service = _StubEpubService()
    app.state.file_store = _StubFileStore()
    return app


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _bind_job(app: Any, repo: _StubJobRepo) -> None:
    """Bind a stub JobRepo to ``app.state.job_repo`` for the duration of the test."""
    app.state.job_repo = repo


# ---------------------------------------------------------------------------
# 1. EPUB happy path
# ---------------------------------------------------------------------------


async def test_download_epub_happy_path(download_app: Any, tmp_path: Path) -> None:
    """Completed translation job with a pre-built EPUB returns 200 + bytes match.

    The router resolves the artifact at
    ``{artifact_dir}/{job_id}/translated.epub``; the test pre-builds
    the file via the same path so the router reads it back.
    """
    job_id = "j-epub-1"
    repo = _StubJobRepo(
        job_id=job_id,
        job_type="translation",
        status="completed",
        source_language="en",
        target_language="en",
        epub_id="e1",
    )
    _bind_job(download_app, repo)

    artifact_path = download_app.state.artifact_dir / job_id / "translated.epub"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    payload = b"FAKE-EPUB-BYTES"
    artifact_path.write_bytes(payload)

    transport = httpx.ASGITransport(app=download_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")

    assert r.status_code == 200, r.text
    assert r.content == payload, f"body bytes mismatch: {r.content!r} != {payload!r}"
    # RFC 5987 Content-Disposition: ``My Book-en.epub`` percent-encoded.
    assert r.headers["content-disposition"] == "attachment; filename*=UTF-8''My%20Book-en.epub", (
        f"unexpected Content-Disposition: {r.headers.get('content-disposition')!r}"
    )
    assert r.headers["content-type"].startswith("application/epub+zip"), (
        f"unexpected Content-Type: {r.headers.get('content-type')!r}"
    )


# ---------------------------------------------------------------------------
# 2. ZIP happy path
# ---------------------------------------------------------------------------


async def test_download_zip_happy_path(download_app: Any) -> None:
    """Completed voiceover job with a pre-built ZIP returns 200 + bytes match."""
    job_id = "j-zip-1"
    repo = _StubJobRepo(
        job_id=job_id,
        job_type="voiceover",
        status="completed",
        source_language="en",
        target_language="en",
        epub_id="e1",
    )
    _bind_job(download_app, repo)

    artifact_path = download_app.state.artifact_dir / job_id / "audio.zip"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    # Build a small in-memory ZIP so the bytes are a real ZIP.
    buf = Path("/tmp/_test_zip_seed.bin")
    buf.write_bytes(b"")
    with zipfile.ZipFile(artifact_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("chapter_00.wav", b"wav0")
        zf.writestr("chapter_01.wav", b"wav1")
    expected_bytes = artifact_path.read_bytes()

    transport = httpx.ASGITransport(app=download_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"/api/v1/jobs/{job_id}/download?artifact=zip")

    assert r.status_code == 200, r.text
    assert r.content == expected_bytes, "ZIP body bytes must match the prebuilt file"
    assert r.headers["content-disposition"] == "attachment; filename*=UTF-8''My%20Book-en.zip", (
        f"unexpected Content-Disposition: {r.headers.get('content-disposition')!r}"
    )
    assert r.headers["content-type"].startswith("application/zip"), (
        f"unexpected Content-Type: {r.headers.get('content-type')!r}"
    )


# ---------------------------------------------------------------------------
# 3. 409 job_not_completed
# ---------------------------------------------------------------------------


async def test_download_returns_409_for_running_job(download_app: Any) -> None:
    """A ``running`` job returns 409 + ``error.code == 'job_not_completed'``."""
    job_id = "j-running-1"
    repo = _StubJobRepo(
        job_id=job_id,
        job_type="translation",
        status="running",
        source_language="en",
        target_language="en",
        epub_id="e1",
    )
    _bind_job(download_app, repo)

    transport = httpx.ASGITransport(app=download_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")

    assert r.status_code == 409, r.text
    body = r.json()
    assert body["error"]["code"] == "job_not_completed", f"unexpected error code: {body!r}"


# ---------------------------------------------------------------------------
# 4. 404 artifact_not_applicable: ZIP on a translation job
# ---------------------------------------------------------------------------


async def test_download_returns_404_for_zip_on_translation_job(download_app: Any) -> None:
    """Translation job without a pre-built ZIP returns 404 ``artifact_not_applicable``."""
    job_id = "j-trans-nozip-1"
    repo = _StubJobRepo(
        job_id=job_id,
        job_type="translation",
        status="completed",
        source_language="en",
        target_language="en",
        epub_id="e1",
    )
    _bind_job(download_app, repo)
    # Do NOT pre-build the ZIP — the file does not exist on disk.

    transport = httpx.ASGITransport(app=download_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"/api/v1/jobs/{job_id}/download?artifact=zip")

    assert r.status_code == 404, r.text
    body = r.json()
    assert body["error"]["code"] == "artifact_not_applicable", f"unexpected error code: {body!r}"


# ---------------------------------------------------------------------------
# 5. 404 artifact_not_applicable: EPUB on a voiceover job
# ---------------------------------------------------------------------------


async def test_download_returns_404_for_epub_on_voiceover_job(download_app: Any) -> None:
    """Voiceover job without a pre-built EPUB returns 404 ``artifact_not_applicable``."""
    job_id = "j-vo-noepub-1"
    repo = _StubJobRepo(
        job_id=job_id,
        job_type="voiceover",
        status="completed",
        source_language="en",
        target_language="en",
        epub_id="e1",
    )
    _bind_job(download_app, repo)
    # Do NOT pre-build the EPUB.

    transport = httpx.ASGITransport(app=download_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"/api/v1/jobs/{job_id}/download?artifact=epub")

    assert r.status_code == 404, r.text
    body = r.json()
    assert body["error"]["code"] == "artifact_not_applicable", f"unexpected error code: {body!r}"
