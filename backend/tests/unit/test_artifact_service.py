"""ArtifactBuilder unit tests (DL-01 — plan 04-01 Task 2 TDD).

Four TDD tests cover the two async methods:

1. ``test_build_translated_epub_single_chapter`` — 1 chapter →
   valid EPUB, title "My Book", 1 spine item.
2. ``test_build_translated_epub_multi_chapter`` — 3 chapters →
   valid EPUB, 3 spine items in order.
3. ``test_build_audio_zip_three_chapters`` — 3 fake WAVs → ZIP
   with 3 entries named ``chapter_{00,01,02}.wav`` (byte-identical).
4. ``test_build_audio_zip_empty_list_writes_empty_zip`` — empty
   list → valid empty ZIP (zero entries).
"""

from __future__ import annotations

import zipfile
from pathlib import Path

import pytest
from ebooklib import epub

from epubtv.application.artifact_service import ArtifactBuilder

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("DL-01-UT02")]


# ---------------------------------------------------------------------------
# build_translated_epub
# ---------------------------------------------------------------------------


async def test_build_translated_epub_single_chapter(tmp_path: Path) -> None:
    """1-chapter build: valid EPUB with the title "My Book" + 1 spine item."""
    out = tmp_path / "out.epub"
    result = await ArtifactBuilder().build_translated_epub(
        "job-1",
        {0: "<p>Hello</p>"},
        out,
        title="My Book",
    )
    assert result == out
    assert out.is_file(), f"EPUB should exist at {out}"

    # Round-trip through ebooklib: the file is a valid EPUB.
    book = epub.read_epub(str(out), options={"ignore_ncx": True})
    titles = book.get_metadata("DC", "title")
    assert titles, "EPUB must have a DC:title"
    assert str(titles[0][0]) == "My Book"

    # The spine contains exactly the single chapter item (plus the
    # ``nav`` placeholder that we add to satisfy ebooklib's
    # invariant).
    spine = list(book.spine)
    # The chapter is the non-nav item. ``EpubNav`` is a subclass of
    # ``EpubHtml`` and shares the same ``ITEM_DOCUMENT`` get_type()
    # value; filter by isinstance on ``EpubNav`` instead.
    chapter_items = [
        book.get_item_with_id(item_id)
        for item_id, _linear in spine
        if book.get_item_with_id(item_id) is not None
        and isinstance(book.get_item_with_id(item_id), epub.EpubHtml)
        and not isinstance(book.get_item_with_id(item_id), epub.EpubNav)
    ]
    assert len(chapter_items) == 1, f"expected 1 chapter, got {len(chapter_items)}"
    chapter_text = chapter_items[0].get_content().decode("utf-8")
    assert "Hello" in chapter_text, f"chapter text should contain 'Hello': {chapter_text!r}"


async def test_build_translated_epub_multi_chapter(tmp_path: Path) -> None:
    """3-chapter build: spine items in order with text Ch0/Ch1/Ch2."""
    out = tmp_path / "out.epub"
    await ArtifactBuilder().build_translated_epub(
        "job-1",
        {0: "<p>Ch0</p>", 1: "<p>Ch1</p>", 2: "<p>Ch2</p>"},
        out,
        title="Multi",
    )
    book = epub.read_epub(str(out), options={"ignore_ncx": True})
    spine = list(book.spine)
    chapter_items = [
        book.get_item_with_id(item_id)
        for item_id, _linear in spine
        if book.get_item_with_id(item_id) is not None
        and isinstance(book.get_item_with_id(item_id), epub.EpubHtml)
        and not isinstance(book.get_item_with_id(item_id), epub.EpubNav)
    ]
    assert len(chapter_items) == 3, f"expected 3 chapters, got {len(chapter_items)}"
    # Order matters: Ch0 → Ch1 → Ch2.
    expected = ["Ch0", "Ch1", "Ch2"]
    for i, item in enumerate(chapter_items):
        text = item.get_content().decode("utf-8")
        assert expected[i] in text, f"chapter {i} should contain {expected[i]!r}, got: {text!r}"


# ---------------------------------------------------------------------------
# build_audio_zip
# ---------------------------------------------------------------------------


async def test_build_audio_zip_three_chapters(tmp_path: Path) -> None:
    """3-chapter build: ZIP with 3 named entries, byte-identical to source."""
    out = tmp_path / "out.zip"
    wav_payloads = [b"WAV0", b"WAV1", b"WAV2"]
    wav_paths: list[tuple[int, Path]] = []
    for i, payload in enumerate(wav_payloads):
        p = tmp_path / f"wav_{i}.wav"
        p.write_bytes(payload)
        wav_paths.append((i, p))

    result = await ArtifactBuilder().build_audio_zip("job-1", wav_paths, out)
    assert result == out
    assert out.is_file()

    with zipfile.ZipFile(out, "r") as zf:
        names = sorted(zf.namelist())
        assert names == ["chapter_00.wav", "chapter_01.wav", "chapter_02.wav"], (
            f"unexpected entry names: {names!r}"
        )
        # Bytes are byte-identical to the source WAVs.
        for i, payload in enumerate(wav_payloads):
            with zf.open(f"chapter_{i:02d}.wav") as ef:
                assert ef.read() == payload, (
                    f"chapter_{i:02d}.wav bytes differ: expected {payload!r}"
                )


async def test_build_audio_zip_empty_list_writes_empty_zip(tmp_path: Path) -> None:
    """Empty input: a valid empty ZIP is still written (degenerate but not an error)."""
    out = tmp_path / "out.zip"
    result = await ArtifactBuilder().build_audio_zip("job-1", [], out)
    assert result == out
    assert out.is_file(), "empty-list build must still create the ZIP file"

    with zipfile.ZipFile(out, "r") as zf:
        assert zf.namelist() == [], f"empty list should produce 0 entries, got: {zf.namelist()!r}"
