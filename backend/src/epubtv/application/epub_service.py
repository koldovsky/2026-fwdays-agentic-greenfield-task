"""EpubService — F1 validation, metadata extraction, canonical chapter rule.

Locked ONCE in Phase 1 (EPUB-02 + EPUB-03). F3/F4/F6 import ``extract_chapters``
and the ``EpubUploadResponse`` shape from here so the chapter list is
re-used (never re-enumerated) — see Pitfall 13 / Pitfall E / Pattern 3 in
``01-RESEARCH.md``.

Thread offload (Pitfall B + backend/AGENTS.md §Async discipline):
``ebooklib.read_epub`` and ``BeautifulSoup(..., "html5lib")`` are both
blocking + CPU-bound. ``validate_and_extract`` wraps them in
``anyio.to_thread.run_sync`` so the FastAPI event loop stays responsive
while the upload is being parsed.

Canonical chapter rule (EPUB-03):
A chapter is a spine item of type ``ITEM_DOCUMENT`` whose ``get_text()``
is non-empty after stripping. ``EpubNav`` / ``EpubNcx`` structural items
are NOT included in the spine by the canonical fixture builder; if a
user-supplied EPUB does include them, the rule's non-empty-text filter
covers cover/blank cases but the canonical rule here still applies the
ITEM_DOCUMENT filter (the structural items are NOT ITEM_DOCUMENT so they
are excluded automatically).

ebooklib API shape — verified against ebooklib 0.20 in
``tools/build_fixtures.py`` + the A1/A2 verification in
``01-02-PLAN.md §specifics``:

- ``book.spine`` returns ``list[tuple[str, str]]`` — each entry is
  ``(item_id, linear_bool_str)`` where ``linear_bool_str`` is the string
  ``"yes"`` or ``"no"``. We never read the second element.
- ``book.get_metadata("DC", "title")`` returns
  ``list[tuple[str, dict]]`` — each entry is ``(value, attrs)``. We take
  ``[0][0]`` for single-value fields and ``[v[0] for v in ...]`` for
  list-valued fields (e.g. ``dc:language``).

Phase 3 / D-08 adds ``resolve_voiceover_language``: the first-spine
chapter's ``xml:lang`` for multi-language EPUBs. The router
preflight (plan 03-03) calls this to fill ``VoiceoverJobBody.source_language``
when the user does not pass one explicitly.
"""

from __future__ import annotations

import io
import warnings
import zipfile
from dataclasses import dataclass
from typing import TYPE_CHECKING

import anyio
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from ebooklib import ITEM_DOCUMENT, epub  # type: ignore[import-untyped]

from epubtv.api.schemas import EpubUploadResponse

if TYPE_CHECKING:
    from epubtv.ports.file_store_port import FileStorePort


class EpubValidationError(Exception):
    """Domain error raised when an EPUB fails validation or size check.

    The error carries an ``error.code`` string (mapped to the
    ``{error:{code,message}}`` envelope) and an HTTP ``status_code`` (used
    by the registered exception handler in ``api/app.py``).
    """

    def __init__(self, code: str, message: str, status_code: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


# Exceptions that ``ebooklib.read_epub`` may raise on a malformed archive.
# Caught in ``_read_epub`` and re-raised as ``EpubValidationError``.
_EPUB_READ_EXC = (
    zipfile.BadZipFile,
    KeyError,
    epub.EpubException,
    ValueError,
    AssertionError,  # ebooklib sometimes asserts (e.g. on missing container.xml)
    AttributeError,  # rare: book.get_item_with_id() returns None and we read .get_name()
)


@dataclass(frozen=True)
class _Chapter:
    """Internal chapter record (canonical chapter rule — locked in Phase 1)."""

    spine_index: int
    item_id: str
    text: str
    html: str


def _sanitize_metadata(value: str | None) -> str | None:
    """Strip ``<`` and ``>`` from a metadata string (V12 — polyglot HTML / XSS).

    The React SPA auto-escapes anyway; this is a defence-in-depth measure so
    the API surface cannot carry an obvious injection vector regardless of
    frontend behaviour. ``None`` is preserved.
    """
    if value is None:
        return None
    return value.replace("<", "").replace(">", "").strip() or None


class EpubService:
    """Stateless F1 service: validate → parse → extract → persist → respond.

    The service is constructed per-request (it holds no shared state).
    Each call returns a fully-populated ``EpubUploadResponse`` ready to
    serialise to JSON.
    """

    async def validate_and_extract(
        self,
        epub_bytes: bytes,
        original_filename: str | None,
        file_store: FileStorePort,
    ) -> EpubUploadResponse:
        """Run the F1 pipeline and return the upload response envelope.

        1. ``read_epub`` (thread offloaded)
        2. ``_extract_chapters`` (thread offloaded — html5lib is CPU-bound)
        3. ``file_store.save_epub`` (delegated — the adapter is async I/O)
        4. Build ``EpubUploadResponse`` with sanitised metadata.
        """
        # 1. Parse archive in a worker thread (Pitfall B).
        book = await anyio.to_thread.run_sync(self._read_epub, epub_bytes)

        # 2. Canonical chapter rule in a worker thread (html5lib is CPU-heavy).
        chapters = await anyio.to_thread.run_sync(self._extract_chapters, book)

        # 3. Metadata extraction is fast — read on the event loop.
        title = _sanitize_metadata(self._get_metadata(book, "DC", "title"))
        author = _sanitize_metadata(self._get_metadata(book, "DC", "creator"))
        declared_languages = list(self._get_metadata_all(book, "DC", "language") or [])

        # 4. Persist the original bytes to scratch (V12 path-traversal-safe).
        epub_id = await file_store.save_epub(epub_bytes, original_filename)

        # 5. Build the response — chapter_count is derived from chapter_ids.
        chapter_ids = [f"chapter_{i + 1}" for i in range(len(chapters))]
        return EpubUploadResponse(
            epub_id=epub_id,
            title=title,
            author=author,
            declared_languages=declared_languages,
            chapter_count=len(chapter_ids),
            chapter_ids=chapter_ids,
        )

    async def get_metadata(
        self,
        epub_id: str,
        file_store: FileStorePort,
    ) -> dict[str, object]:
        """Re-parse the persisted EPUB bytes and return the metadata-only dict.

        The D-06 router pre-flight (plan 02-03) needs ``declared_languages``
        without re-doing the upload work. This method re-reads the bytes
        from ``file_store`` and runs the same metadata extraction as
        ``validate_and_extract``, returning a dict shaped like
        ``EpubUploadResponse.model_dump()`` minus the ``epub_id`` (the
        caller already knows the id).

        Raises ``FileNotFoundError`` if ``file_store.read_epub(epub_id)``
        raises (the router maps that to a 404 ``not_found`` envelope).
        """
        epub_bytes = await file_store.read_epub(epub_id)
        book = await anyio.to_thread.run_sync(self._read_epub, epub_bytes)
        chapters = await anyio.to_thread.run_sync(self._extract_chapters, book)
        title = _sanitize_metadata(self._get_metadata(book, "DC", "title"))
        author = _sanitize_metadata(self._get_metadata(book, "DC", "creator"))
        declared_languages = list(self._get_metadata_all(book, "DC", "language") or [])
        chapter_ids = [f"chapter_{i + 1}" for i in range(len(chapters))]
        return {
            "title": title,
            "author": author,
            "declared_languages": declared_languages,
            "chapter_count": len(chapter_ids),
            "chapter_ids": chapter_ids,
        }

    async def chapters_for_epub(
        self,
        epub_id: str,
        file_store: FileStorePort,
        chapter_ids: list[str] | None = None,
    ) -> list[tuple[int, str]]:
        """Read the persisted EPUB bytes and return ``(chapter_idx, chapter_html)`` pairs.

        Worker-time re-parse of the EPUB archive. Performance is fine
        for the sprint (≤500 KB per chapter, html5lib parse < 50ms per
        chapter); a future phase can cache the parsed chapters.

        Parameters:
        - ``epub_id``: the scratch artifact id returned by
          ``file_store.save_epub``.
        - ``file_store``: the scratch file store (DI — passed in by the
          workflow service).
        - ``chapter_ids``: optional list of chapter_id strings to filter
          on. ``None`` → all chapters. Currently used by the worker for
          the per-chapter subset selection; the chapter HTML list is
          returned in spine order regardless of the filter (F3 AC1).

        Returns ``[(chapter_idx, chapter_html_str), ...]`` in spine order.
        """
        epub_bytes = await file_store.read_epub(epub_id)
        book = await anyio.to_thread.run_sync(self._read_epub, epub_bytes)
        chapters = await anyio.to_thread.run_sync(self._extract_chapters, book)
        # Filter on chapter_ids by ordinal position (chapter_id = "chapter_{n+1}").
        if chapter_ids is not None:
            allowed_idx = set()
            for cid in chapter_ids:
                # Parse "chapter_N" → N-1
                if cid.startswith("chapter_"):
                    try:
                        n = int(cid.split("_", 1)[1])
                        allowed_idx.add(n - 1)
                    except ValueError:
                        continue
            chapters = [c for c in chapters if c.spine_index in allowed_idx]
        return [(c.spine_index, c.html) for c in chapters]

    async def resolve_voiceover_language(
        self,
        epub_id: str,
        file_store: FileStorePort,
    ) -> str | None:
        """Resolve the spoken-audio language for a voiceover job (D-08).

        Decision tree:
        - 0 declared languages → ``None`` (the router raises 422
          ``source_language_required`` per D-09; the Phase 2 D-06
          error envelope carries over verbatim).
        - 1 declared language → that language.
        - ≥2 declared languages → the first spine-ordered chapter's
          ``xml:lang`` attribute. Fallback: the first declared
          language (no chapter carries an ``xml:lang``).

        The function re-reads the EPUB bytes via the file store + re-
        parses with ebooklib (for the metadata) + zipfile (for the
        chapter XHTML files). The chapter XHTML is read directly from
        the zip — NOT through ``EpubBook.get_item_with_id(...).get_content()``
        — because ebooklib normalises per-chapter ``xml:lang`` to the
        first declared language during ``read_epub``, masking the
        per-chapter language signal the resolver is trying to
        extract. Reading the raw XHTML from the zip preserves the
        original ``xml:lang`` attribute.

        CPU-bound (Pitfall 10) and runs on every voiceover job
        creation; acceptable for sprint scope (≤500 KB per EPUB,
        < 50ms parse). The blocking parse is offloaded to a worker
        thread via ``anyio.to_thread.run_sync`` (matches the
        Phase 1 ``validate_and_extract`` pattern).
        """
        epub_bytes = await file_store.read_epub(epub_id)

        def _parse_and_resolve() -> str | None:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", XMLParsedAsHTMLWarning)
                book = epub.read_epub(io.BytesIO(epub_bytes), options={"ignore_ncx": True})
            declared = [str(v[0]) for v in book.get_metadata("DC", "language")]
            if len(declared) == 0:
                return None
            if len(declared) == 1:
                return declared[0]
            # ≥2: walk the spine, find the first non-nav chapter
            # carrying xml:lang. We read the chapter XHTML directly
            # from the zip so ebooklib's per-chapter language
            # normalisation does not mask the signal (see docstring).
            for spine_idx, _linear in list(book.spine):
                item = book.get_item_with_id(spine_idx)
                if item is None or isinstance(item, epub.EpubNav):
                    continue
                if item.get_type() != ITEM_DOCUMENT:
                    continue
                # Resolve the chapter's XHTML href → relative path
                # in the zip; the href is relative to the OPF dir
                # (typically OEBPS/ or EPUB/).
                href = item.get_name()
                if not href:
                    continue
                # Locate the OPF file path inside the zip to derive
                # the OPF dir (e.g. OEBPS/) — the chapter href is
                # relative to that dir.
                opf_dir = ""
                try:
                    container_path = "META-INF/container.xml"
                    with (
                        zipfile.ZipFile(io.BytesIO(epub_bytes)) as zf,
                        zf.open(container_path) as cf,
                    ):
                        container_text = cf.read().decode("utf-8", errors="replace")
                    soup_container = BeautifulSoup(container_text, "html5lib")
                    rootfile = soup_container.find("rootfile")
                    if rootfile is not None:
                        opf_path = rootfile.get("full-path")
                        if isinstance(opf_path, str) and "/" in opf_path:
                            opf_dir = opf_path.rsplit("/", 1)[0]
                except (KeyError, zipfile.BadZipFile):
                    opf_dir = ""
                zip_path = f"{opf_dir}/{href}" if opf_dir else href
                # Read the chapter XHTML bytes directly from the zip.
                try:
                    with zipfile.ZipFile(io.BytesIO(epub_bytes)) as zf, zf.open(zip_path) as cf:
                        html_str = cf.read().decode("utf-8", errors="replace")
                except (KeyError, zipfile.BadZipFile):
                    continue
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", XMLParsedAsHTMLWarning)
                    soup = BeautifulSoup(html_str, "html5lib")
                root = soup.find(lambda tag: tag.name == "html")
                if root is None:
                    continue
                # EPUB 3 standard attribute; HTML fallback for old EPUBs.
                lang = root.get("xml:lang") or root.get("lang")
                if lang:
                    return str(lang).strip() or None
            # No chapter carries xml:lang → fallback to the first declared.
            return declared[0]

        return await anyio.to_thread.run_sync(_parse_and_resolve)

    # ------------------------------------------------------------------
    # Sync helpers (always called via to_thread.run_sync from above)
    # ------------------------------------------------------------------

    @staticmethod
    def _read_epub(epub_bytes: bytes) -> epub.EpubBook:
        """Open the EPUB archive (catches malformed / non-EPUB errors).

        ``ignore_ncx`` is a hint to ebooklib to skip the legacy NCX parser
        for EPUB 3 archives; we don't use NCX at all, but the flag
        silences a deprecation warning emitted by ebooklib 0.20.
        """
        try:
            return epub.read_epub(io.BytesIO(epub_bytes), options={"ignore_ncx": True})
        except _EPUB_READ_EXC as e:
            raise EpubValidationError(
                "invalid_epub",
                f"Not a valid EPUB 2.0/3.0 archive: {e!s}",
                422,
            ) from e

    @staticmethod
    def _get_metadata(book: epub.EpubBook, namespace: str, name: str) -> str | None:
        """Return the first value of a Dublin Core metadata field, or ``None``.

        ``get_metadata`` returns ``list[tuple[str, dict]]`` — we take the
        first value. Returns ``None`` if the field is absent.
        """
        values = book.get_metadata(namespace, name)
        if not values:
            return None
        first = values[0]
        return str(first[0])

    @staticmethod
    def _get_metadata_all(book: epub.EpubBook, namespace: str, name: str) -> list[str]:
        """Return all values of a Dublin Core metadata field as plain strings.

        ``dc:language`` is the canonical example — an EPUB may declare
        multiple languages and we surface them all in
        ``declared_languages[]``.
        """
        return [str(v[0]) for v in book.get_metadata(namespace, name)]

    @staticmethod
    def _extract_chapters(book: epub.EpubBook) -> list[_Chapter]:
        """Canonical chapter rule (EPUB-03 — Pitfall 13 / Pitfall E).

        A chapter is a spine item of type ``ITEM_DOCUMENT`` whose stripped
        text is non-empty. Cover/NCX/nav structural items that happen to
        be ``ITEM_DOCUMENT`` are filtered out by the non-empty-text check.

        The returned list is the locked contract for F3/F4/F6 — they MUST
        reuse this list and not re-enumerate the spine. Storing
        ``chapter_ids[]`` on the job row (Phase 2) keeps the contract
        intact across a job resume.
        """
        chapters: list[_Chapter] = []
        for idx, (item_id, _linear) in enumerate(list(book.spine)):
            item = book.get_item_with_id(item_id)
            if item is None or item.get_type() != ITEM_DOCUMENT:
                continue
            html = item.get_content().decode("utf-8", errors="replace")
            # Suppress the one-time bs4 warning emitted when html5lib
            # parses a well-formed XHTML document with an ``<?xml?>``
            # declaration. We cannot switch parsers (PRD-locked) and the
            # warning is informational only.
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", XMLParsedAsHTMLWarning)
                soup = BeautifulSoup(html, "html5lib")
            text = soup.get_text(separator=" ", strip=True)
            if not text:
                # Cover / blank / nav structural pages — skip.
                continue
            chapters.append(
                _Chapter(
                    spine_index=idx,
                    item_id=item_id,
                    text=text,
                    html=str(soup),
                )
            )
        return chapters


__all__ = ["EpubService", "EpubValidationError"]
