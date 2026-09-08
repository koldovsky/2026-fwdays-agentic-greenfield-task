"""Repository for the ``sessions`` table (see app/repos/__init__.py).

Every method takes ``user_id`` and scopes every query by it (FR-AUTH-07): a
session owned by another user is never returned, so cross-user edit/delete
resolves to None here and a ``404`` at the API — existence is not revealed.
Pauses are discrete ``pause_segments`` rows managed through the ``Session.pauses``
relationship (cascade delete-orphan), so replacing the collection on edit deletes
the old segments and inserts the new ones. Commits are owned by the service.
"""

from collections.abc import Mapping, Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pause_segment import PauseSegment
from app.models.session import Session

# The scalar fields a PATCH may touch (pauses are handled separately).
_UPDATABLE_FIELDS = ("category_id", "started_at", "ended_at", "notes")

# A pause supplied to create/update as a ``(paused_at, resumed_at)`` pair.
Pause = tuple[datetime, datetime]


class SessionRepo:
    """Data access for saved sessions and their discrete pause segments."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self, *, user_id: int) -> Sequence[Session]:
        """The user's saved sessions, newest-first (started_at DESC, id DESC)."""
        result = await self._session.execute(
            select(Session)
            .where(Session.user_id == user_id)
            .order_by(Session.started_at.desc(), Session.id.desc())
        )
        return result.scalars().all()

    async def get(self, *, user_id: int, session_id: int) -> Session | None:
        """Load ``session_id`` only if it belongs to ``user_id`` (scoped); else None."""
        result = await self._session.execute(
            select(Session).where(Session.id == session_id, Session.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        user_id: int,
        category_id: int,
        started_at: datetime,
        ended_at: datetime,
        notes: str | None,
        source: str,
        pauses: Sequence[Pause],
    ) -> Session:
        """Insert one session plus one ``pause_segments`` row per pair."""
        row = Session(
            user_id=user_id,
            category_id=category_id,
            started_at=started_at,
            ended_at=ended_at,
            notes=notes,
            source=source,
        )
        row.pauses = [PauseSegment(paused_at=start, resumed_at=end) for start, end in pauses]
        self._session.add(row)
        await self._session.flush()
        return row

    async def update(
        self,
        *,
        user_id: int,
        session_id: int,
        changes: Mapping[str, object],
        pauses: Sequence[Pause] | None,
    ) -> Session | None:
        """Apply ``changes`` (and, if given, replace the whole pause set); None if not theirs."""
        row = await self.get(user_id=user_id, session_id=session_id)
        if row is None:
            return None
        for field_name in _UPDATABLE_FIELDS:
            if field_name in changes:
                setattr(row, field_name, changes[field_name])
        if pauses is not None:
            row.pauses = [PauseSegment(paused_at=start, resumed_at=end) for start, end in pauses]
        await self._session.flush()
        return row

    async def delete(self, *, user_id: int, session_id: int) -> bool:
        """Delete the user's session; its pause segments cascade. False if not theirs."""
        row = await self.get(user_id=user_id, session_id=session_id)
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True
