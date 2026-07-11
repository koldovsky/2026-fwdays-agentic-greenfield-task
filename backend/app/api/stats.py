"""Stats router (FR-METR-*, FR-HEAT-*), behind the slice 001 auth boundary.

Thin transport: both routes take ``CurrentUser`` and delegate straight to
``StatsService``, which does the user_id-scoped loading (FR-AUTH-07); the router's own
job is parsing the ``window``/``period`` query params and shaping the response.
Read-only GETs -- no CSRF dependency (that guards mutating requests only, architecture
§8.2).
"""

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.stats import HeatmapDayRead, HeatmapResponse, SnapshotResponse
from app.services.stats import StatsService

router = APIRouter(prefix="/api/stats", tags=["stats"])

_VALID_PERIODS = ("week", "month", "quarter", "6mo", "year")
_DEFAULT_PERIOD = "month"
_WINDOW_SEPARATOR = ".."

# Upper bound on a custom `window`'s inclusive day span. Without this, an authenticated
# caller with zero sessions can request e.g. `?window=0001-01-01..9999-12-31` and force
# `snapshot.py`'s `_date_range` to materialize ~3.65M `date` objects, driving unbounded
# O(days) / O(days x sessions) list-building in `volume.per_day` / `switching.per_day` /
# `per_category_per_day` -- a single-request resource-exhaustion DoS against the shared
# backend process. 366 days (~1 year, +1 to comfortably cover a leap year) mirrors the
# longest trailing period the heatmap endpoint itself ever computes (`year` = 365 days,
# `app/core/metrics/heatmap.py`'s `_PERIOD_SPAN_DAYS`) while still comfortably covering
# any legitimate custom-range query -- a full year of daily data is already far more than
# a snapshot chart usefully renders.
_MAX_WINDOW_DAYS = 366


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=detail)


def _parse_window(raw: str | None) -> tuple[date, date] | None:
    """Parse ``START..END`` (ISO dates) into a ``(start, end)`` pair; ``None`` if absent."""
    if raw is None:
        return None
    parts = raw.split(_WINDOW_SEPARATOR)
    if len(parts) != 2:
        raise _bad_request("window must be ISO dates joined by '..', e.g. 2026-01-01..2026-01-03")
    try:
        start = date.fromisoformat(parts[0])
        end = date.fromisoformat(parts[1])
    except ValueError as exc:
        raise _bad_request("window dates must be ISO format (YYYY-MM-DD)") from exc
    if end < start:
        raise _bad_request("window end must not be before start")
    span_days = (end - start).days + 1
    if span_days > _MAX_WINDOW_DAYS:
        raise _bad_request(f"window must not span more than {_MAX_WINDOW_DAYS} days")
    return start, end


@router.get("/snapshot", response_model=SnapshotResponse)
async def get_snapshot(
    session: SessionDep,
    user: CurrentUser,
    window: str | None = Query(default=None),
) -> dict[str, object]:
    """The architecture §4.1 snapshot for the caller, optionally re-scoped by ``window``."""
    parsed_window = _parse_window(window)
    return await StatsService(session).get_snapshot(user_id=user.id, window=parsed_window)


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    session: SessionDep,
    user: CurrentUser,
    period: str = Query(default=_DEFAULT_PERIOD),
) -> HeatmapResponse:
    """The bucketed activity-heatmap grid for the caller over ``period`` (default: month)."""
    if period not in _VALID_PERIODS:
        raise _bad_request(f"period must be one of {', '.join(_VALID_PERIODS)}")
    grid = await StatsService(session).get_heatmap(user_id=user.id, period=period)
    return HeatmapResponse(period=period, days=[HeatmapDayRead.from_core(entry) for entry in grid])
