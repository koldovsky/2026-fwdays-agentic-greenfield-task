"""M2 Consistency Score (architecture §3.2, §3.8, FR-METR-02): the 50/50 blend.

Window is a fixed, internal trailing **14 calendar days** ending ``today`` — callers
never pass a window; ``sessions`` may carry a caller's whole history and this module
filters itself down to the 14 days it needs via ``app.core.metrics.days``.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from statistics import median, pstdev
from zoneinfo import ZoneInfo

from app.core.metrics.days import daily_net_minutes, local_start_day
from app.core.model import SessionData

_WINDOW_DAYS = 14
_MIN_ACTIVE_DAYS = 3
_START_BAND_MINUTES = 60
_BLEND_WEIGHT = 0.5


@dataclass
class ConsistencyMetrics:
    score: int | None
    low_confidence: bool
    regularity: float | None
    start_stability: float | None
    median_start_local: str | None


def _low_confidence() -> ConsistencyMetrics:
    return ConsistencyMetrics(
        score=None,
        low_confidence=True,
        regularity=None,
        start_stability=None,
        median_start_local=None,
    )


def _minutes_since_local_midnight(dt: datetime, zone: ZoneInfo) -> int:
    local = dt.astimezone(zone)
    return local.hour * 60 + local.minute


def _regularity(totals: list[int]) -> float:
    """``clamp(1 - CV, 0, 1) * 100`` over the 14 daily totals; 0 when the mean is 0."""
    mean_total = sum(totals) / len(totals)
    if mean_total == 0:
        return 0.0
    coefficient_of_variation = pstdev(totals) / mean_total
    return max(0.0, min(1.0, 1 - coefficient_of_variation)) * 100


def _first_start_minutes_by_day(
    sessions: Sequence[SessionData], tz: str, zone: ZoneInfo, window_days: set[date]
) -> dict[date, int]:
    """The earliest session start (minutes since local midnight) for each day in the window.

    Grouped by ``local_start_day`` (a whole-entity attribution, §3.7) so a day is only a
    candidate "first start" if some session actually *starts* on it — a day that is only
    active via spillover from a midnight-spanning session the day before has no start
    event of its own (an edge case the ratified scenarios do not exercise; documented
    here as the implementer's judgment call).
    """
    first_start_dt: dict[date, datetime] = {}
    for session in sessions:
        day = local_start_day(session, tz)
        if day not in window_days:
            continue
        if day not in first_start_dt or session.started_at < first_start_dt[day]:
            first_start_dt[day] = session.started_at
    return {day: _minutes_since_local_midnight(dt, zone) for day, dt in first_start_dt.items()}


def compute_consistency(
    sessions: Sequence[SessionData],
    tz: str,
    today: date,
    *,
    daily_totals: dict[date, int] | None = None,
) -> ConsistencyMetrics:
    """``daily_totals`` (optional): the full-history ``daily_net_minutes(sessions, tz)`` the
    caller has already computed. Passing it lets the snapshot assembler share one day-split
    across every metric instead of each re-deriving it; the active-day set is exactly that
    dict's keys (``daily_net_minutes`` only ever keys days with > 0 minutes), so the result
    is identical either way — this only removes recomputation.
    """
    zone = ZoneInfo(tz)
    window_start = today - timedelta(days=_WINDOW_DAYS - 1)
    window_dates = [window_start + timedelta(days=offset) for offset in range(_WINDOW_DAYS)]

    totals = daily_net_minutes(sessions, tz) if daily_totals is None else daily_totals
    window_active = {day for day in totals if window_start <= day <= today}
    if len(window_active) < _MIN_ACTIVE_DAYS:
        return _low_confidence()

    window_totals = [totals.get(day, 0) for day in window_dates]
    regularity = _regularity(window_totals)

    first_starts = _first_start_minutes_by_day(sessions, tz, zone, window_active)
    median_minutes = median(first_starts.values()) if first_starts else None
    within_band = (
        sum(
            1
            for minutes in first_starts.values()
            if abs(minutes - median_minutes) <= _START_BAND_MINUTES
        )
        if median_minutes is not None
        else 0
    )
    start_stability = (within_band / len(window_active)) * 100

    score = round(_BLEND_WEIGHT * regularity + _BLEND_WEIGHT * start_stability)
    median_start_local = (
        f"{int(median_minutes) // 60:02d}:{int(median_minutes) % 60:02d}"
        if median_minutes is not None
        else None
    )

    return ConsistencyMetrics(
        score=score,
        low_confidence=False,
        regularity=regularity,
        start_stability=start_stability,
        median_start_local=median_start_local,
    )
