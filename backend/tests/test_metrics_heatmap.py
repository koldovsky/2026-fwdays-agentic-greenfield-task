"""Pure unit tests for the activity heatmap (spec 004, FR-HEAT-01/02, architecture §3.9).

Tests the not-yet-written ``app.core.metrics.heatmap`` module directly with fixture
``SessionData`` lists -- no DB, no ``RUN_DB_TESTS`` gate. The HTTP-level "requested
period" / "omitted period defaults to month" scenarios of FR-HEAT-02 (the
``GET /api/stats/heatmap`` contract) are covered separately in
``tests/test_stats_api.py``; this file covers the pure bucketing math both ids share.

Expected pure API this file pins (new module, does not exist yet -> RED at
``ModuleNotFoundError``):

    @dataclass
    class HeatmapDay:
        day: date
        net_minutes: int
        level: int   # 0-4

    def compute_heatmap(
        sessions: Sequence[SessionData], tz: str, today: date, period: str
    ) -> list[HeatmapDay]
        ``period`` is one of ``week|month|quarter|6mo|year``. Judgment call (not pinned
        by the ratified scenarios): each period is a **trailing window ending today**
        (inclusive) -- week=7 days, month=30, quarter=90, 6mo=182, year=365 -- rather
        than a calendar-aligned week/month/etc, since no scenario fixes the boundary
        and a trailing window is simplest/most defensible. Level 0 = 0 net minutes;
        levels 1-4 = the p25/p50/p75 cut points of the period's own non-zero daily
        totals (linear/"inclusive" interpolation, e.g. ``statistics.quantiles(...,
        method="inclusive")``) with level = 1 if value <= p25, 2 if <= p50, 3 if <=
        p75, else 4. Every fixture below is chosen so its expected bucketing is
        identical under both common quantile-interpolation conventions
        ("inclusive"/"exclusive"), verified ahead of time -- so this file's numeric
        assertions do not depend on which one the implementer picks, EXCEPT the
        period-re-normalization test, which states the "inclusive" outcome explicitly
        while noting both conventions agree on the qualitative claim being tested.

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``.
"""

from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc
KOLKATA = "Asia/Kolkata"  # fixed UTC+05:30, no DST -- see test_metrics_days.py


def _load() -> tuple[object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, compute_heatmap)``.
    """
    from app.core.metrics.heatmap import compute_heatmap

    from app.core.model import SessionData

    return SessionData, compute_heatmap


def _session_on(session_data_cls: object, day: date, minutes: int) -> object:
    start = datetime(day.year, day.month, day.day, 9, 0, 0, tzinfo=UTC)
    return session_data_cls(
        started_at=start, ended_at=start + timedelta(minutes=minutes), pauses=[]
    )


def _by_day(grid: list[object]) -> dict[date, object]:
    return {entry.day: entry for entry in grid}


def test_a_zero_minute_day_is_level_0() -> None:
    """A day within the period with 0 tracked net minutes is level 0.

    @trace FR-HEAT-01
    """
    SessionData, compute_heatmap = _load()
    today = date(2026, 9, 7)
    sessions = [_session_on(SessionData, today, 45)]  # only "today" has time this week

    grid = compute_heatmap(sessions, "UTC", today, "week")

    by_day = _by_day(grid)
    zero_day = by_day[date(2026, 9, 1)]  # within the trailing 7-day week, untouched
    assert zero_day.net_minutes == 0
    assert zero_day.level == 0


def test_non_zero_days_bucket_by_quartile_of_non_zero_totals() -> None:
    """Non-zero days map to level 1-4 by the p25/p50/p75 cut points of the period's totals.

    8 non-zero days at 10,20,...,80 min (period="month", today=2026-08-30, trailing
    30 days Aug1-Aug30). Precomputed p25/p50/p75 (both "inclusive" and "exclusive"
    quantile conventions agree on the resulting bucketing here): levels
    [1,1,2,2,3,3,4,4] for [10,20,30,40,50,60,70,80].

    @trace FR-HEAT-01
    """
    SessionData, compute_heatmap = _load()
    today = date(2026, 8, 30)
    values = {
        date(2026, 8, 1): 10,
        date(2026, 8, 2): 20,
        date(2026, 8, 3): 30,
        date(2026, 8, 4): 40,
        date(2026, 8, 5): 50,
        date(2026, 8, 6): 60,
        date(2026, 8, 7): 70,
        date(2026, 8, 8): 80,
    }
    sessions = [_session_on(SessionData, day, minutes) for day, minutes in values.items()]

    grid = compute_heatmap(sessions, "UTC", today, "month")

    by_day = _by_day(grid)
    expected_levels = {
        date(2026, 8, 1): 1,
        date(2026, 8, 2): 1,
        date(2026, 8, 3): 2,
        date(2026, 8, 4): 2,
        date(2026, 8, 5): 3,
        date(2026, 8, 6): 3,
        date(2026, 8, 7): 4,
        date(2026, 8, 8): 4,
    }
    for day, expected_level in expected_levels.items():
        assert by_day[day].net_minutes == values[day]
        assert by_day[day].level == expected_level


def test_buckets_self_normalize_to_the_user() -> None:
    """Two proportional user distributions map to the same relative levels (10x scale gap).

    User A: [10,20,30,40] min on Nov4-7. User B (10x A): [100,200,300,400] min on the
    same 4 days. Both distributions give identical quartile-level assignments
    [1,2,3,4] regardless of quantile-interpolation convention (verified ahead of
    time) -- proving intensity is relative to each user's own totals, not absolute.

    @trace FR-HEAT-01
    """
    SessionData, compute_heatmap = _load()
    today = date(2026, 11, 7)
    days = [date(2026, 11, 4), date(2026, 11, 5), date(2026, 11, 6), date(2026, 11, 7)]
    a_minutes = [10, 20, 30, 40]
    b_minutes = [100, 200, 300, 400]
    user_a = [_session_on(SessionData, d, m) for d, m in zip(days, a_minutes, strict=True)]
    user_b = [_session_on(SessionData, d, m) for d, m in zip(days, b_minutes, strict=True)]

    grid_a = _by_day(compute_heatmap(user_a, "UTC", today, "week"))
    grid_b = _by_day(compute_heatmap(user_b, "UTC", today, "week"))

    expected_levels = [1, 2, 3, 4]
    for day, expected_level in zip(days, expected_levels, strict=True):
        assert grid_a[day].level == expected_level
        assert grid_b[day].level == expected_level


def test_empty_history_yields_an_all_level_0_grid() -> None:
    """No sessions in the period -> every day in the grid is level 0, nothing errors (E-1).

    @trace FR-HEAT-01
    """
    _SessionData, compute_heatmap = _load()

    grid = compute_heatmap([], "UTC", date(2026, 9, 7), "week")

    assert len(grid) == 7  # the trailing 7-day week is still fully covered
    assert all(entry.level == 0 and entry.net_minutes == 0 for entry in grid)


def test_a_midnight_spanning_session_shades_both_local_days() -> None:
    """A session spanning local midnight shades both local days, matching M1's totals (E-3).

    Same fixture as test_metrics_days.py's midnight-split test: local Jan15 23:00 ->
    Jan16 02:00 (Kolkata, zero pauses) splits 60/120 net minutes across the two days.

    @trace FR-HEAT-01
    """
    SessionData, compute_heatmap = _load()
    session = SessionData(
        started_at=datetime(2026, 1, 15, 17, 30, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 15, 20, 30, 0, tzinfo=UTC),
        pauses=[],
    )

    grid = compute_heatmap([session], KOLKATA, date(2026, 1, 16), "week")

    by_day = _by_day(grid)
    assert by_day[date(2026, 1, 15)].net_minutes == 60
    assert by_day[date(2026, 1, 15)].level >= 1
    assert by_day[date(2026, 1, 16)].net_minutes == 120
    assert by_day[date(2026, 1, 16)].level >= 1


def test_changing_the_period_re_normalizes_the_buckets() -> None:
    """The same data queried as period=week vs period=year gets different intensity levels.

    "Today" (2026-10-31) always has 50 net minutes. Queried as period=week, the only
    other non-zero days are small (10/20/30 min), so today's 50 is the week's maximum
    -> level 4. Queried as period=year, four much larger days elsewhere in the last
    365 days (500/600/700/800 min) dilute the distribution, so the SAME 50-minute
    today now lands near the bottom -> level 2. (Verified ahead of time for the
    "inclusive" quantile convention; both conventions checked agree qualitatively that
    the week-level is higher than the year-level for this fixture.)

    @trace FR-HEAT-02
    """
    SessionData, compute_heatmap = _load()
    today = date(2026, 10, 31)
    sessions = [
        _session_on(SessionData, date(2026, 10, 26), 10),
        _session_on(SessionData, date(2026, 10, 27), 20),
        _session_on(SessionData, date(2026, 10, 28), 30),
        _session_on(SessionData, today, 50),
        _session_on(SessionData, date(2026, 1, 15), 500),
        _session_on(SessionData, date(2026, 2, 15), 600),
        _session_on(SessionData, date(2026, 3, 15), 700),
        _session_on(SessionData, date(2026, 4, 15), 800),
    ]

    week_grid = _by_day(compute_heatmap(sessions, "UTC", today, "week"))
    year_grid = _by_day(compute_heatmap(sessions, "UTC", today, "year"))

    assert week_grid[today].net_minutes == 50
    assert year_grid[today].net_minutes == 50
    assert week_grid[today].level == 4
    assert year_grid[today].level == 2
    assert week_grid[today].level != year_grid[today].level
