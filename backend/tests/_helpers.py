"""Shared test helpers for F1 size-limit / BDD boundary fixtures.

The byte-padded EPUB helper is the single source of truth for building a
valid ZIP archive of an exact target size. Both the unit tests
(``tests/unit/test_size_limit.py``) and the BDD tests
(``tests/bdd/test_epub_upload_and_validation.py``) import it so the boundary
behaviour is consistent across layers (Pitfall D — off-by-one audited once).
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path


def pad_epub_bytes(base_epub_path: Path, target_bytes: int) -> bytes:
    """Return a valid ZIP archive that is exactly ``target_bytes`` long.

    Strategy: open ``base_epub_path`` as a ZIP and re-pack it with an extra
    ``junk.bin`` resource sized via a binary search so the resulting
    archive is exactly ``target_bytes`` bytes (Pitfall D — off-by-one
    audited). The archive structure stays a valid ZIP / EPUB container;
    the content is unparseable in detail (the junk resource is ``\\0``
    bytes), which is fine for the size-cap path (the route rejects on
    size *before* it parses content).

    For tests that need a valid EPUB at the exact 50 MB boundary, the
    caller should use a *real* small EPUB (e.g. ``mystere-nocturne.epub``)
    and accept that the parsed response will report the base chapters
    plus whatever junk resource ebooklib happens to surface. The size
    limit tests only assert HTTP status, not chapter count.
    """
    base_epub_path = Path(base_epub_path)
    base_bytes = base_epub_path.read_bytes()
    base_buf = io.BytesIO(base_bytes)
    with zipfile.ZipFile(base_buf) as src:
        names = src.namelist()
        entries: list[tuple[str, bytes]] = [(n, src.read(n)) for n in names]

    def _build(junk_size: int) -> bytes:
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_STORED) as zf:
            for name, data in entries:
                zf.writestr(name, data)
            if junk_size > 0:
                zf.writestr("junk.bin", b"\x00" * junk_size)
        return out.getvalue()

    # First pass: figure out the size the central directory overhead adds
    # to a zero-byte junk resource, so we can pin the search lower bound.
    base_only_size = len(_build(0))
    overhead = base_only_size  # bytes for the entries + central directory

    # Binary search for the junk size that brings the total to
    # ``target_bytes``. If the base is already bigger than the target, the
    # caller asked for an impossible size; we still return what we have.
    if overhead >= target_bytes:
        return _build(0)

    lo, hi = 0, target_bytes - overhead + 1
    while lo < hi:
        mid = (lo + hi) // 2
        if overhead + mid <= target_bytes:
            lo = mid + 1
        else:
            hi = mid
    junk_size = lo - 1
    out_bytes = _build(junk_size)
    # Defensive: if we missed by a handful of bytes (e.g. ZIP encoder
    # padding the central directory entry names), nudge the junk size.
    while len(out_bytes) < target_bytes:
        junk_size += 1
        out_bytes = _build(junk_size)
    while len(out_bytes) > target_bytes and junk_size > 0:
        junk_size -= 1
        out_bytes = _build(junk_size)
    return out_bytes


def fake_zip_bytes(payload: bytes = b"not an epub") -> bytes:
    """Return a valid ZIP archive that is NOT a valid EPUB.

    Used by the F1 @api "Non-EPUB archive is rejected" BDD scenario — the
    file passes the size cap (tiny) and looks like a ZIP, but ebooklib
    cannot parse it as an EPUB and raises a parse error mapped to 422
    ``invalid_epub``.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("readme.txt", payload)
    return buf.getvalue()
