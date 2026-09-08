"""Repository for the ``categories`` table (see app/repos/__init__.py for the rule).

Every method takes ``user_id`` and scopes every query by it (FR-AUTH-07): a
category owned by another user is simply never returned, so cross-user edit/delete
resolves to ``None`` here and a ``404`` at the API — the row's existence is not
revealed. Commits are owned by the calling service; a duplicate active name
surfaces as an ``IntegrityError`` from the partial unique index, which the service
maps to a domain error (never a raw 500).
"""

from collections.abc import Mapping, Sequence
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category

# The fields a PATCH may touch; guards the setattr loop against unexpected keys.
_UPDATABLE_FIELDS = ("name", "color", "description")


class CategoryRepository:
    """Data access for categories. Commits are owned by the calling service."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self, *, user_id: int, name: str, color: str, description: str | None
    ) -> Category:
        """Insert a category owned by ``user_id`` and return it (id/created_at populated).

        The flush surfaces a duplicate active name as an ``IntegrityError`` (partial
        unique index) for the service to translate — a pre-check alone would race.
        """
        category = Category(user_id=user_id, name=name, color=color, description=description)
        self._session.add(category)
        await self._session.flush()
        await self._session.refresh(category)
        return category

    async def list_active(self, *, user_id: int) -> Sequence[Category]:
        """Return the user's active (non-archived) categories, oldest first."""
        result = await self._session.execute(
            select(Category)
            .where(Category.user_id == user_id, Category.archived_at.is_(None))
            .order_by(Category.created_at, Category.id)
        )
        return result.scalars().all()

    async def get(self, *, user_id: int, category_id: int) -> Category | None:
        """Load ``category_id`` only if it belongs to ``user_id`` (scoped); else None."""
        result = await self._session.execute(
            select(Category).where(
                Category.id == category_id,
                Category.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self, *, user_id: int, category_id: int, changes: Mapping[str, object]
    ) -> Category | None:
        """Apply ``changes`` to the user's category; None if it is not theirs.

        Only the keys the client actually sent are applied (true PATCH). The flush
        surfaces a rename collision as an ``IntegrityError`` for the service.
        """
        category = await self.get(user_id=user_id, category_id=category_id)
        if category is None:
            return None
        for field in _UPDATABLE_FIELDS:
            if field in changes:
                setattr(category, field, changes[field])
        await self._session.flush()
        return category

    async def archive(self, *, user_id: int, category_id: int) -> Category | None:
        """Soft-delete: set ``archived_at`` on the user's category; None if not theirs.

        Slice 002 always archives on delete (design Open question 1): the row stays a
        valid FK target and drops out of ``list_active``.
        """
        category = await self.get(user_id=user_id, category_id=category_id)
        if category is None:
            return None
        category.archived_at = datetime.now(timezone.utc)
        await self._session.flush()
        return category
