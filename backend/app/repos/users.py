"""Repository for the ``users`` table (see app/repos/__init__.py for the rule)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Data access for accounts. Commits are owned by the calling service."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        """Look up an account by email (case-insensitive via CITEXT).

        Identity bootstrap for register (duplicate check) and login — runs before
        an authenticated ``user_id`` exists, so it is intentionally not scoped.
        """
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        """Load the account for ``user_id`` (the users PK *is* the user id)."""
        result = await self._session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, *, email: str, password_hash: str) -> User:
        """Insert a new account and return it fully populated (server defaults included).

        Identity bootstrap for register. Flushes to obtain the generated id and
        refreshes so ``timezone`` / ``coach_language`` reflect their DB defaults.
        """
        user = User(email=email, password_hash=password_hash)
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user
