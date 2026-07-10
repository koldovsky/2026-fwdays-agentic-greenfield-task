"""Repository for the ``active_sessions`` table (see app/repos/__init__.py).

Every method takes ``user_id`` and scopes by it (FR-AUTH-07). ``start`` and
``insert`` rely on the ``UNIQUE(user_id)`` constraint to reject a second active
session: the flush raises ``IntegrityError`` for the service to translate into a
``409``. State transitions (pause/continue with the optimistic ``version`` guard)
are business logic and live in ``TimerService`` on the scoped row this returns.
Commits are owned by the calling service.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.active_session import ActiveSession


class ActiveSessionRepo:
    """Data access for the single live active timer per user."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, *, user_id: int) -> ActiveSession | None:
        """Return the user's active session, or None."""
        result = await self._session.execute(
            select(ActiveSession).where(ActiveSession.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def start(
        self, *, user_id: int, category_id: int, started_at: datetime
    ) -> ActiveSession:
        """Insert a fresh running timer; the flush surfaces a second-active 409."""
        row = ActiveSession(
            user_id=user_id,
            category_id=category_id,
            started_at=started_at,
            state="running",
            pause_started_at=None,
            accumulated_pauses=[],
            version=1,
        )
        self._session.add(row)
        await self._session.flush()
        return row

    async def insert(
        self,
        *,
        user_id: int,
        category_id: int,
        started_at: datetime,
        state: str,
        pause_started_at: datetime | None,
        accumulated_pauses: list[dict[str, Any]],
        version: int,
    ) -> ActiveSession:
        """Re-insert a full active row (undo-of-discard); flush surfaces a 409."""
        row = ActiveSession(
            user_id=user_id,
            category_id=category_id,
            started_at=started_at,
            state=state,
            pause_started_at=pause_started_at,
            accumulated_pauses=accumulated_pauses,
            version=version,
        )
        self._session.add(row)
        await self._session.flush()
        return row

    async def delete(self, *, user_id: int) -> None:
        """Delete the user's active session (stop / discard)."""
        await self._session.execute(
            delete(ActiveSession).where(ActiveSession.user_id == user_id)
        )
