"""Repository for the coach tables (see app/repos/__init__.py for the rule).

Every method takes ``user_id`` and scopes every query by it (FR-AUTH-07): one user's
thread and cached insights are never visible to another. Commits are owned by the calling
service. The thread read returns the most recent turns newest-first (with an ``id``
tiebreaker so two turns written in the same transaction still order deterministically); the
service reverses them to chronological order for the §4.3 trimmer.
"""

from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coach import CoachInsight, CoachMessage

# Upper bound on the thread rows read per request: the §4.3 assembly keeps at most the 20
# most recent turns, so reading twice that is always enough to trim from while keeping the
# query bounded (a thread grows unboundedly over a user's lifetime).
_RECENT_TURNS_LIMIT = 40


class CoachRepo:
    """Data access for a user's coach thread and cached weekly insights."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def recent_turns(self, *, user_id: int) -> list[dict[str, str]]:
        """The user's most recent turns, newest-first, as ``{"role", "content"}`` dicts."""
        result = await self._session.execute(
            select(CoachMessage)
            .where(CoachMessage.user_id == user_id)
            .order_by(CoachMessage.created_at.desc(), CoachMessage.id.desc())
            .limit(_RECENT_TURNS_LIMIT)
        )
        return [{"role": row.role, "content": row.content} for row in result.scalars().all()]

    async def add_turn(self, *, user_id: int, role: str, content: str, language: str) -> None:
        """Append one turn to the user's thread (flushed to assign a monotonic id)."""
        self._session.add(
            CoachMessage(user_id=user_id, role=role, content=content, language=language)
        )
        await self._session.flush()

    async def get_insight(self, *, user_id: int, week_start: date) -> CoachInsight | None:
        """The cached insight for ``(user_id, week_start)`` if present; else None."""
        result = await self._session.execute(
            select(CoachInsight).where(
                CoachInsight.user_id == user_id, CoachInsight.week_start == week_start
            )
        )
        return result.scalar_one_or_none()

    async def upsert_insight(
        self, *, user_id: int, week_start: date, payload: dict[str, Any]
    ) -> None:
        """Insert or replace the cached card for ``(user_id, week_start)`` (read-through cache)."""
        existing = await self.get_insight(user_id=user_id, week_start=week_start)
        if existing is not None:
            existing.payload = payload
        else:
            self._session.add(
                CoachInsight(user_id=user_id, week_start=week_start, payload=payload)
            )
        await self._session.flush()
