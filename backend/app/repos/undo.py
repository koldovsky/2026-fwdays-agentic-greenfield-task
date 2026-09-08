"""Repository for the ``undo_entries`` table (see app/repos/__init__.py).

Every method takes ``user_id`` and scopes by it (FR-AUTH-07): a token is
consumable only when it matches the caller, is unconsumed, and is unexpired, so
another user's token is never resolved. Commits are owned by ``UndoService``.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.undo_entry import UndoEntry


class UndoRepo:
    """Data access for the single-use, expiring undo before-images."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        user_id: int,
        action: str,
        before_image: dict[str, Any],
        token: str,
        expires_at: datetime,
    ) -> UndoEntry:
        """Write a before-image for one undoable action."""
        row = UndoEntry(
            user_id=user_id,
            action=action,
            before_image=before_image,
            token=token,
            expires_at=expires_at,
        )
        self._session.add(row)
        await self._session.flush()
        return row

    async def get_consumable(
        self, *, user_id: int, token: str, now: datetime
    ) -> UndoEntry | None:
        """Return the entry for ``token`` if it is this user's, unconsumed, and unexpired."""
        result = await self._session.execute(
            select(UndoEntry).where(
                UndoEntry.token == token,
                UndoEntry.user_id == user_id,
                UndoEntry.consumed_at.is_(None),
                UndoEntry.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def mark_consumed(self, *, user_id: int, token: str, now: datetime) -> None:
        """Mark the user's token consumed so it cannot be replayed (single-use)."""
        await self._session.execute(
            update(UndoEntry)
            .where(UndoEntry.user_id == user_id, UndoEntry.token == token)
            .values(consumed_at=now)
        )
