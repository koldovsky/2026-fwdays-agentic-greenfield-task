"""Synthetic EPUB fixture generator — mimesis-based (ADR-0006 + D-01).

Emits five deterministic EPUBs into ``backend/tests/fixtures/epubs/``:

- ``mystere-nocturne.epub`` — French, ~10 chapters, hand-crafted HTML
  tag structure (``p, h1, h2, em, strong, a, ul, ol, li``) so Phase 2's
  ≥95% tag-preservation diff is reproducible. Title "Mystère Nocturne"
  (renamed from "Le Petit Prince" in 2026-07-07 to avoid the famous
  fixture leaning entirely on a well-known work; the new title is a
  random French word pair and remains a Romance-language fixture).
- ``bilingual-reader.epub`` — declares both ``dc:language=fr`` and
  ``dc:language=en`` (drives the F1 @integration multi-language scenario).
- ``long-series.epub`` — 120 chapters, **Greek** (``el``); was French
  in Phase 1+2, switched to Greek on 2026-07-07 to exercise the
  non-Latin tag-preservation contract (EPUB-03 perf scenario still
  applies — Greek sentence generation is comparable in length to French).
- ``anonymous.epub`` — no ``dc:title`` and no ``dc:creator``,
  **Ukrainian / Cyrillic** (``uk``); drives the F1 @api "EPUB missing
  optional metadata" scenario and exercises Cyrillic-script chapter
  text. Was French in Phase 1+2, then Russian (2026-07-07), now
  Ukrainian (2026-07-07) — keeps the Cyrillic branch, swaps the
  natural-language model.
- ``orient-tales.epub`` — **Simplified Chinese** (``zh``), 8 chapters;
  added 2026-07-07 to explore the CJK script branch of the html5lib
  parser + the ≥95% tag-preservation contract on non-Latin input.

F1 boundary fixtures (exactly 50 MB / 65 MB) are NOT built here —
they're generated programmatically in ``tests/unit/test_size_limit.py``
by padding a valid EPUB ZIP with junk bytes.

Regenerated ``.epub`` outputs are gitignored; only this generator is
committed (D-01).

Usage
-----
    # Default — emit the five fixtures only.
    uv run python tools/build_fixtures.py

    # With profiling — also re-parse each fixture with the same
    # ``read_epub + BeautifulSoup(html, "html5lib")`` path the F1 endpoint
    # uses, print wall-clock time, and warn if ``long-series.epub`` exceeds
    # 3.0s (Pitfall C).
    uv run python tools/build_fixtures.py --profile

Run from anywhere — paths are anchored to the repo root. Uses a fixed
``mimesis`` RNG seed so re-runs produce byte-identical or
semantically-equivalent fixtures.
"""

from __future__ import annotations

import argparse
import io
import sys
import time
from pathlib import Path

from ebooklib import epub
from mimesis import Generic

# ---------------------------------------------------------------------------
# Paths / constants
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "backend" / "tests" / "fixtures" / "epubs"

# Fixed mimesis seed → deterministic fixtures (D-01).
MIMESIS_SEED = 42

# Canonical chapter rule (locked once in Phase 1, reused F3/F4/F6).
# Per PLAN §01-02 Task 1: ~10 chapters for mystere-nocturne, 120 for
# long-series. The book is a representative subset, not a literal copy
# of any specific work.
MYSTERE_NOCTURNE_CHAPTERS = 10
LONG_SERIES_CHAPTERS = 120
BILINGUAL_CHAPTERS = 6
ORIENT_TALES_CHAPTERS = 8

# Per-chapter prose length (mimesis sentences). Keep short on long-series
# so the on-disk fixture stays small enough for the F1 <3s parse perf
# target.
MYSTERE_NOCTURNE_SENTENCES_PER_CHAPTER = 6
LONG_SERIES_SENTENCES_PER_CHAPTER = 3
BILINGUAL_SENTENCES_PER_CHAPTER = 4
ANONYMOUS_SENTENCES_PER_CHAPTER = 3
ORIENT_TALES_SENTENCES_PER_CHAPTER = 5

# html5lib tag set used by mystere-nocturne for the ≥95% preservation
# reproducibility contract (Phase 2 will assert this against translated
# output). All five fixture kinds keep the same hand-crafted tag set.
HTML_TAG_BUDGET = ("p", "h1", "h2", "em", "strong", "a", "ul", "ol", "li")

# 3-second parse wall-clock budget (EPUB-03 + F1 Success Criteria #1 +
# Pitfall C). Print a warning if a fixture exceeds this when --profile is on.
PARSE_BUDGET_SECONDS = 3.0


# ---------------------------------------------------------------------------
# mimesis helpers
# ---------------------------------------------------------------------------


def _make_generic(locale: str = "fr") -> Generic:
    """Return a seeded ``mimesis.Generic`` for the given locale.

    Seeding the underlying ``mimesis.random`` module via ``Generic``'s
    ``seed`` kwarg makes re-runs of this script produce identical output
    bytes (verified for v19.1.0; the ``Generic`` constructor calls
    ``random.seed`` internally — see ``mimesis/generic.py``).

    Supported locales: ``fr`` (French), ``en`` (English), ``el`` (Greek),
    ``uk`` (Ukrainian), ``zh`` (Simplified Chinese). Mimesis emits
    natural prose for each — verified 2026-07-07 against mimesis>=11.0.
    """
    return Generic(locale=locale, seed=MIMESIS_SEED)


def _prose_sentences(generic: Generic, count: int) -> list[str]:
    """Return ``count`` short sentences from the locale's text provider."""
    return [generic.text.sentence() for _ in range(count)]


# ---------------------------------------------------------------------------
# Chapter HTML builders
# ---------------------------------------------------------------------------


def _render_chapter_html(generic: Generic, title: str, sentences: list[str]) -> str:
    """Render a chapter's body to an XHTML string with the locked tag set.

    The hand-crafted structure mirrors the F3 tag-preservation contract
    (Phase 2 wires the ≥95% diff): ``h1`` title, then a mix of ``p``,
    ``em``, ``strong``, ``a`` (one of each per paragraph), and a ``ul`` /
    ``ol`` block every chapter.

    Works for any locale mimesis supports — the text comes from
    ``generic.text.sentence()`` which is script-aware, and the
    surrounding markup stays ASCII so the html5lib round-trip
    contract is the same across all five fixture kinds.
    """
    paragraphs: list[str] = []
    for i, sentence in enumerate(sentences):
        # Rotate anchor target / em / strong so they don't all look the same.
        anchor_text = generic.text.word()
        anchor_href = f"https://example.invalid/{generic.code.isbn()}"
        if i % 2 == 0:
            inner = (
                f"<p><em>{sentence}</em> "
                f"<strong>{generic.text.words(2)}</strong> "
                f'<a href="{anchor_href}">{anchor_text}</a></p>'
            )
        else:
            inner = f"<p>{sentence}</p>"
        paragraphs.append(inner)

    # List block — alternates ul / ol so the parser sees both kinds.
    items = "".join(f"<li>{generic.text.words(3)}</li>" for _ in range(3))
    list_block = f"<ul>{items}</ul>" if len(sentences) % 2 == 0 else f"<ol>{items}</ol>"

    body = "\n".join(paragraphs) + "\n" + list_block
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<html xmlns="http://www.w3.org/1999/xhtml">\n'
        "<head><title>" + title + "</title></head>\n"
        "<body>\n<h1>" + title + "</h1>\n" + body + "\n</body>\n</html>\n"
    )


# ---------------------------------------------------------------------------
# Book builders
# ---------------------------------------------------------------------------


def _add_chapter(
    book: epub.EpubBook,
    generic: Generic,
    *,
    chapter_index: int,
    title: str,
    sentences: list[str],
    lang: str,
) -> epub.EpubHtml:
    """Append a single ``EpubHtml`` chapter to ``book`` and return it.

    ``lang`` is the per-chapter ``xml:lang`` attribute (e.g. ``fr``,
    ``el``, ``uk``, ``zh-Hans``). It is the canonical locale the
    chapter is written in and is read by the voiceover F4 first-spine
    language resolver (``EpubService.resolve_voiceover_language``).
    """
    ch = epub.EpubHtml(
        title=title, file_name=f"chap_{chapter_index:04d}.xhtml", lang=lang
    )
    ch.content = _render_chapter_html(generic, title, sentences).encode("utf-8")
    book.add_item(ch)
    return ch


def _finalize_book(
    book: epub.EpubBook,
    chapters: list[epub.EpubHtml],
) -> None:
    """Wire spine + nav + ncx for a built book.

    The canonical chapter rule (Pitfall 13 / EPUB-03) filters spine items to
    ``ITEM_DOCUMENT`` with non-empty stripped text. To produce a clean
    count, the structural ``EpubNav`` and ``EpubNcx`` items are added to
    the book (required for valid EPUB 3) but NOT included in the spine —
    keeping the spine equal to the chapter list. This matches the
    ``EPUB 3 — XHTML Content Documents`` reading-order contract: nav and
    ncx live in the package but are not part of the reading order.
    """
    book.toc = tuple(chapters)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = list(chapters)


def build_mystere_nocturne() -> bytes:
    """Build a 10-chapter French EPUB.

    Renamed from ``build_le_petit_prince`` on 2026-07-07 (D-housekeeping).
    The book is now titled "Mystère Nocturne" (a random French word pair)
    so the F1/F3 fixture corpus does not lean entirely on Antoine de
    Saint-Exupéry's well-known work. The structure — 10 chapters, the
    locked ``{p, h1, h2, em, strong, a, ul, ol, li}`` tag set, French
    declared language — is preserved so the ≥95% tag-preservation
    contract + the F1 single-language metadata scenario stay green.
    """
    g = _make_generic("fr")
    book = epub.EpubBook()
    book.set_identifier("urn:uuid:fixture-mystere-nocturne-0001")
    book.set_title("Mystère Nocturne")
    book.add_author("Anonyme")
    book.add_metadata("DC", "language", "fr")

    chapters: list[epub.EpubHtml] = []
    for i in range(1, MYSTERE_NOCTURNE_CHAPTERS + 1):
        title = f"Chapitre {i}"
        sentences = _prose_sentences(g, MYSTERE_NOCTURNE_SENTENCES_PER_CHAPTER)
        chapters.append(
            _add_chapter(
                book, g, chapter_index=i, title=title, sentences=sentences, lang="fr"
            )
        )

    _finalize_book(book, chapters)

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def build_bilingual_reader() -> bytes:
    """Build a 6-chapter EPUB declaring both ``fr`` and ``en``."""
    g = _make_generic("fr")
    book = epub.EpubBook()
    book.set_identifier("urn:uuid:fixture-bilingual-reader-0001")
    book.set_title("Bilingual Reader")
    book.add_author("Fixture Author")
    # Two ``dc:language`` entries drive the F1 @integration multi-language
    # scenario. ebooklib preserves both in the OPF metadata block.
    book.add_metadata("DC", "language", "fr")
    book.add_metadata("DC", "language", "en")

    chapters: list[epub.EpubHtml] = []
    for i in range(1, BILINGUAL_CHAPTERS + 1):
        title = f"Chapter {i}"
        sentences = _prose_sentences(g, BILINGUAL_SENTENCES_PER_CHAPTER)
        ch = _add_chapter(
            book, g, chapter_index=i, title=title, sentences=sentences, lang="en"
        )
        chapters.append(ch)

    _finalize_book(book, chapters)

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def build_long_series() -> bytes:
    """Build a 120-chapter **Greek** EPUB for the perf + count scenarios.

    Switched from French to Greek (``el``) on 2026-07-07 so the F1
    long-form chapter-count scenario + the EPUB-03 3-second parse
    contract are exercised on a non-Latin script. mimesis>=11.0 emits
    Modern Greek prose for the ``el`` locale — verified sentence
    length is comparable to the previous French output.
    """
    g = _make_generic("el")
    book = epub.EpubBook()
    book.set_identifier("urn:uuid:fixture-long-series-0001")
    book.set_title("Μακρά Πορεία")
    book.add_author("Συγγραφέας")
    book.add_metadata("DC", "language", "el")

    chapters: list[epub.EpubHtml] = []
    for i in range(1, LONG_SERIES_CHAPTERS + 1):
        title = f"Κεφάλαιο {i}"
        sentences = _prose_sentences(g, LONG_SERIES_SENTENCES_PER_CHAPTER)
        chapters.append(
            _add_chapter(
                book, g, chapter_index=i, title=title, sentences=sentences, lang="el"
            )
        )

    _finalize_book(book, chapters)

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def build_anonymous() -> bytes:
    """Build a small Ukrainian / Cyrillic EPUB with no ``dc:title`` / ``dc:creator``.

    Switched from French to Russian on 2026-07-07, then to Ukrainian
    on 2026-07-07, to exercise the Cyrillic-script branch of the
    html5lib parser + the ≥95% tag-preservation contract. Skips the
    metadata setters entirely so ``book.get_metadata('DC', 'title')``
    and ``book.get_metadata('DC', 'creator')`` both return empty
    lists — the F1 @api "EPUB missing optional metadata" scenario
    expects ``title=None`` / ``author=None`` in the response.
    """
    g = _make_generic("uk")
    book = epub.EpubBook()
    book.set_identifier("urn:uuid:fixture-anonymous-0002")
    # Intentionally do NOT set title or author. The language is still
    # declared so the canonical chapter rule has a hint to work with.
    book.add_metadata("DC", "language", "uk")

    chapters: list[epub.EpubHtml] = []
    for i in range(1, 4):  # 3 short chapters; count is not the contract here
        title = f"Розділ {i}"  # Ukrainian for "Chapter N"
        sentences = _prose_sentences(g, ANONYMOUS_SENTENCES_PER_CHAPTER)
        chapters.append(
            _add_chapter(
                book, g, chapter_index=i, title=title, sentences=sentences, lang="uk"
            )
        )

    _finalize_book(book, chapters)

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def build_orient_tales() -> bytes:
    """Build an 8-chapter Simplified Chinese EPUB.

    Added 2026-07-07 (D-housekeeping) to explore the CJK script branch
    of the html5lib parser + the ≥95% tag-preservation contract on
    non-Latin input. mimesis>=11.0 emits Simplified Chinese prose for
    the ``zh`` locale (verified). Per-chapter ``xml:lang="zh-Hans"``
    matches the EPUB 3 language-tag convention for Simplified Chinese
    (vs. ``zh-Hant`` for Traditional).
    """
    g = _make_generic("zh")
    book = epub.EpubBook()
    book.set_identifier("urn:uuid:fixture-orient-tales-0001")
    book.set_title("东方传说")
    book.add_author("佚名")
    book.add_metadata("DC", "language", "zh-Hans")

    chapters: list[epub.EpubHtml] = []
    for i in range(1, ORIENT_TALES_CHAPTERS + 1):
        title = f"第 {i} 章"
        sentences = _prose_sentences(g, ORIENT_TALES_SENTENCES_PER_CHAPTER)
        chapters.append(
            _add_chapter(
                book,
                g,
                chapter_index=i,
                title=title,
                sentences=sentences,
                lang="zh-Hans",
            )
        )

    _finalize_book(book, chapters)

    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Profiling (Pitfall C / F1 Success Criteria #1)
# ---------------------------------------------------------------------------


def _profile_parse(label: str, data: bytes) -> float:
    """Re-parse ``data`` with the same path F1 uses; return wall-clock seconds."""
    import warnings

    from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
    from ebooklib import ITEM_DOCUMENT

    start = time.perf_counter()
    book = epub.read_epub(io.BytesIO(data), options={"ignore_ncx": True})
    spine = list(book.spine)
    chapters_with_text = 0
    for item_id, _linear in spine:
        item = book.get_item_with_id(item_id)
        if item is None or item.get_type() != ITEM_DOCUMENT:
            continue
        html = item.get_content().decode("utf-8", errors="replace")
        # The fixture chapters are well-formed XHTML served with an xml
        # declaration; html5lib parses it as HTML and emits a one-time
        # XMLParsedAsHTMLWarning. Suppress it for the profile output.
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", XMLParsedAsHTMLWarning)
            soup = BeautifulSoup(html, "html5lib")
        if soup.get_text(separator=" ", strip=True):
            chapters_with_text += 1
    elapsed = time.perf_counter() - start
    print(
        f"[profile] {label:<22s}  parse+extract: {elapsed:6.3f}s   "
        f"spine items: {len(spine):3d}   chapters: {chapters_with_text:3d}"
    )
    if label == "long-series.epub" and elapsed > PARSE_BUDGET_SECONDS:
        print(
            f"  WARNING: long-series.epub parse exceeded {PARSE_BUDGET_SECONDS:.1f}s "
            "(EPUB-03 budget). Consider shorter per-chapter prose; the html5lib "
            "parser is PRD-locked and cannot be swapped.",
            file=sys.stderr,
        )
    return elapsed


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def _write_fixture(filename: str, data: bytes) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUTPUT_DIR / filename
    out.write_bytes(data)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate deterministic mimesis EPUB fixtures (D-01 + ADR-0006).",
    )
    parser.add_argument(
        "--profile",
        action="store_true",
        help=(
            "After writing the fixtures, re-parse each one with the F1 path "
            "(read_epub + BeautifulSoup(html, html5lib)) and print wall-clock "
            "time. Warns if long-series.epub exceeds 3.0s (EPUB-03 budget)."
        ),
    )
    args = parser.parse_args()

    fixtures = [
        ("mystere-nocturne.epub", build_mystere_nocturne),
        ("bilingual-reader.epub", build_bilingual_reader),
        ("long-series.epub", build_long_series),
        ("anonymous.epub", build_anonymous),
        ("orient-tales.epub", build_orient_tales),
    ]

    written: list[tuple[str, Path, int]] = []
    for filename, builder in fixtures:
        data = builder()
        path = _write_fixture(filename, data)
        written.append((filename, path, len(data)))
        print(f"wrote {path.relative_to(REPO_ROOT)} ({len(data):,} bytes)")

    if args.profile:
        print()
        for filename, _path, _size in written:
            _profile_parse(filename, _read_back(filename))

    return 0


def _read_back(filename: str) -> bytes:
    return (OUTPUT_DIR / filename).read_bytes()


if __name__ == "__main__":
    raise SystemExit(main())
