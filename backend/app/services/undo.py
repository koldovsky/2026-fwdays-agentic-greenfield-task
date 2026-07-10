"""Undo use-case (FR-NOTIF-01): the compensating restore for discard/edit/delete.

Loads the consumable before-image (else ``404`` — expired, consumed, or foreign)
and dispatches by ``action``: undo-of-delete re-inserts the session + pauses,
undo-of-edit reverts them to the prior values, undo-of-discard re-inserts the
active row. Undo-of-discard fails with ``409`` when a new active session already
occupies the single slot (FR-TIMER-06) — the ``UNIQUE(user_id)`` violation is
caught and rolled back so the new session is untouched. On success the token is
marked consumed (single-use). Owns the transaction.
"""

from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pause_segment import PauseSegment
from app.repos.active_sessions import ActiveSessionRepo
from app.repos.sessions import SessionRepo
from app.repos.undo import UndoRepo
from app.services.undo_support import (
    ACTION_DELETE,
    ACTION_DISCARD,
    ACTION_EDIT,
    now_utc,
    parse_iso,
)


class UndoNotFoundError(Exception):
    """The token is unknown, expired, already consumed, or not this user's (-> 404)."""


class UndoDiscardConflictError(Exception):
    """Un-discard blocked because a new active session already exists (-> 409)."""


class UndoService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._undo = UndoRepo(session)
        self._sessions = SessionRepo(session)
        self._active = ActiveSessionRepo(session)

    async def apply(self, *, user_id: int, token: str) -> None:
        """Restore the before-image for ``token`` and consume it."""
        now = now_utc()
        entry = await self._undo.get_consumable(user_id=user_id, token=token, now=now)
        if entry is None:
            raise UndoNotFoundError()
        image: dict[str, Any] = entry.before_image
        if entry.action == ACTION_DELETE:
            await self._restore_deleted(user_id=user_id, image=image)
        elif entry.action == ACTION_EDIT:
            await self._revert_edit(user_id=user_id, image=image)
        elif entry.action == ACTION_DISCARD:
            await self._restore_discarded(user_id=user_id, image=image)
        await self._undo.mark_consumed(user_id=user_id, token=token, now=now)
        await self._session.commit()

    async def _restore_deleted(self, *, user_id: int, image: dict[str, Any]) -> None:
        """Re-insert the removed session and its pause segments."""
        session = image["session"]
        pauses = [
            (parse_iso(pair["paused_at"]), parse_iso(pair["resumed_at"]))
            for pair in image["pauses"]
        ]
        await self._sessions.create(
            user_id=user_id,
            category_id=session["category_id"],
            started_at=parse_iso(session["started_at"]),
            ended_at=parse_iso(session["ended_at"]),
            notes=session["notes"],
            source=session["source"],
            pauses=pauses,
        )

    async def _revert_edit(self, *, user_id: int, image: dict[str, Any]) -> None:
        """Revert the session fields and pause set to the before-image."""
        session = image["session"]
        row = await self._sessions.get(user_id=user_id, session_id=session["id"])
        if row is None:
            raise UndoNotFoundError()
        row.category_id = session["category_id"]
        row.started_at = parse_iso(session["started_at"])
        row.ended_at = parse_iso(session["ended_at"])
        row.notes = session["notes"]
        row.pauses = [
            PauseSegment(
                paused_at=parse_iso(pair["paused_at"]),
                resumed_at=parse_iso(pair["resumed_at"]),
            )
            for pair in image["pauses"]
        ]

    async def _restore_discarded(self, *, user_id: int, image: dict[str, Any]) -> None:
        """Re-insert the active timer; 409 if a new active session now exists."""
        pause_started = image["pause_started_at"]
        try:
            await self._active.insert(
                user_id=user_id,
                category_id=image["category_id"],
                started_at=parse_iso(image["started_at"]),
                state=image["state"],
                pause_started_at=parse_iso(pause_started) if pause_started else None,
                accumulated_pauses=image["accumulated_pauses"],
                version=image["version"],
            )
        except IntegrityError as exc:
            # UNIQUE(user_id): the single slot is taken by a new active session.
            await self._session.rollback()
            raise UndoDiscardConflictError() from exc
