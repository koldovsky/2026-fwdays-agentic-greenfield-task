"""Category use-cases: create, list, edit, delete-as-archive.

Owns the transaction (commits here; the router stays thin) and translates a
partial-unique-index violation into ``DuplicateCategoryNameError`` the race-safe
way — catch ``IntegrityError`` and roll back, mirroring ``AuthService.register`` —
so a concurrent duplicate becomes a clean ``409`` rather than a 500. Per-user
isolation is inherited from the user_id-scoped ``CategoryRepository``.
"""

from collections.abc import Mapping, Sequence

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.repos.categories import CategoryRepository


class DuplicateCategoryNameError(Exception):
    """A create/rename collides with one of the user's active category names (-> 409)."""


class CategoryNotFoundError(Exception):
    """The category does not exist or is not owned by this user (-> 404)."""


class CategoryService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = CategoryRepository(session)

    async def create(
        self, *, user_id: int, name: str, color: str, description: str | None
    ) -> Category:
        """Create a category; reject a duplicate active name with a domain error."""
        try:
            category = await self._repo.create(
                user_id=user_id, name=name, color=color, description=description
            )
            await self._session.commit()
        except IntegrityError as exc:
            # Duplicate active name (partial unique index), incl. a create/create race.
            await self._session.rollback()
            raise DuplicateCategoryNameError(name) from exc
        return category

    async def list_active(self, *, user_id: int) -> Sequence[Category]:
        """Return the user's active categories (the read surface the screen consumes)."""
        return await self._repo.list_active(user_id=user_id)

    async def update(
        self, *, user_id: int, category_id: int, changes: Mapping[str, object]
    ) -> Category:
        """Edit the user's category; 404 if not theirs, 409 on a rename collision."""
        try:
            category = await self._repo.update(
                user_id=user_id, category_id=category_id, changes=changes
            )
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise DuplicateCategoryNameError() from exc
        if category is None:
            raise CategoryNotFoundError(category_id)
        return category

    async def delete(self, *, user_id: int, category_id: int) -> None:
        """Delete = archive the user's category; 404 if it is not theirs."""
        category = await self._repo.archive(user_id=user_id, category_id=category_id)
        if category is None:
            raise CategoryNotFoundError(category_id)
        await self._session.commit()
