"""Pure unit tests for user-timezone day attribution (spec 004, FR-METR-07, architecture §3.7).

Tests the not-yet-written ``app.core.metrics.days`` module directly with fixture
``SessionData``/``PauseData`` lists (reused from slice 003's ``app.core.model``, per that
module's own docstring) — no DB, no FastAPI, no ``RUN_DB_TESTS`` gate.

Expected pure API this file pins (new module, ``app/core/metrics/days.py`` — does not
exist yet, so every test fails at RED with ``ModuleNotFoundError``):

    def daily_net_minutes(sessions: Sequence[SessionData], tz: str) -> dict[date, int]
        Splits each session's **net** minutes across the local calendar days it spans
        (minute-accurate at local midnight, pauses subtracted from the day they occur
        in). A day with no attributed minutes is simply absent from the returned dict
        (never a zero-valued key) — callers that need zero-filled ranges build that
        themselves from the window bounds they already know.

    def active_days(sessions: Sequence[SessionData], tz: str) -> set[date]
        The local calendar days receiving >= 1 attributed net minute.

    def local_start_day(session: SessionData, tz: str) -> date
        The local calendar day of a *single* session's ``started_at`` — used elsewhere
        (M3's deep-block attribution, M4's per-day session grouping) to attribute a
        whole, never-split entity to exactly one day, per §3.7's "session entity is
        never split" rule.

Imports are performed inside each test (via ``_load``) so the missing-module failure is
a clean per-test ``ModuleNotFoundError`` (the correct RED reason), not a collection error
that would swallow the rest of the file — mirrors ``tests/test_durations.py``.
"""

from datetime import date, datetime, timezone

UTC = timezone.utc

# A zero-pause session running local 23:00 (Jan 15) -> local 02:00 (Jan 16) in
# "Asia/Kolkata" (a fixed UTC+05:30 offset, no DST, so the arithmetic below is
# unambiguous). local 23:00 Jan15 = UTC 17:30 Jan15; local 02:00 Jan16 = UTC 20:30
# Jan15. Gross = net = 180 minutes (3 hours, no pauses). Split at local midnight:
# Jan15 gets 23:00->24:00 = 60 min; Jan16 gets 00:00->02:00 = 120 min.
KOLKATA = "Asia/Kolkata"
MIDNIGHT_SESSION_START = datetime(2026, 1, 15, 17, 30, 0, tzinfo=UTC)
MIDNIGHT_SESSION_END = datetime(2026, 1, 15, 20, 30, 0, tzinfo=UTC)


def _load() -> tuple[object, object, object, object, object]:
    """Import the not-yet-existing pure day-attribution API.

    Raises ``ModuleNotFoundError`` at RED; returns
    ``(SessionData, PauseData, daily_net_minutes, active_days, local_start_day)`` at GREEN.
    """
    from app.core.metrics.days import active_days, daily_net_minutes, local_start_day
    from app.core.model import PauseData, SessionData

    return SessionData, PauseData, daily_net_minutes, active_days, local_start_day


def test_midnight_spanning_session_splits_net_minutes_across_two_local_days() -> None:
    """A zero-pause 23:00->02:00 local session splits 60/120 net minutes across two local days.

    @trace FR-METR-07
    """
    SessionData, _PauseData, daily_net_minutes, _active_days, _local_start_day = _load()
    session = SessionData(
        started_at=MIDNIGHT_SESSION_START, ended_at=MIDNIGHT_SESSION_END, pauses=[]
    )

    result = daily_net_minutes([session], KOLKATA)

    assert result == {date(2026, 1, 15): 60, date(2026, 1, 16): 120}


def test_day_attribution_uses_user_timezone_at_a_boundary() -> None:
    """A session whose UTC date differs from the user's local date lands on the local day (E-4).

    @trace FR-METR-07
    """
    SessionData, _PauseData, daily_net_minutes, _active_days, _local_start_day = _load()
    # Local Jan16 02:00-03:00 (60 min, zero pauses) is UTC Jan15 20:30-21:30 -- the UTC
    # calendar date (Jan15) differs from the local calendar date (Jan16).
    session = SessionData(
        started_at=datetime(2026, 1, 15, 20, 30, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 15, 21, 30, 0, tzinfo=UTC),
        pauses=[],
    )

    result = daily_net_minutes([session], KOLKATA)

    # Attributed to the local day (Jan16), never the UTC day (Jan15).
    assert result == {date(2026, 1, 16): 60}


def test_active_day_is_any_day_with_at_least_one_attributed_minute() -> None:
    """Days with >= 1 attributed net minute are active; a day with no sessions is not.

    @trace FR-METR-07
    """
    SessionData, _PauseData, _daily_net_minutes, active_days, _local_start_day = _load()
    # tz doesn't matter for this scenario, so UTC keeps the fixture simple: one
    # session each on Jan10, Jan11, and Jan13 -- Jan12 is deliberately skipped.
    day1 = SessionData(
        started_at=datetime(2026, 1, 10, 9, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 10, 9, 30, 0, tzinfo=UTC),
        pauses=[],
    )
    day2 = SessionData(
        started_at=datetime(2026, 1, 11, 9, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 11, 9, 30, 0, tzinfo=UTC),
        pauses=[],
    )
    day3 = SessionData(
        started_at=datetime(2026, 1, 13, 9, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 13, 9, 30, 0, tzinfo=UTC),
        pauses=[],
    )

    result = active_days([day1, day2, day3], "UTC")

    assert result == {date(2026, 1, 10), date(2026, 1, 11), date(2026, 1, 13)}
    assert date(2026, 1, 12) not in result


def test_local_start_day_attributes_a_midnight_spanning_session_to_its_start_day() -> None:
    """A whole entity's local start day is the day the session began, not the day it ends on.

    Supporting unit for the days.py primitive that M3/M4 reuse to keep a whole session
    (a deep block, a day's switch grouping) attributed to one day, never split (§3.7).
    The canonical "deep block stays whole, attributed to its start day" acceptance
    scenario is encoded end-to-end at the M3 level (test_metrics_m3_focus.py), since its
    own WHEN clause is "M3 is computed" — this test covers the underlying days.py
    primitive that makes that possible.

    @trace FR-METR-07
    """
    SessionData, _PauseData, _daily_net_minutes, _active_days, local_start_day = _load()
    session = SessionData(
        started_at=MIDNIGHT_SESSION_START, ended_at=MIDNIGHT_SESSION_END, pauses=[]
    )

    assert local_start_day(session, KOLKATA) == date(2026, 1, 15)


def test_daily_net_minutes_excludes_days_a_session_never_touches() -> None:
    """A day the session list never touches is simply absent from the mapping.

    Sanity check on the "no zero-valued keys" contract this file's docstring pins,
    which the higher-level metrics (M1/M2/M5/heatmap) rely on to zero-fill only the
    days their own window actually needs.

    @trace FR-METR-07
    """
    SessionData, _PauseData, daily_net_minutes, _active_days, _local_start_day = _load()
    session = SessionData(
        started_at=datetime(2026, 1, 10, 9, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 10, 9, 30, 0, tzinfo=UTC),
        pauses=[],
    )

    result = daily_net_minutes([session], "UTC")

    assert date(2026, 1, 11) not in result
    assert result == {date(2026, 1, 10): 30}
