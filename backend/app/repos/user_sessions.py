"""Repository for the ``user_sessions`` table (see app/repos/__init__.py for the rule)."""

from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_session import UserSession


class UserSessionRepository:
    """Data access for server-side sessions. Commits are owned by the calling service."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, *, user_id: int, token: str, expires_at: datetime) -> UserSession:
        """Persist a new session for ``user_id`` (user_id-scoped write)."""
        row = UserSession(user_id=user_id, token=token, expires_at=expires_at)
        self._session.add(row)
        await self._session.flush()
        return row

    async def get_active_by_token(self, token: str, *, now: datetime) -> UserSession | None:
        """Return the non-expired session for ``token``, or None.

        The one sanctioned unscoped method: it resolves the session cookie into a
        session row and therefore *produces* the ``user_id`` used everywhere else.
        Expired sessions (``expires_at <= now``) are treated as absent.
        """
        result = await self._session.execute(
            select(UserSession).where(
                UserSession.token == token,
                UserSession.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, *, user_id: int, token: str) -> None:
        """Delete the session for logout — only if it belongs to ``user_id`` (scoped)."""
        await self._session.execute(
            delete(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.token == token,
            )
        )

    async def extend_expiry(self, *, user_id: int, token: str, expires_at: datetime) -> None:
        """Slide the session's expiry forward on authenticated activity (scoped)."""
        await self._session.execute(
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.token == token)
            .values(expires_at=expires_at)
        )
