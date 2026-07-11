"""Stats use-cases (FR-METR-*, FR-HEAT-*): load a user's own rows, map to the pure core,
compute, and return the plain dict/dataclass results the API layer serializes.

Read-only: no repository write. Every repo call is user_id-scoped (FR-AUTH-07); this
service performs no cross-user filtering of its own beyond passing the caller's
``user_id`` straight through to already-scoped repository methods.

Also the **single choke point** every pure ``app/core/metrics/*`` call gets its session
list from, so it is where ``_within_session_span_cap`` (below) enforces a defensive bound
on one saved session's own gross span before that session ever reaches the pure core --
see that constant's own docstring for why.
"""

from datetime import date, datetime, timedelta, timezone
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

# Defensive bound on a single saved session's own gross span (``ended_at - started_at``).
#
# ``app/core/metrics/days.py``'s day-splitting (``_split_seconds_by_local_day``, called
# via ``daily_net_minutes``) walks a session's own span one *calendar day* at a time
# (FR-METR-07) and is invoked, on the caller's full session history, from >= 5 places
# across ``app/core/snapshot.py`` and ``app/core/metrics/heatmap.py`` -- independent of
# the ``window``/``period`` query params, which only bound the *reporting* range, not the
# underlying session data those functions read. Nothing upstream bounds how long a saved
# session's own span may be: ``app/services/sessions.py`` (slice-003-owned, out of this
# slice's reach) validates only ``ended_at > started_at``. That was harmless before this
# slice existed (a duration was an O(1) subtraction); this slice's day-by-day splitting
# turned an unbounded span into a live, event-loop-blocking compute cost on every stats
# read -- reachable via an ordinary ``POST /api/sessions`` (any authenticated user, own
# category) followed by a bare ``GET /api/stats/snapshot`` with no query parameters.
#
# 90 days is far beyond any legitimate work session (even a forgotten-running timer,
# stopped days late, would never need months) while comfortably covering real usage. The
# offending session is skipped, not clipped: this should never trigger on legitimate
# data, so there is no "correct" truncation to compute, and reporting a fabricated
# multi-month session as if it were real tracked time would be a worse outcome than
# simply omitting it -- the rest of the caller's history is still reported correctly.
# This is the one place every pure-core call gets its session list from, so the bound
# holds regardless of which metric (volume, consistency, streaks, baselines, heatmap...)
# ends up reading it.
_MAX_SESSION_SPAN_DAYS = 90


def _within_session_span_cap(row: Session) -> bool:
    """False if ``row``'s own gross span exceeds the defensive cap (see above)."""
    return (row.ended_at - row.started_at) <= timedelta(days=_MAX_SESSION_SPAN_DAYS)


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
        sessions = [
            _to_categorized_session(row)
            for row in session_rows
            if _within_session_span_cap(row)
        ]
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
