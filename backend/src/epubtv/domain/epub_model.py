"""EPUBModel — domain model for a parsed EPUB (F1 metadata + chapters).

Locked ONCE in Phase 1 so F3/F4/F6 reuse the SAME ``chapter_ids`` list
(Pattern 3 — canonical chapter rule). F1 ``POST /api/v1/epubs`` returns
this shape (via ``EpubUploadResponse``); Phase 2 stores it on the job row
so resume does NOT re-parse the EPUB (Pitfall E).
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class EPUBModel(BaseModel):
    """Parsed representation of an uploaded EPUB (pure data, no I/O)."""

    model_config = ConfigDict(extra="forbid")

    epub_id: str
    title: str | None = None
    author: str | None = None
    declared_languages: list[str] = Field(default_factory=list)
    chapter_ids: list[str] = Field(default_factory=list)

    @property
    def chapter_count(self) -> int:
        """Number of chapters — derived from ``chapter_ids`` so they never drift."""
        return len(self.chapter_ids)
