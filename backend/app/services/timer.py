"""Live-timer use-cases (FR-TIMER-01..06): start, pause, continue, stop, discard.

Owns the transaction (commits here; the router stays thin). Per-user isolation is
inherited from the user_id-scoped repos; ``category_id`` is validated against the
caller's own categories (reusing ``CategoryRepository``), so a foreign category is
a ``404``. The single-active rule is the DB ``UNIQUE(user_id)`` translated from an
``IntegrityError`` into ``ActiveSessionExistsError`` (409), mirroring
``AuthService.register``. State transitions carry the last-seen ``version``:
a wrong state *or* a stale version is ``InvalidTimerTransitionError`` (409) and
mutates nothing (optimistic concurrency, architecture §2.1).
"""

from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.active_session import ActiveSession
from app.models.session import Session
from app.repos.active_sessions import ActiveSessionRepo
from app.repos.categories import CategoryRepository
from app.repos.sessions import SessionRepo
from app.repos.undo import UndoRepo
from app.services.undo_support import (
    ACTION_DISCARD,
    iso,
    new_token,
    now_utc,
    parse_iso,
    undo_expiry,
)

STATE_RUNNING = "running"
STATE_PAUSED = "paused"
SOURCE_TIMER = "timer"


class NoActiveSessionError(Exception):
    """No active session to act on (stop/pause/continue/discard) (-> 404)."""


class ActiveSessionExistsError(Exception):
    """A second start while one is already active (-> 409)."""


class InvalidTimerTransitionError(Exception):
    """A wrong-state transition or a stale ``version`` (-> 409)."""


class TimerCategoryNotFoundError(Exception):
    """The category is not owned by this user (-> 404)."""


class TimerService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._active = ActiveSessionRepo(session)
        self._sessions = SessionRepo(session)
        self._undo = UndoRepo(session)
        self._categories = CategoryRepository(session)

    async def current(self, *, user_id: int) -> ActiveSession | None:
        """Return the caller's single active timer, or None (read-only).

        Lets the UI resume a running/paused timer after a reload or a tab switch
        instead of showing idle while the server still holds an active session.
        """
        return await self._active.get(user_id=user_id)

    async def start(self, *, user_id: int, category_id: int) -> ActiveSession:
        """Start the single active timer for a category the user owns (FR-TIMER-01)."""
        category = await self._categories.get(user_id=user_id, category_id=category_id)
        if category is None:
            raise TimerCategoryNotFoundError(category_id)
        try:
            row = await self._active.start(
                user_id=user_id, category_id=category_id, started_at=now_utc()
            )
            await self._session.commit()
        except IntegrityError as exc:
            # UNIQUE(user_id): a session is already active (incl. a start/start race).
            await self._session.rollback()
            raise ActiveSessionExistsError() from exc
        return row

    async def pause(self, *, user_id: int, version: int) -> ActiveSession:
        """Open a pause span on a running timer (FR-TIMER-02)."""
        row = await self._active.get(user_id=user_id)
        if row is None:
            raise NoActiveSessionError()
        if row.state != STATE_RUNNING or row.version != version:
            raise InvalidTimerTransitionError()
        row.state = STATE_PAUSED
        row.pause_started_at = now_utc()
        row.version += 1
        await self._session.commit()
        return row

    async def resume(self, *, user_id: int, version: int) -> ActiveSession:
        """Close the open pause span into ``accumulated_pauses`` (FR-TIMER-02)."""
        row = await self._active.get(user_id=user_id)
        if row is None:
            raise NoActiveSessionError()
        if row.state != STATE_PAUSED or row.version != version or row.pause_started_at is None:
            raise InvalidTimerTransitionError()
        closed = {"paused_at": iso(row.pause_started_at), "resumed_at": iso(now_utc())}
        # Reassign (not append) so SQLAlchemy detects the JSONB mutation.
        row.accumulated_pauses = [*row.accumulated_pauses, closed]
        row.pause_started_at = None
        row.state = STATE_RUNNING
        row.version += 1
        await self._session.commit()
        return row

    async def stop(
        self, *, user_id: int, version: int, category_id: int, notes: str | None
    ) -> Session:
        """Persist the session + its pauses and free the active slot atomically (FR-TIMER-03)."""
        row = await self._active.get(user_id=user_id)
        if row is None:
            raise NoActiveSessionError()
        if row.version != version:
            raise InvalidTimerTransitionError()
        category = await self._categories.get(user_id=user_id, category_id=category_id)
        if category is None:
            raise TimerCategoryNotFoundError(category_id)
        ended_at = now_utc()
        pauses = [
            (parse_iso(pair["paused_at"]), parse_iso(pair["resumed_at"]))
            for pair in row.accumulated_pauses
        ]
        # Stopping while paused: close the still-open span as a final pause segment
        # so the trailing paused time is excluded from net (architecture Open
        # question 2, resolved conservatively — flagged for the owner). The
        # happy path stops a running timer, where pause_started_at is None.
        if row.pause_started_at is not None:
            pauses.append((row.pause_started_at, ended_at))
        saved = await self._sessions.create(
            user_id=user_id,
            category_id=category_id,
            started_at=row.started_at,
            ended_at=ended_at,
            notes=notes,
            source=SOURCE_TIMER,
            pauses=pauses,
        )
        await self._active.delete(user_id=user_id)
        # One transaction: the saved session, its segments, and freeing the slot.
        await self._session.commit()
        return saved

    async def discard(self, *, user_id: int, version: int) -> str:
        """Delete the active timer, persisting nothing, and write an undo token (FR-TIMER-04)."""
        row = await self._active.get(user_id=user_id)
        if row is None:
            raise NoActiveSessionError()
        if row.version != version:
            raise InvalidTimerTransitionError()
        before_image: dict[str, Any] = {
            "category_id": row.category_id,
            "started_at": iso(row.started_at),
            "state": row.state,
            "pause_started_at": iso(row.pause_started_at) if row.pause_started_at else None,
            "accumulated_pauses": row.accumulated_pauses,
            "version": row.version,
        }
        now = now_utc()
        token = new_token()
        await self._undo.create(
            user_id=user_id,
            action=ACTION_DISCARD,
            before_image=before_image,
            token=token,
            expires_at=undo_expiry(now),
        )
        await self._active.delete(user_id=user_id)
        await self._session.commit()
        return token
