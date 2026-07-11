"""F1 size-limit boundary tests (EPUB-01, Pitfall D — off-by-one audited).

Drives ``POST /api/v1/epubs`` via ``httpx.ASGITransport`` against the
single FastAPI app and asserts the size-cap behaviour at the 50 MB
boundary:

- 25 MB → 200 (well under cap)
- exactly 50 MB → 200 (boundary accepted)
- 50 MB + 1 byte → 413 ``file_too_large`` (off-by-one audited)
- 65 MB → 413 ``file_too_large``
- ``Content-Length`` early reject — no scratch file is written when the
  header alone signals an oversize request

The padded fixture builder is in ``tests/_helpers.py`` so the BDD tests
(Task 3) reuse the same boundary builder.
"""

from __future__ import annotations

import contextlib
import io
from pathlib import Path
from typing import Any

import httpx
import pytest

# pyrefly: ignore [missing-import]
from tests._helpers import pad_epub_bytes

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("EPUB-01-UT01")]

MAX_BYTES = 50 * 1024 * 1024


async def _post_epub(
    client: httpx.AsyncClient,
    filename: str,
    payload: bytes,
    content_length: int | None = None,
) -> httpx.Response:
    """POST ``payload`` as ``file={filename}`` to ``/api/v1/epubs``.

    When ``content_length`` is given, attach a ``Content-Length`` header
    of that size (used by the early-reject test).
    """
    files = {"file": (filename, io.BytesIO(payload), "application/octet-stream")}
    if content_length is not None:
        # httpx lets us set the Content-Length header via the request's
        # ``headers`` argument on the streaming upload.
        return await client.post(
            "/api/v1/epubs",
            files=files,
            headers={"Content-Length": str(content_length)},
        )
    return await client.post("/api/v1/epubs", files=files)


async def test_25mb_upload_ok(
    client: httpx.AsyncClient,
    fixtures_dir: Path,
    db_path: Any,
) -> None:
    """A 25 MB padded EPUB is well under the cap and returns 200."""
    base = fixtures_dir / "mystere-nocturne.epub"
    payload = pad_epub_bytes(base, 25 * 1024 * 1024)
    r = await _post_epub(client, "mystere-nocturne.epub", payload)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert "epub_id" in body
    assert isinstance(body["chapter_count"], int)


async def test_exactly_50mb_accepted(
    client: httpx.AsyncClient,
    fixtures_dir: Path,
    db_path: Any,
) -> None:
    """An exactly 50 MB EPUB is accepted (Pitfall D — off-by-one audited)."""
    base = fixtures_dir / "mystere-nocturne.epub"
    payload = pad_epub_bytes(base, MAX_BYTES)
    assert len(payload) == MAX_BYTES, (
        f"pad_epub_bytes must produce exactly {MAX_BYTES} bytes; got {len(payload)}"
    )
    r = await _post_epub(client, "mystere-nocturne.epub", payload)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"


async def test_50mb_plus_one_byte_rejected(
    client: httpx.AsyncClient,
    fixtures_dir: Path,
    db_path: Any,
) -> None:
    """A 50 MB + 1 byte upload is rejected with 413 ``file_too_large`` (off-by-one)."""
    base = fixtures_dir / "mystere-nocturne.epub"
    payload = pad_epub_bytes(base, MAX_BYTES + 1)
    r = await _post_epub(client, "mystere-nocturne.epub", payload)
    assert r.status_code == 413, f"expected 413, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["error"]["code"] == "file_too_large"


async def test_65mb_upload_rejected(
    client: httpx.AsyncClient,
    fixtures_dir: Path,
    db_path: Any,
) -> None:
    """A 65 MB upload is rejected with 413 ``file_too_large`` (EPUB-01)."""
    base = fixtures_dir / "mystere-nocturne.epub"
    payload = pad_epub_bytes(base, 65 * 1024 * 1024)
    r = await _post_epub(client, "huge-book.epub", payload)
    assert r.status_code == 413, f"expected 413, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["error"]["code"] == "file_too_large"


async def test_content_length_early_reject(
    client: httpx.AsyncClient,
    db_path: Any,
    tmp_path: Path,
) -> None:
    """A request with ``Content-Length`` over the cap short-circuits before
    the body is read (no scratch file is written).

    The route handler reads the ``Content-Length`` header first; if it
    exceeds 50 MB, the handler raises ``EpubValidationError("file_too_large")``
    immediately without reading the body or writing to scratch.
    """
    from epubtv.config import settings

    # Force a known scratch dir for this test so we can inspect it after.
    settings.scratch_dir = tmp_path / "scratch"

    # Construct a small body that, in a hypothetical world, would parse
    # fine — but the Content-Length header alone is the gate.
    payload = b"small body"
    r = await _post_epub(
        client,
        "tiny.epub",
        payload,
        content_length=65 * 1024 * 1024,
    )
    assert r.status_code == 413
    body = r.json()
    assert body["error"]["code"] == "file_too_large"
    # No scratch file written.
    scratch = settings.scratch_dir
    with contextlib.suppress(FileNotFoundError):
        # If the scratch dir was created but is empty, that's also fine.
        files = list(scratch.glob("*"))
        assert files == [], f"expected no scratch writes, found: {files}"


async def test_unpadded_epub_passes_size_check(
    client: httpx.AsyncClient,
    fixtures_dir: Path,
    db_path: Any,
) -> None:
    """The 13 KB ``mystere-nocturne.epub`` fixture (no padding) is well under
    the cap and parses cleanly — sanity check that the helper is not
    masking real parse failures for the padded tests above.
    """
    base = fixtures_dir / "mystere-nocturne.epub"
    payload = base.read_bytes()
    r = await _post_epub(client, "mystere-nocturne.epub", payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["chapter_count"] == 10
    assert len(body["chapter_ids"]) == 10
