"""Read-only category query used by the metrics slice (004, new file).

``app/repos/categories.py`` (slice 002, ``CategoryRepository``) has no "include
archived" listing -- only ``list_active``, since archived categories are meant to drop
out of pickers. Metrics needs archived categories too (``top_categories`` /
``per_category_per_day`` must still show them, architecture §7), so this adds the one
extra read as a new, user_id-scoped (FR-AUTH-07) method here rather than editing slice
002's module, per the cross-slice overlap rule.
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category


class CategoryReadRepo:
    """Read-only category queries beyond ``CategoryRepository`` (no writes here)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self, *, user_id: int) -> Sequence[Category]:
        """All of the user's categories, active and archived, oldest first."""
        result = await self._session.execute(
            select(Category)
            .where(Category.user_id == user_id)
            .order_by(Category.created_at, Category.id)
        )
        return result.scalars().all()
