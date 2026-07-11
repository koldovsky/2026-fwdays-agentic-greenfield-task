"""Pure unit tests for M5 Streaks (spec 004, FR-METR-05, architecture §3.5).

Tests the not-yet-written ``app.core.metrics.m5_streaks`` module directly with fixture
``SessionData`` lists -- no DB, no ``RUN_DB_TESTS`` gate.

Expected pure API this file pins (new module, does not exist yet -> RED at
``ModuleNotFoundError``):

    @dataclass
    class StreakMetrics:
        current: int
        longest: int

    def compute_streaks(sessions: Sequence[SessionData], tz: str, today: date) -> StreakMetrics
        ``current`` = the run of consecutive active days ending today or yesterday (a
        not-yet-tracked today does not break a live streak); ``longest`` = the max such
        run over all history. An "active day" is one with >= 1 attributed net minute
        (days.py's ``active_days``, §3.7).

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``.
"""

from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc


def _load() -> tuple[object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, compute_streaks)``.
    """
    from app.core.metrics.m5_streaks import compute_streaks
    from app.core.model import SessionData

    return SessionData, compute_streaks


def _sessions_on_days(session_data_cls: object, days: list[date]) -> list[object]:
    """One 30-min zero-pause session at 09:00 UTC on each of ``days``."""
    sessions = []
    for day in days:
        start = datetime(day.year, day.month, day.day, 9, 0, 0, tzinfo=UTC)
        sessions.append(
            session_data_cls(started_at=start, ended_at=start + timedelta(minutes=30), pauses=[])
        )
    return sessions


def _consecutive_days(end: date, count: int) -> list[date]:
    return [end - timedelta(days=offset) for offset in range(count)]


def test_current_streak_counts_consecutive_active_days_through_today() -> None:
    """6 consecutive active days including today -> current_streak = 6.

    @trace FR-METR-05
    """
    SessionData, compute_streaks = _load()
    today = date(2026, 4, 10)
    sessions = _sessions_on_days(SessionData, _consecutive_days(today, 6))

    result = compute_streaks(sessions, "UTC", today)

    assert result.current == 6
    assert result.longest == 6


def test_an_untracked_today_does_not_break_a_live_streak() -> None:
    """Nothing tracked yet today does not break a streak ending yesterday.

    @trace FR-METR-05
    """
    SessionData, compute_streaks = _load()
    today = date(2026, 4, 10)
    yesterday = today - timedelta(days=1)
    sessions = _sessions_on_days(SessionData, _consecutive_days(yesterday, 5))  # Apr5..Apr9

    result = compute_streaks(sessions, "UTC", today)

    assert result.current == 5


def test_longest_streak_is_the_maximum_run_over_all_history() -> None:
    """A past 19-day run and a current 6-day run -> longest=19, current=6.

    @trace FR-METR-05
    """
    SessionData, compute_streaks = _load()
    today = date(2026, 5, 1)
    current_run = _consecutive_days(today, 6)  # Apr26..May1
    past_run = _consecutive_days(date(2026, 3, 19), 19)  # Mar1..Mar19, a separate run
    sessions = _sessions_on_days(SessionData, current_run + past_run)

    result = compute_streaks(sessions, "UTC", today)

    assert result.current == 6
    assert result.longest == 19


def test_empty_history_yields_zero_streaks() -> None:
    """No saved sessions -> current=0 and longest=0, nothing errors (E-1).

    @trace FR-METR-05
    """
    _SessionData, compute_streaks = _load()

    result = compute_streaks([], "UTC", date(2026, 4, 10))

    assert result.current == 0
    assert result.longest == 0
