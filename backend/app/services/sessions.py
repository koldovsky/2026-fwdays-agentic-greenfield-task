"""Saved-session use-cases (FR-SESS-01..06): manual add, edit, delete, log.

Owns the transaction (commits here). Per-user isolation is inherited from the
user_id-scoped ``SessionRepo``; ``category_id`` is validated against the caller's
own categories, so a foreign category is a ``404`` and a foreign session id is a
``404`` (existence is not revealed). Bounds are validated in one place
(``_validate_bounds``) for both add and edit — ``ended_at > started_at`` and each
pause within ``[started_at, ended_at]`` — surfacing a ``422``. Edit and delete
write a before-image and return an undo token (architecture §6).
"""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session
from app.repos.categories import CategoryRepository
from app.repos.sessions import Pause, SessionRepo
from app.repos.undo import UndoRepo
from app.services.undo_support import (
    ACTION_DELETE,
    ACTION_EDIT,
    new_token,
    now_utc,
    session_before_image,
    undo_expiry,
)

SOURCE_MANUAL = "manual"


class SessionNotFoundError(Exception):
    """The session does not exist or is not owned by this user (-> 404)."""


class SessionCategoryNotFoundError(Exception):
    """The category is not owned by this user (-> 404)."""


class InvalidSessionBoundsError(Exception):
    """``ended_at`` not after ``started_at``, or a pause outside the session (-> 422)."""


def _validate_bounds(
    started_at: datetime, ended_at: datetime, pauses: Sequence[Pause]
) -> None:
    """Reject invalid session/pause bounds with a 422-mapped domain error."""
    if ended_at <= started_at:
        raise InvalidSessionBoundsError("ended_at must be after started_at")
    for paused_at, resumed_at in pauses:
        if resumed_at <= paused_at:
            raise InvalidSessionBoundsError("resumed_at must be after paused_at")
        if paused_at < started_at or resumed_at > ended_at:
            raise InvalidSessionBoundsError("a pause must lie within the session")


class SessionService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._sessions = SessionRepo(session)
        self._categories = CategoryRepository(session)
        self._undo = UndoRepo(session)

    async def list_log(self, *, user_id: int) -> Sequence[Session]:
        """The user's saved-session log, newest-first with derived durations."""
        return await self._sessions.list(user_id=user_id)

    async def add_manual(
        self,
        *,
        user_id: int,
        category_id: int,
        started_at: datetime,
        ended_at: datetime,
        notes: str | None,
        pauses: Sequence[Pause],
    ) -> Session:
        """Add a past session with its pauses (FR-SESS-03), source ``manual``."""
        category = await self._categories.get(user_id=user_id, category_id=category_id)
        if category is None:
            raise SessionCategoryNotFoundError(category_id)
        _validate_bounds(started_at, ended_at, pauses)
        saved = await self._sessions.create(
            user_id=user_id,
            category_id=category_id,
            started_at=started_at,
            ended_at=ended_at,
            notes=notes,
            source=SOURCE_MANUAL,
            pauses=pauses,
        )
        await self._session.commit()
        return saved

    async def edit(
        self,
        *,
        user_id: int,
        session_id: int,
        category_id: int | None,
        started_at: datetime | None,
        ended_at: datetime | None,
        notes: str | None,
        pauses: Sequence[Pause] | None,
    ) -> tuple[Session, str]:
        """Edit a session incl. its pause set, capturing a before-image (FR-SESS-04).

        A ``None`` scalar means "leave unchanged"; ``pauses`` present (even empty)
        replaces the whole set, ``pauses=None`` leaves the segments untouched.
        """
        existing = await self._sessions.get(user_id=user_id, session_id=session_id)
        if existing is None:
            raise SessionNotFoundError(session_id)
        before_image = session_before_image(existing)  # captured before any mutation

        effective_started = started_at if started_at is not None else existing.started_at
        effective_ended = ended_at if ended_at is not None else existing.ended_at
        effective_pauses: Sequence[Pause] = (
            pauses
            if pauses is not None
            else [(p.paused_at, p.resumed_at) for p in existing.pauses]
        )
        if category_id is not None:
            category = await self._categories.get(user_id=user_id, category_id=category_id)
            if category is None:
                raise SessionCategoryNotFoundError(category_id)
        _validate_bounds(effective_started, effective_ended, effective_pauses)

        changes: dict[str, object] = {}
        if category_id is not None:
            changes["category_id"] = category_id
        if started_at is not None:
            changes["started_at"] = started_at
        if ended_at is not None:
            changes["ended_at"] = ended_at
        if notes is not None:
            changes["notes"] = notes

        token = new_token()
        await self._undo.create(
            user_id=user_id,
            action=ACTION_EDIT,
            before_image=before_image,
            token=token,
            expires_at=undo_expiry(now_utc()),
        )
        updated = await self._sessions.update(
            user_id=user_id, session_id=session_id, changes=changes, pauses=pauses
        )
        # Same scoped row we already resolved above; cannot be None here.
        assert updated is not None
        await self._session.commit()
        return updated, token

    async def delete(self, *, user_id: int, session_id: int) -> str:
        """Delete a session (pauses cascade), capturing a before-image (FR-SESS-05)."""
        existing = await self._sessions.get(user_id=user_id, session_id=session_id)
        if existing is None:
            raise SessionNotFoundError(session_id)
        before_image = session_before_image(existing)
        token = new_token()
        await self._undo.create(
            user_id=user_id,
            action=ACTION_DELETE,
            before_image=before_image,
            token=token,
            expires_at=undo_expiry(now_utc()),
        )
        await self._sessions.delete(user_id=user_id, session_id=session_id)
        await self._session.commit()
        return token
