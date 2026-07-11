"""safe_filename unit tests (DL-02 — plan 04-01 Task 1 TDD).

Six tests cover the contract from the plan:

1. ``test_safe_filename_rejects_path_traversal`` —
   ``safe_filename("../../etc/passwd", "epub", "en") == "untitled-en.epub"``.
2. ``test_safe_filename_replaces_separators_and_control_chars`` —
   ``safe_filename("A/B\\C\x00\x1f", "epub", "en") == "A_B_C-en.epub"``
   (POSIX ``/`` → ``_``; Windows ``\\`` → ``_``; ``0x00`` → ``_``; ``0x1F`` → ``_``).
3. ``test_safe_filename_preserves_unicode`` —
   ``safe_filename("Книга「日本語」", "epub", "en") == "Книга「日本語」-en.epub"``
   (non-ASCII printable passes through verbatim).
4. ``test_safe_filename_happy_path_epub`` —
   ``safe_filename("My Book", "epub", "de") == "My Book-de.epub"``.
5. ``test_safe_filename_happy_path_zip`` —
   ``safe_filename("My Book", "zip", "en") == "My Book-en.zip"``.
6. ``test_safe_filename_empty_input_falls_back`` — ``""`` and ``"   "``
   both yield ``"untitled-en.epub"``.
"""

from __future__ import annotations

import pytest

from epubtv.tools.safe_filename import safe_filename

pytestmark = [pytest.mark.tcid("DL-02-UT01")]


def test_safe_filename_rejects_path_traversal() -> None:
    """``../..`` segments anywhere trigger the ``untitled`` fallback (DL-02)."""
    assert safe_filename("../../etc/passwd", "epub", "en") == "untitled-en.epub"


def test_safe_filename_replaces_separators_and_control_chars() -> None:
    """``/``, ``\\``, and 0x00..0x1F control chars become ``_`` (DL-02)."""
    # Note: ``\\`` in the Python literal is a single backslash.
    assert safe_filename("A/B\\C\x00\x1f", "epub", "en") == "A_B_C-en.epub"


def test_safe_filename_preserves_unicode() -> None:
    """Non-ASCII printable characters (Cyrillic, CJK, brackets) pass through verbatim (DL-02)."""
    assert safe_filename("Книга「日本語」", "epub", "en") == "Книга「日本語」-en.epub"


def test_safe_filename_happy_path_epub() -> None:
    """Plain ASCII title with the ``.epub`` suffix and a non-EN language code."""
    assert safe_filename("My Book", "epub", "de") == "My Book-de.epub"


def test_safe_filename_happy_path_zip() -> None:
    """Plain ASCII title with the ``.zip`` suffix and the ``en`` language code."""
    assert safe_filename("My Book", "zip", "en") == "My Book-en.zip"


def test_safe_filename_empty_input_falls_back() -> None:
    """Empty string and whitespace-only input both fall back to ``untitled-en.epub``."""
    assert safe_filename("", "epub", "en") == "untitled-en.epub"
    assert safe_filename("   ", "epub", "en") == "untitled-en.epub"
