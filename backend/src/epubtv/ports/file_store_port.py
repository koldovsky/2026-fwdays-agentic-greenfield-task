"""FileStorePort — seam for scratch-file persistence (Phase 1+).

Phase 1 ships ``LocalFileStore`` (scratch dir on persistent volume). The
port surface declares the upload + read/delete operations Phase 1 + later
phases consume. Path-traversal is guarded at the adapter level (Security V12)
via ``safe_filename`` + ``Path.resolve().is_relative_to(...)``.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class FileStorePort(Protocol):
    """Async scratch-file store seam."""

    async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
        """Persist ``epub_bytes`` to scratch, returning a fresh ``epub_id``.

        ``original_filename`` is untrusted — the adapter MUST canonicalise
        via ``safe_filename`` before interpolating into any path.
        """
        ...

    async def read_epub(self, epub_id: str) -> bytes:
        """Return the previously-saved EPUB bytes for ``epub_id``."""
        ...

    async def delete_epub(self, epub_id: str) -> None:
        """Remove the EPUB artifact for ``epub_id`` from scratch."""
        ...
