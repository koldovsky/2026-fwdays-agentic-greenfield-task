"""Activity heatmap day-bucket aggregation (architecture §3.9, FR-HEAT-01/02)."""

import statistics
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from app.core.metrics.days import daily_net_minutes
from app.core.model import SessionData

# Each period is a trailing window ending ``today`` (inclusive) -- a judgment call (no
# ratified scenario fixes the boundary); a trailing window is simplest/most defensible.
_PERIOD_SPAN_DAYS = {
    "week": 7,
    "month": 30,
    "quarter": 90,
    "6mo": 182,
    "year": 365,
}


@dataclass
class HeatmapDay:
    day: date
    net_minutes: int
    level: int


def _quartile_cutpoints(non_zero_totals: list[int]) -> tuple[float, float, float] | None:
    """p25/p50/p75 of the non-zero totals ("inclusive" interpolation), or ``None`` if < 2."""
    if len(non_zero_totals) < 2:
        return None
    p25, p50, p75 = statistics.quantiles(non_zero_totals, n=4, method="inclusive")
    return p25, p50, p75


def _level_for(value: int, cutpoints: tuple[float, float, float] | None) -> int:
    if value <= 0:
        return 0
    if cutpoints is None:
        # The single non-zero day in the period -- unambiguously the most intense one
        # available (no second data point to form real quartiles against).
        return 4
    p25, p50, p75 = cutpoints
    if value <= p25:
        return 1
    if value <= p50:
        return 2
    if value <= p75:
        return 3
    return 4


def compute_heatmap(
    sessions: Sequence[SessionData], tz: str, today: date, period: str
) -> list[HeatmapDay]:
    span = _PERIOD_SPAN_DAYS[period]
    start = today - timedelta(days=span - 1)
    window_days = [start + timedelta(days=offset) for offset in range(span)]

    totals = daily_net_minutes(sessions, tz)
    values = [totals.get(day, 0) for day in window_days]
    cutpoints = _quartile_cutpoints(sorted(value for value in values if value > 0))

    return [
        HeatmapDay(day=day, net_minutes=value, level=_level_for(value, cutpoints))
        for day, value in zip(window_days, values, strict=True)
    ]
