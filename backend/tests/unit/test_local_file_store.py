"""LocalFileStore unit tests (F1, Security V12 path-traversal).

``safe_filename`` is the first line of defence against path-traversal in
the untrusted ``original_filename`` field of ``POST /api/v1/epubs`` (F1).
Plan 01 ships the helper; Plan 02 Task 2 is the first user. This file
exercises the four adversarial inputs documented in RESEARCH §Security V12
plus a clean baseline, and confirms the on-disk path stays inside the
configured scratch dir.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from epubtv.adapters.storage.local_file_store import LocalFileStore, safe_filename

pytestmark = pytest.mark.tcid("INFRA-01-UT14")

# ---------------------------------------------------------------------------
# safe_filename pure unit tests
# ---------------------------------------------------------------------------


def test_safe_filename_accepts_clean_name() -> None:
    """A normal ``foo.epub`` is returned as-is."""
    assert safe_filename("mystere-nocturne.epub") == "mystere-nocturne.epub"


def test_safe_filename_strips_path_traversal() -> None:
    """``../../etc/passwd`` is collapsed to a safe basename."""
    # Multiple ``..`` segments become ``_``; separators stripped.
    cleaned = safe_filename("../../etc/passwd.epub")
    assert "/" not in cleaned
    assert "\\" not in cleaned
    assert ".." not in cleaned
    assert cleaned.endswith(".epub")


def test_safe_filename_strips_windows_drive() -> None:
    """A Windows drive prefix (``C:\\…``) is reduced to a basename."""
    cleaned = safe_filename("C:\\Windows\\system32\\evil.epub")
    assert "\\" not in cleaned
    assert "/" not in cleaned
    assert cleaned.endswith(".epub")


def test_safe_filename_strips_control_chars() -> None:
    """Control characters in the filename are stripped."""
    cleaned = safe_filename("bad\x00name\x1f.epub")
    assert "\x00" not in cleaned
    assert "\x1f" not in cleaned
    assert cleaned.endswith(".epub")


def test_safe_filename_handles_empty_input() -> None:
    """Empty / whitespace input falls back to ``untitled.epub``."""
    assert safe_filename("") == "untitled.epub"
    assert safe_filename("   ") == "untitled.epub"
    # An all-dot name gets normalised (dots stripped, ``..`` replaced
    # with ``_``) — the result is short but never escapes. The exact
    # output is implementation-defined; we only assert it is non-empty
    # and safe.
    weird = safe_filename("...")
    assert weird
    assert "/" not in weird
    assert "\\" not in weird
    assert ".." not in weird


def test_safe_filename_appends_fallback_ext() -> None:
    """A name with no extension gets the fallback extension appended."""
    assert safe_filename("plainname", fallback_ext=".epub") == "plainname.epub"


# ---------------------------------------------------------------------------
# LocalFileStore path-traversal guard integration
# ---------------------------------------------------------------------------


async def test_save_epub_rejects_path_traversal_filename(
    tmp_path: Path,
) -> None:
    """``save_epub(..., original_filename="../../etc/passwd.epub")`` MUST
    NOT escape the configured scratch dir (V12 — path-traversal).
    """
    store = LocalFileStore(scratch_dir=tmp_path)
    epub_id = await store.save_epub(b"PK\x03\x04...", original_filename="../../etc/passwd.epub")
    # epub_id returned; the file lives inside ``tmp_path``.
    written = list(tmp_path.glob(f"{epub_id}_*"))
    assert written, "expected a file to be written inside the scratch dir"
    rel = written[0].relative_to(tmp_path.resolve())
    assert ".." not in rel.parts
    assert rel.parts[0].startswith(epub_id)


async def test_save_epub_persists_bytes(
    tmp_path: Path,
) -> None:
    """``save_epub`` round-trips the bytes through ``read_epub``."""
    store = LocalFileStore(scratch_dir=tmp_path)
    payload = b"some-bytes"
    epub_id = await store.save_epub(payload, original_filename="x.epub")
    read_back = await store.read_epub(epub_id)
    assert read_back == payload


@pytest.mark.parametrize(
    "adversarial",
    [
        "../../etc/passwd.epub",
        "..\\..\\windows\\system32\\evil.epub",
        "/absolute/path.epub",
        "name\x00with\x01control.epub",
        "...",
    ],
)
async def test_save_epub_never_escapes_scratch(
    tmp_path: Path,
    adversarial: str,
) -> None:
    """A parametrised sweep over adversarial filenames — none may escape."""
    store = LocalFileStore(scratch_dir=tmp_path)
    epub_id = await store.save_epub(b"x", original_filename=adversarial)
    # The resolved on-disk path must be inside ``tmp_path``.
    matches = list(tmp_path.glob(f"{epub_id}_*"))
    assert matches, f"no scratch file for epub_id={epub_id}"
    for m in matches:
        assert m.resolve().is_relative_to(tmp_path.resolve()), (
            f"path {m} escaped scratch dir for adversarial input {adversarial!r}"
        )
