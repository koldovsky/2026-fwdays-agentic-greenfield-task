"""Stats use-cases (FR-METR-*, FR-HEAT-*): load a user's own rows, map to the pure core,
compute, and return the plain dict/dataclass results the API layer serializes.

Read-only: no repository write. Every repo call is user_id-scoped (FR-AUTH-07); this
service performs no cross-user filtering of its own beyond passing the caller's
``user_id`` straight through to already-scoped repository methods.
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.metrics.heatmap import HeatmapDay, compute_heatmap
from app.core.metrics.model import CategorizedSession, CategoryInfo
from app.core.model import PauseData, SessionData
from app.core.snapshot import build_snapshot
from app.models.session import Session
from app.repos.category_reads import CategoryReadRepo
from app.repos.sessions import SessionRepo
from app.repos.users import UserRepository


class UserNotFoundError(Exception):
    """The ``user_id`` resolved to no user row (should not happen behind CurrentUser)."""


def _to_session_data(row: Session) -> SessionData:
    return SessionData(
        started_at=row.started_at,
        ended_at=row.ended_at,
        pauses=[
            PauseData(paused_at=pause.paused_at, resumed_at=pause.resumed_at)
            for pause in row.pauses
        ],
    )


def _to_categorized_session(row: Session) -> CategorizedSession:
    return CategorizedSession(session=_to_session_data(row), category_id=row.category_id)


def _today_in_tz(tz: str) -> date:
    """The current local calendar day in ``tz`` -- "today" for every pure metric call."""
    return datetime.now(timezone.utc).astimezone(ZoneInfo(tz)).date()


class StatsService:
    def __init__(self, session: AsyncSession) -> None:
        self._sessions = SessionRepo(session)
        self._categories = CategoryReadRepo(session)
        self._users = UserRepository(session)

    async def _load(
        self, *, user_id: int
    ) -> tuple[list[CategorizedSession], list[CategoryInfo], str]:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        session_rows = await self._sessions.list(user_id=user_id)
        category_rows = await self._categories.list_all(user_id=user_id)
        sessions = [_to_categorized_session(row) for row in session_rows]
        categories = [
            CategoryInfo(
                id=row.id, name=row.name, color=row.color, archived=row.archived_at is not None
            )
            for row in category_rows
        ]
        return sessions, categories, user.timezone

    async def get_snapshot(
        self, *, user_id: int, window: tuple[date, date] | None
    ) -> dict[str, object]:
        """The architecture §4.1 snapshot for ``user_id``, optionally re-scoped by ``window``."""
        sessions, categories, tz = await self._load(user_id=user_id)
        today = _today_in_tz(tz)
        return build_snapshot(sessions, categories, tz, today, window=window)

    async def get_heatmap(self, *, user_id: int, period: str) -> list[HeatmapDay]:
        """The bucketed activity-heatmap grid for ``user_id`` over ``period``."""
        sessions, _categories, tz = await self._load(user_id=user_id)
        today = _today_in_tz(tz)
        return compute_heatmap([entry.session for entry in sessions], tz, today, period)
