"""EpubService.resolve_voiceover_language unit tests (Task 4 TDD cycle).

Satisfies D-08 (first-spine language resolution):
- 0 declared languages → ``None`` (router raises 422).
- 1 declared language → that language.
- ≥2 declared languages → first spine-ordered chapter's
  ``xml:lang`` (EPUB 3 standard) or ``lang`` (HTML fallback).
- ≥2 declared but no chapter carries an ``xml:lang`` → fallback
  to ``declared[0]``.

The test fixtures build synthetic EPUBs in-memory using ebooklib's
``EpubBook`` + ``EpubHtml(lang=...)`` API + ``epub.write_epub`` so
the round-trip preserves the per-chapter ``xml:lang`` attribute.
The ``file_store`` is a tiny in-memory fake (``read_epub`` returns
the pre-built bytes) so the test does not touch the filesystem.
"""

from __future__ import annotations

import io
import zipfile

import pytest
from ebooklib import epub

from epubtv.application.epub_service import EpubService

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-02-UT08")]


# ---------------------------------------------------------------------------
# Synthetic EPUB builders
# ---------------------------------------------------------------------------


def _build_epub(
    *,
    declared_languages: list[str],
    chapter_langs: list[str | None] | None = None,
) -> bytes:
    """Build a minimal EPUB 3 archive in memory.

    Uses ebooklib's API (EpubBook + EpubHtml) + ``epub.write_epub``
    so the per-chapter ``xml:lang`` is preserved across the
    write-read round-trip (manual XML gets normalised by ebooklib
    and the per-chapter attribute is overwritten with the first
    declared language — see the test history).

    - ``declared_languages``: list of ``<dc:language>`` values on
      the OPF package metadata.
    - ``chapter_langs``: optional per-chapter ``lang`` argument
      (EPUB 3 standard) for each chapter XHTML. ``None`` entries
      emit chapters without a per-chapter language. Defaults to
      ``[None] * max(len(declared_languages), 1)``.

    The EPUB has exactly ``len(chapter_langs)`` ``EpubHtml`` items
    in the spine, each carrying a unique ``id`` and a tiny body.
    The ``EpubNav`` is omitted to keep the spine purely
    chapter-driven.
    """
    chapters = chapter_langs or [None] * max(len(declared_languages), 1)

    book = epub.EpubBook()
    book.set_identifier(f"test-{id(chapters)}")
    book.set_title("Test EPUB")
    for lang in declared_languages:
        book.set_language(lang)

    items: list[epub.EpubHtml] = []
    for idx, chap_lang in enumerate(chapters, start=1):
        ch = epub.EpubHtml(
            title=f"Chapter {idx}",
            file_name=f"chap_{idx}.xhtml",
            lang=chap_lang or "",
        )
        ch.content = (
            f'<html xmlns="http://www.w3.org/1999/xhtml">'
            f"<head><title>Chapter {idx}</title></head>"
            f"<body><p>Chapter {idx} content.</p></body>"
            f"</html>"
        )
        book.add_item(ch)
        items.append(ch)

    # Add the EPUB 3 navigation document (required by ebooklib's
    # reader — without it, ``epub.read_epub`` raises on the missing
    # NCX/nav file referenced from the spine).
    nav = epub.EpubNav()
    book.add_item(nav)

    # Spine: nav first, then the chapters (EPUB 3 convention).
    book.toc = ()
    book.spine = ["nav", *items]

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def _build_epub_with_lang_attr_only(chapter_lang: str) -> bytes:
    """Build an EPUB 3 archive where the chapter carries only ``lang`` (no ``xml:lang``).

    ebooklib always sets BOTH ``xml:lang`` and ``lang`` on the
    chapter root when ``EpubHtml(lang=...)`` is provided, so this
    helper injects the chapter content as raw XHTML after the
    ``epub.write_epub`` round-trip to drop the ``xml:lang``
    attribute. The test then asserts the resolver's
    ``lang``-attribute fallback path.
    """
    book = epub.EpubBook()
    book.set_identifier("test-lang-attr-fallback")
    book.set_title("Test Lang Fallback")
    book.set_language("en")
    book.set_language("fr")

    ch = epub.EpubHtml(
        title="Chapter 1",
        file_name="chap_1.xhtml",
        lang="fr",
    )
    # Inject the chapter content WITH ONLY ``lang`` (no ``xml:lang``).
    # ebooklib will write its own attributes; we override the
    # chapter's content post-write by patching the EpubHtml in place.
    ch.content = (
        '<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">'
        "<head><title>Chapter 1</title></head>"
        "<body><p>Chapter 1 content.</p></body>"
        "</html>"
    )
    book.add_item(ch)
    nav = epub.EpubNav()
    book.add_item(nav)
    book.toc = ()
    book.spine = ["nav", ch]

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


class _FakeFileStore:
    """Minimal in-memory ``FileStorePort`` for the resolver tests.

    Pre-loads the synthesized EPUB bytes so ``read_epub`` returns
    the archive directly. The interface mirrors ``LocalFileStore``.
    """

    def __init__(self, epub_bytes: bytes) -> None:
        self._epub_bytes = epub_bytes

    async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
        return "fake-epub-id"

    async def read_epub(self, epub_id: str) -> bytes:
        return self._epub_bytes

    async def delete_epub(self, epub_id: str) -> None:
        return None


# ---------------------------------------------------------------------------
# D-08: declared-languages path
# ---------------------------------------------------------------------------


async def test_resolve_returns_first_declared_for_single_language_epub() -> None:
    """A single ``<dc:language>en</dc:language>`` returns ``'en'``."""
    epub_bytes = _build_epub(
        declared_languages=["en"],
        chapter_langs=[None],  # 1 chapter, no per-chapter lang
    )
    file_store = _FakeFileStore(epub_bytes)
    service = EpubService()

    resolved = await service.resolve_voiceover_language("e1", file_store)

    assert resolved == "en", f"expected 'en', got {resolved!r}"


async def test_resolve_returns_none_for_epub_with_no_declared_languages() -> None:
    """An EPUB with no ``<dc:language>`` returns ``None`` (router raises 422)."""
    # An EPUB with no dc:language is not strictly valid EPUB, but
    # the resolver tolerates it (returns None) and the router
    # raises 422 ``source_language_required`` (D-09).
    # Build a valid EPUB then strip the dc:language from the OPF —
    # simpler: build with one declared language, then call the
    # resolver with bytes; this test exercises the 0-declared
    # branch by constructing an empty list, which the resolver
    # short-circuits to None. We do NOT need to construct a real
    # EPUB for this assertion (the resolver returns None before
    # parsing chapters when ``len(declared) == 0``).
    epub_bytes = _build_epub(
        declared_languages=["en"],
        chapter_langs=[None],
    )
    # The test of the 0-declared path uses a hand-rolled EPUB
    # with no dc:language; the resolver's first metadata lookup
    # returns [] and it short-circuits to None. The
    # ``EpubBook.set_language`` API requires at least one
    # language for a parseable EPUB, so we test the branch by
    # stripping the language from the OPF post-write.
    import zipfile

    buf = io.BytesIO(epub_bytes)
    out_buf = io.BytesIO()
    with zipfile.ZipFile(buf, "r") as zin, zipfile.ZipFile(out_buf, "w") as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.endswith(".opf"):
                # Strip the ``<dc:language>`` lines from the OPF.
                text = data.decode("utf-8")
                lines = [ln for ln in text.splitlines() if "<dc:language>" not in ln]
                data = "\n".join(lines).encode("utf-8")
            zout.writestr(item, data)
    epub_bytes_no_lang = out_buf.getvalue()

    file_store = _FakeFileStore(epub_bytes_no_lang)
    service = EpubService()

    resolved = await service.resolve_voiceover_language("e1", file_store)

    assert resolved is None, f"expected None for no declared languages, got {resolved!r}"


# ---------------------------------------------------------------------------
# D-08: ≥2 declared → first-spine xml:lang
# ---------------------------------------------------------------------------


async def test_resolve_returns_first_spine_chapter_xml_lang_for_multi_language_epub() -> None:
    """Multi-language EPUB: first chapter's ``xml:lang`` wins."""
    epub_bytes = _build_epub(
        declared_languages=["en", "de"],
        chapter_langs=["de"],  # First spine chapter carries xml:lang="de"
    )
    file_store = _FakeFileStore(epub_bytes)
    service = EpubService()

    resolved = await service.resolve_voiceover_language("e1", file_store)

    assert resolved == "de", f"expected 'de' (first spine xml:lang), got {resolved!r}"


async def test_resolve_falls_back_to_first_declared_when_no_chapter_xml_lang() -> None:
    """Multi-language EPUB with no chapter carrying ``xml:lang`` → ``declared[0]``."""
    # Hand-roll the EPUB to ensure the chapter XHTML has NO ``xml:lang``
    # attribute. ebooklib always writes ``xml:lang`` on chapters even
    # when the per-chapter language is None, so we bypass ebooklib
    # for this test.
    epub_bytes = _build_minimal_epub_no_chapter_lang(declared_languages=["en", "de"])
    file_store = _FakeFileStore(epub_bytes)
    service = EpubService()

    resolved = await service.resolve_voiceover_language("e1", file_store)

    assert resolved == "en", f"expected 'en' (first declared fallback), got {resolved!r}"


async def test_resolve_uses_lang_attribute_as_fallback() -> None:
    """A chapter carrying the HTML ``lang`` attribute (without ``xml:lang``) wins.

    Hand-roll the EPUB to ensure the chapter has ``lang="fr"``
    without ``xml:lang``. ebooklib writes both attributes when
    ``EpubHtml(lang=...)`` is set, so we bypass ebooklib for
    this test.
    """
    epub_bytes = _build_minimal_epub_lang_attr_only(chapter_lang="fr")
    file_store = _FakeFileStore(epub_bytes)
    service = EpubService()

    resolved = await service.resolve_voiceover_language("e1", file_store)

    assert resolved == "fr", f"expected 'fr' (lang fallback), got {resolved!r}"


# ---------------------------------------------------------------------------
# Hand-rolled EPUB builders (bypass ebooklib normalization for edge cases)
# ---------------------------------------------------------------------------


def _build_minimal_epub_no_chapter_lang(*, declared_languages: list[str]) -> bytes:
    """Build an EPUB 3 where the chapter XHTML has NO ``xml:lang`` / ``lang`` attribute.

    ebooklib's ``EpubHtml(lang=None)`` still writes ``xml:lang=`` on
    the chapter (normalised to the first declared language). This
    helper bypasses ebooklib to construct the chapter XHTML without
    ANY language attribute, so the resolver falls back to
    ``declared[0]`` per D-08.
    """
    lang_xml = "\n".join(f"    <dc:language>{lang}</dc:language>" for lang in declared_languages)
    opf_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:test-no-lang</dc:identifier>
    <dc:title>Test No Lang</dc:title>
{lang_xml}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="chap_1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
    <itemref idref="ch1"/>
  </spine>
</package>
"""
    ch_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<html xmlns="http://www.w3.org/1999/xhtml">\n'
        "<head><title>Chapter 1</title></head>\n"
        "<body><p>Chapter 1 content.</p></body>\n"
        "</html>"
    )
    nav_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n'
        "<head><title>Nav</title></head>\n"
        '<body><nav epub:type="toc"><ol></ol></nav></body>\n'
        "</html>"
    )
    mimetype = b"application/epub+zip"
    container_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">\n'
        "  <rootfiles>\n"
        '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n'
        "  </rootfiles>\n"
        "</container>"
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("mimetype", mimetype)
        zf.writestr("META-INF/container.xml", container_xml.encode("utf-8"))
        zf.writestr("OEBPS/content.opf", opf_xml.encode("utf-8"))
        zf.writestr("OEBPS/nav.xhtml", nav_xml.encode("utf-8"))
        zf.writestr("OEBPS/chap_1.xhtml", ch_xml.encode("utf-8"))
    return buf.getvalue()


def _build_minimal_epub_lang_attr_only(*, chapter_lang: str) -> bytes:
    """Build an EPUB 3 where the chapter XHTML has ``lang`` but no ``xml:lang``.

    ebooklib's ``EpubHtml(lang=...)`` writes BOTH ``xml:lang`` and
    ``lang`` on the chapter root. This helper bypasses ebooklib to
    construct the chapter with ONLY ``lang``, exercising the
    resolver's ``lang``-attribute fallback path.
    """
    opf_xml = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:test-lang-only</dc:identifier>
    <dc:title>Test Lang Only</dc:title>
    <dc:language>en</dc:language>
    <dc:language>fr</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="chap_1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
    <itemref idref="ch1"/>
  </spine>
</package>
"""
    ch_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<html xmlns="http://www.w3.org/1999/xhtml" lang="{chapter_lang}">\n'
        "<head><title>Chapter 1</title></head>\n"
        "<body><p>Chapter 1 content.</p></body>\n"
        "</html>"
    )
    nav_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n'
        "<head><title>Nav</title></head>\n"
        '<body><nav epub:type="toc"><ol></ol></nav></body>\n'
        "</html>"
    )
    mimetype = b"application/epub+zip"
    container_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">\n'
        "  <rootfiles>\n"
        '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n'
        "  </rootfiles>\n"
        "</container>"
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("mimetype", mimetype)
        zf.writestr("META-INF/container.xml", container_xml.encode("utf-8"))
        zf.writestr("OEBPS/content.opf", opf_xml.encode("utf-8"))
        zf.writestr("OEBPS/nav.xhtml", nav_xml.encode("utf-8"))
        zf.writestr("OEBPS/chap_1.xhtml", ch_xml.encode("utf-8"))
    return buf.getvalue()
