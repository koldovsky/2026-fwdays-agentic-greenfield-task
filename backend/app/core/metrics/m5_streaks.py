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
    """The longest run of calendar-consecutive dates in ``days``.

    O(n log n) in ``len(days)`` -- the actual number of *active* days -- via one sort
    plus a single linear pass over consecutive gaps. Deliberately **not** a day-by-day
    cursor walk from the earliest to the latest active day: that would cost
    O(calendar-day span between the earliest and latest active day), which nothing
    bounds (a user's history can span years with only a handful of active days in it,
    e.g. a week tracked years ago plus a week tracked recently), so it scales with how
    far apart two active days happen to be in time rather than with how much actual
    activity there is.
    """
    if not days:
        return 0
    ordered = sorted(days)
    longest = 1
    run = 1
    # Consecutive pairs: ``ordered[1:]`` is deliberately one element shorter than
    # ``ordered`` (the last day has no successor), so this zip is never ``strict``.
    for previous, current in zip(ordered, ordered[1:], strict=False):
        run = run + 1 if (current - previous).days == 1 else 1
        longest = max(longest, run)
    return longest


def _current_run(days: set[date], today: date) -> int:
    """The run ending today or yesterday -- a not-yet-tracked today does not break it."""
    cursor = today if today in days else today - timedelta(days=1)
    current = 0
    while cursor in days:
        current += 1
        cursor -= timedelta(days=1)
    return current


def compute_streaks(
    sessions: Sequence[SessionData],
    tz: str,
    today: date,
    *,
    daily_totals: dict[date, int] | None = None,
) -> StreakMetrics:
    """``daily_totals`` (optional): the full-history ``daily_net_minutes(sessions, tz)`` the
    caller has already computed. The active-day set is exactly that dict's keys
    (``daily_net_minutes`` only ever keys days with > 0 minutes), so passing it lets the
    snapshot assembler reuse one day-split instead of re-deriving it — identical result.
    """
    days = active_days(sessions, tz) if daily_totals is None else set(daily_totals)
    if not days:
        return StreakMetrics(current=0, longest=0)
    return StreakMetrics(current=_current_run(days, today), longest=_longest_run(days))
