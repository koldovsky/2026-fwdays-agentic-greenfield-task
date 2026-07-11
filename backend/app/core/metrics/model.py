"""Metrics-only pairing dataclasses (slice 004, new file).

``app/core/model.py`` (slice 003) intentionally carries no category on ``SessionData``
(see that module's own docstring) — M4's switch detection and the snapshot's
category-keyed blocks (``top_categories``, ``per_category_per_day``) need one, so this
module adds the pairing here rather than editing slice 003's file, per the cross-slice
overlap rule (AGENTS.md). Framework-free (no FastAPI/SQLAlchemy/I/O imports, NFR-DET-01).
"""

from dataclasses import dataclass

from app.core.model import SessionData


@dataclass
class CategorizedSession:
    """A saved session tagged with the (opaque) category id it belongs to.

    M4's pure math only ever compares ``category_id`` values for equality — it never
    knows or cares whether a category is archived (architecture §7); that distinction
    lives one layer up, in ``CategoryInfo`` below.
    """

    session: SessionData
    category_id: int


@dataclass
class CategoryInfo:
    """A category's identity, as needed to label the snapshot's category-keyed blocks.

    Mirrors slice 002's ``Category`` row (id/name/color/archived) without importing the
    ORM model — this stays a plain, framework-free value object so ``snapshot.py`` never
    touches SQLAlchemy. An archived category still appears wherever it has qualifying
    tracked time (architecture §7): metrics never hide historical time behind a tidied
    label.
    """

    id: int
    name: str
    color: str
    archived: bool = False
