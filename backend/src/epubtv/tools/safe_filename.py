"""safe_filename for download-filename interpolation (DL-02).

Returns a single-segment basename of the shape ``[sanitised_title]-[lang].[suffix]``
that is safe to drop into a ``Content-Disposition: attachment; filename*=UTF-8''...``
header. The book title may be free-form user input (Unicode) or
hostile (path traversal, control chars, absolute paths), and the
function must never return a string that contains ``/`` or ``\\``.

Distinct from the
``adapters/storage/local_file_store.py::safe_filename`` helper that
canonicalises the **upload** filename for the EPUB scratch path
(V12). That one is keyed on the original ``.epub`` filename; this
one is keyed on the book's ``title`` metadata + the target / spoken
language + the artifact extension (``epub`` / ``zip``).

Defensive rules:
- ``..`` anywhere in the title → fall back to ``untitled-[lang].[suffix]``.
- Leading ``/`` / ``\\`` (absolute paths, POSIX + Windows) → fall back.
- Windows drive letter prefix (``C:`` etc.) → fall back.
- Control chars ``0x00..0x1F`` + ``0x7F`` are replaced with ``_``.
- Directory separators ``/`` + ``\\`` are replaced with ``_``.
- Leading dots + whitespace are trimmed.
- If the sanitised title is empty → fall back.
- Unicode (non-ASCII printable) characters are preserved verbatim.

The function is pure — no I/O, no globals — so it is trivial to
unit-test exhaustively.
"""

from __future__ import annotations

import re

__all__ = ["safe_filename"]

# Control characters 0x00..0x1F + 0x7F (DEL). The existing
# ``local_file_store.safe_filename`` strips them via ``re.sub(r"[\x00-\x1F\x7F]", "", ...)``
# (see Security V12). For DL-02 we match the same behaviour: strip
# them so the resulting filename stays close to the visible title.
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x1F\x7F]")

# Windows drive letter prefix: e.g. ``C:`` or ``Z:``. We reject
# any title that starts with this so a hostile caller cannot smuggle
# a drive absolute path through the basename.
_DRIVE_LETTER_RE = re.compile(r"^[A-Za-z]:")


def safe_filename(title: str, suffix: str, lang: str) -> str:
    """Return a DL-02 safe download filename.

    Parameters
    ----------
    title:
        The book title. May contain Unicode + control chars + path
        separators. Sanitised per the rules above.
    suffix:
        The file extension without the leading dot (``"epub"`` or
        ``"zip"``).
    lang:
        The target or spoken language code (e.g. ``"en"``, ``"de"``,
        ``"ja"``). Used as the language tag in the returned filename.

    Returns
    -------
    str
        A single-segment basename of the form
        ``[sanitised_title]-[lang].[suffix]``. The result NEVER
        contains ``/`` or ``\\``. For hostile or empty input the
        result is ``untitled-[lang].[suffix]``.
    """
    # 1. Empty / whitespace-only → fall back immediately.
    if not title or not title.strip():
        return _fallback(suffix, lang)

    # 2. Path-traversal rejection: any ``..`` segment anywhere in the
    #    title is treated as hostile. We split on both separators
    #    first to be robust against ``..\..\..\etc\passwd`` shapes.
    if ".." in title.replace("\\", "/").split("/"):
        return _fallback(suffix, lang)

    # 3. Absolute path rejection: leading ``/`` or ``\\`` (POSIX /
    #    Windows), and the Windows drive-letter prefix.
    if title.startswith(("/", "\\")) or _DRIVE_LETTER_RE.match(title):
        return _fallback(suffix, lang)

    # 4. Strip control chars (matches V12 ``local_file_store.safe_filename``).
    cleaned = _CONTROL_CHAR_RE.sub("", title)

    # 5. Replace directory separators with ``_``.
    cleaned = cleaned.replace("\\", "_").replace("/", "_")

    # 6. Trim leading dots + whitespace.
    cleaned = cleaned.lstrip(".").strip()

    # 7. If sanitisation left nothing usable, fall back.
    if not cleaned:
        return _fallback(suffix, lang)

    return f"{cleaned}-{lang}.{suffix}"


def _fallback(suffix: str, lang: str) -> str:
    """Return the ``untitled-[lang].[suffix]`` fallback filename."""
    return f"untitled-{lang}.{suffix}"
