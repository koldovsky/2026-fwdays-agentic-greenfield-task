"""LocalFileStore — FileStorePort implementation (scratch dir on disk).

Per RESEARCH Pattern 1 + §Security V12: scratch writes MUST canonicalise the
untrusted ``original_filename`` via ``safe_filename`` + verify the resolved
path stays inside the scratch dir via ``Path.resolve().is_relative_to(...)``.

Phase 1 implements ``save_epub`` (used by Plan 02's F1 endpoint). ``read_epub``
+ ``delete_epub`` round out the interface for Phase 2/4. TTL sweep is
DEFERRED to PRD Phase 4 (documented here so the deferral is visible).
"""

from __future__ import annotations

import contextlib
import re
from pathlib import Path
from uuid import uuid4

_CONTROL_CHAR_RE = re.compile(r"[\x00-\x1F\x7F]")


def safe_filename(original: str, fallback_ext: str = ".epub") -> str:
    """Return a basename safe for interpolation into a scratch-path.

    Security (V12):
    - strip ``/`` and ``\\`` separators;
    - strip control chars 0x00–0x1F and 0x7F;
    - collapse ``..`` (path traversal);
    - reject absolute paths (POSIX + Windows drive ``C:\\``-style);
    - keep only the basename (no directory components survive);
    - if the result is empty / has no extension, append ``fallback_ext``.
    """
    if not original:
        return "untitled" + fallback_ext

    # Strip Windows drive prefix if present (defensive — we still take basename later).
    cleaned = original.replace("\\", "/")
    # Take basename only — strips any directory components the caller smuggled in.
    cleaned = cleaned.split("/")[-1]
    # Strip control chars.
    cleaned = _CONTROL_CHAR_RE.sub("", cleaned)
    # Collapse any surviving '..' tokens (defensive — basename() already removed them).
    cleaned = cleaned.replace("..", "_")
    # Trim leading dots that would make the file hidden / weird on POSIX.
    cleaned = cleaned.lstrip(".")
    # Trim whitespace.
    cleaned = cleaned.strip()

    if not cleaned:
        return "untitled" + fallback_ext
    # Ensure an extension.
    if "." not in cleaned:
        cleaned = cleaned + fallback_ext
    return cleaned


class LocalFileStore:
    """FileStorePort implementation — persists EPUB artifacts to a scratch dir.

    Phase 1 is NOT async-bound at the OS level (``Path.write_bytes`` is sync
    + fast for 30–50 MB; the endpoint offloads the synchronous EPUB parse via
    ``anyio.to_thread.run_sync`` instead — see Plan 02). The methods are
    declared ``async`` to match the ``FileStorePort`` Protocol shape; Phase 1
    callers await them, Phase 2 may add real async file I/O.
    """

    def __init__(self, scratch_dir: Path) -> None:
        self.scratch_dir = Path(scratch_dir)
        # Ensure the scratch dir exists so first-write does not raise.
        self.scratch_dir.mkdir(parents=True, exist_ok=True)

    async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
        """Persist ``epub_bytes`` and return a fresh ``epub_id``.

        The on-disk filename is ``{epub_id}_{safe_filename(original)}``;
        ``epub_id`` is a ``uuid4().hex`` so callers can fetch the artifact
        without parsing the filename.
        """
        epub_id = uuid4().hex
        safe_name = safe_filename(original_filename or "untitled.epub", fallback_ext=".epub")
        target = self.scratch_dir / f"{epub_id}_{safe_name}"
        # Path-traversal guard — canonicalise both sides then enforce containment.
        if not target.resolve().is_relative_to(self.scratch_dir.resolve()):
            raise ValueError(
                f"Refusing to write outside scratch dir: {target!s} resolves outside {self.scratch_dir!s}"
            )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(epub_bytes)
        return epub_id

    async def read_epub(self, epub_id: str) -> bytes:
        """Return the previously-saved EPUB bytes for ``epub_id``.

        Matches any file in ``scratch_dir`` whose name starts with
        ``{epub_id}_``. Raises ``FileNotFoundError`` if no match.
        """
        matches = sorted(self.scratch_dir.glob(f"{epub_id}_*"))
        if not matches:
            raise FileNotFoundError(f"No scratch artifact for epub_id={epub_id!r}")
        return matches[0].read_bytes()

    async def delete_epub(self, epub_id: str) -> None:
        """Remove the EPUB artifact for ``epub_id`` from scratch (idempotent)."""
        for p in self.scratch_dir.glob(f"{epub_id}_*"):
            with contextlib.suppress(FileNotFoundError):
                p.unlink()
