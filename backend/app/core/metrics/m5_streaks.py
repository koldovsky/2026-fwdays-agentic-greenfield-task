"""M5 Streaks (architecture §3.5, FR-METR-05)."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from app.core.metrics.days import active_days
from app.core.model import SessionData


@dataclass
class StreakMetrics:
    current: int
    longest: int


def _longest_run(days: set[date]) -> int:
    longest = 0
    run = 0
    cursor = min(days)
    last = max(days)
    while cursor <= last:
        if cursor in days:
            run += 1
            longest = max(longest, run)
        else:
            run = 0
        cursor += timedelta(days=1)
    return longest


def _current_run(days: set[date], today: date) -> int:
    """The run ending today or yesterday -- a not-yet-tracked today does not break it."""
    cursor = today if today in days else today - timedelta(days=1)
    current = 0
    while cursor in days:
        current += 1
        cursor -= timedelta(days=1)
    return current


def compute_streaks(sessions: Sequence[SessionData], tz: str, today: date) -> StreakMetrics:
    days = active_days(sessions, tz)
    if not days:
        return StreakMetrics(current=0, longest=0)
    return StreakMetrics(current=_current_run(days, today), longest=_longest_run(days))
