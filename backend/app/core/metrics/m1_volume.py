"""M1 Volume (architecture §3.1, FR-METR-01): net-minute sums per calendar window."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from app.core.metrics.days import daily_net_minutes
from app.core.model import SessionData

_TRAILING_30_DAYS = 30


@dataclass
class VolumeMetrics:
    today_min: int
    week_min: int
    month_min: int
    all_time_min: int
    daily_avg_30d_min: float


def _monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def compute_volume(sessions: Sequence[SessionData], tz: str, today: date) -> VolumeMetrics:
    """``today``/``week``/``month``/``all_time`` are real calendar windows anchored on ``today``.

    Not the caller-selected reporting ``window`` — that only re-scopes the snapshot's
    ``volume.per_day``, assembled separately in ``app/core/snapshot.py`` (NFR-DET-01).
    """
    totals = daily_net_minutes(sessions, tz)
    week_start = _monday_of(today)
    month_start = today.replace(day=1)
    trailing_30_start = today - timedelta(days=_TRAILING_30_DAYS - 1)

    today_min = totals.get(today, 0)
    week_min = sum(minutes for day, minutes in totals.items() if week_start <= day <= today)
    month_min = sum(minutes for day, minutes in totals.items() if month_start <= day <= today)
    all_time_min = sum(totals.values())
    trailing_30_total = sum(
        minutes for day, minutes in totals.items() if trailing_30_start <= day <= today
    )

    return VolumeMetrics(
        today_min=today_min,
        week_min=week_min,
        month_min=month_min,
        all_time_min=all_time_min,
        daily_avg_30d_min=trailing_30_total / _TRAILING_30_DAYS,
    )
