"""EpubService unit tests (F1 metadata + canonical chapter rule + perf).

Behaviour contract (PLAN §01-02 Task 2 — 6 behaviours):

- ``test_valid_epub_returns_metadata`` — ``mystere-nocturne.epub`` parses
  with a non-empty title, author, declared_languages containing ``"fr"``,
  ``chapter_count >= 8`` (exact count depends on fixture; 10 expected),
  ``chapter_ids`` shape ``["chapter_1", ...]``.

- ``test_canonical_chapter_rule_excludes_blank_spine_items`` —
  ``long-series.epub`` returns ``chapter_count == 120`` exactly
  (spine ``ITEM_DOCUMENT`` with non-empty stripped text; Pitfall E /
  Pitfall 13).

- ``test_multi_language_epub_declares_both`` — ``bilingual-reader.epub``
  returns ``declared_languages == ["fr", "en"]`` (F1 @integration
  multi-language).

- ``test_anonymous_epub_returns_empty_title_author`` — ``anonymous.epub``
  returns ``title is None``, ``author is None``, ``chapter_count`` numeric
  and ``> 0`` (F1 @api "EPUB missing optional metadata").

- ``test_invalid_epub_raises`` — parsing a non-EPUB ZIP / corrupted bytes
  raises ``EpubValidationError(code="invalid_epub", status_code=422)``
  (EPUB-02).

- ``test_parse_under_3s`` — parsing ``long-series.epub`` (120 chapters)
  completes in ``< 3.0`` s wall-clock (EPUB-03).

These tests drive ``EpubService`` directly (not via HTTP) — the route
layer is exercised in ``test_size_limit.py`` and the BDD layer in Task 3.
"""

from __future__ import annotations

import io
import os
import time
import zipfile
from pathlib import Path

import pytest

from epubtv.adapters.storage.local_file_store import LocalFileStore
from epubtv.application.epub_service import EpubService, EpubValidationError

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.tcid("EPUB-02-UT02"),
    pytest.mark.tcid("EPUB-03-UT03"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _validate(fixtures_dir: Path, name: str, tmp_path: Path):
    """Read the named fixture and run ``EpubService.validate_and_extract``."""
    store = LocalFileStore(scratch_dir=tmp_path / "scratch")
    svc = EpubService()
    payload = (fixtures_dir / name).read_bytes()
    return await svc.validate_and_extract(
        epub_bytes=payload, original_filename=name, file_store=store
    )


# ---------------------------------------------------------------------------
# Behaviour tests
# ---------------------------------------------------------------------------


async def test_valid_epub_returns_metadata(fixtures_dir: Path, tmp_path: Path) -> None:
    """``mystere-nocturne.epub`` parses with the locked field shape."""
    resp = await _validate(fixtures_dir, "mystere-nocturne.epub", tmp_path)
    assert resp.title, "expected non-empty title"
    assert resp.author, "expected non-empty author"
    assert "fr" in resp.declared_languages
    # Plan says ~10 chapters (the fixture has exactly 10). We assert >= 8 to
    # tolerate future fixture tweaks, and we also assert the exact count to
    # catch silent spine-rule regressions.
    assert resp.chapter_count == 10
    assert resp.chapter_ids == [f"chapter_{i + 1}" for i in range(10)]


async def test_canonical_chapter_rule_excludes_blank_spine_items(
    fixtures_dir: Path, tmp_path: Path
) -> None:
    """``long-series.epub`` returns ``chapter_count == 120`` exactly."""
    resp = await _validate(fixtures_dir, "long-series.epub", tmp_path)
    assert resp.chapter_count == 120, (
        f"canonical chapter rule broken: expected 120, got {resp.chapter_count} "
        f"(spine should have 120 ITEM_DOCUMENT with non-empty text)"
    )
    assert len(resp.chapter_ids) == 120
    assert resp.chapter_ids[0] == "chapter_1"
    assert resp.chapter_ids[-1] == "chapter_120"


async def test_multi_language_epub_declares_both(fixtures_dir: Path, tmp_path: Path) -> None:
    """``bilingual-reader.epub`` declares both ``fr`` and ``en``."""
    resp = await _validate(fixtures_dir, "bilingual-reader.epub", tmp_path)
    assert "fr" in resp.declared_languages
    assert "en" in resp.declared_languages
    # Order is the order ebooklib preserves — we don't assert it, just
    # that both are present.
    assert len(resp.declared_languages) == 2


async def test_anonymous_epub_returns_empty_title_author(
    fixtures_dir: Path, tmp_path: Path
) -> None:
    """``anonymous.epub`` has no ``dc:title`` / ``dc:creator`` → empty fields."""
    resp = await _validate(fixtures_dir, "anonymous.epub", tmp_path)
    assert resp.title is None
    assert resp.author is None
    assert isinstance(resp.chapter_count, int)
    assert resp.chapter_count > 0


async def test_invalid_epub_raises(tmp_path: Path) -> None:
    """A non-EPUB ZIP and corrupted bytes both raise ``EpubValidationError``."""
    # Case 1: a plain ZIP that is not a valid EPUB package.
    plain_zip = tmp_path / "fake.epub"
    with zipfile.ZipFile(plain_zip, "w") as zf:
        zf.writestr("readme.txt", b"this is not an epub")
    store = LocalFileStore(scratch_dir=tmp_path)
    svc = EpubService()
    with pytest.raises(EpubValidationError) as excinfo:
        await svc.validate_and_extract(
            epub_bytes=plain_zip.read_bytes(),
            original_filename="fake.epub",
            file_store=store,
        )
    assert excinfo.value.code == "invalid_epub"
    assert excinfo.value.status_code == 422

    # Case 2: random bytes that are not a ZIP at all.
    with pytest.raises(EpubValidationError) as excinfo:
        await svc.validate_and_extract(
            epub_bytes=os.urandom(2 * 1024 * 1024),
            original_filename="broken.epub",
            file_store=store,
        )
    assert excinfo.value.code == "invalid_epub"
    assert excinfo.value.status_code == 422


async def test_parse_under_3s(fixtures_dir: Path, tmp_path: Path) -> None:
    """``long-series.epub`` (120 chapters) parses in under 3.0s (EPUB-03)."""
    payload = (fixtures_dir / "long-series.epub").read_bytes()
    store = LocalFileStore(scratch_dir=tmp_path / "scratch")
    svc = EpubService()
    start = time.perf_counter()
    resp = await svc.validate_and_extract(
        epub_bytes=payload,
        original_filename="long-series.epub",
        file_store=store,
    )
    elapsed = time.perf_counter() - start
    assert resp.chapter_count == 120
    assert elapsed < 3.0, f"parse took {elapsed:.3f}s, expected < 3.0s (EPUB-03 budget)"


# ---------------------------------------------------------------------------
# Metadata sanitisation (Security V12 / polyglot HTML)
# ---------------------------------------------------------------------------


async def test_metadata_sanitises_angle_brackets(fixtures_dir: Path, tmp_path: Path) -> None:
    """``<`` and ``>`` are stripped from title / author before return (V12)."""
    # Build an EPUB with a malicious title in-memory.
    from ebooklib import epub

    book = epub.EpubBook()
    book.set_identifier("sanitise-test")
    book.set_title("Hello <script>alert(1)</script>")
    book.add_author("<img onerror=x>Author")
    book.add_metadata("DC", "language", "fr")
    ch = epub.EpubHtml(title="Ch1", file_name="ch1.xhtml", lang="fr")
    ch.content = b"<html><body><h1>Ch1</h1><p>text</p></body></html>"
    book.add_item(ch)
    book.toc = (ch,)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = [ch]
    buf = io.BytesIO()
    epub.write_epub(buf, book, {})

    store = LocalFileStore(scratch_dir=tmp_path / "scratch")
    svc = EpubService()
    resp = await svc.validate_and_extract(
        epub_bytes=buf.getvalue(),
        original_filename="xss.epub",
        file_store=store,
    )
    assert resp.title is not None
    assert "<" not in resp.title
    assert ">" not in resp.title
    assert resp.author is not None
    assert "<" not in resp.author
    assert ">" not in resp.author
