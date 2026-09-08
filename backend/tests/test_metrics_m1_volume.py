"""Pure unit tests for M1 Volume (spec 004, FR-METR-01, architecture §3.1).

Tests the not-yet-written ``app.core.metrics.m1_volume`` module directly with fixture
``SessionData`` lists -- no DB, no ``RUN_DB_TESTS`` gate.

Expected pure API this file pins (new module, does not exist yet -> RED at
``ModuleNotFoundError``):

    @dataclass
    class VolumeMetrics:
        today_min: int
        week_min: int
        month_min: int
        all_time_min: int
        daily_avg_30d_min: float

    def compute_volume(sessions: Sequence[SessionData], tz: str, today: date) -> VolumeMetrics
        ``today``/``week`` (user-TZ Monday..today)/``month``/``all_time`` are the real
        calendar windows anchored on ``today`` -- NOT the caller-selected reporting
        ``window`` (that only re-scopes the snapshot's ``volume.per_day``, assembled
        separately in ``app/core/snapshot.py``, per NFR-DET-01's window scenarios).

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``,
matching ``tests/test_durations.py`` / ``tests/test_metrics_days.py``.
"""

from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc


def _load() -> tuple[object, object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, PauseData, compute_volume)``.
    """
    from app.core.metrics.m1_volume import compute_volume
    from app.core.model import PauseData, SessionData

    return SessionData, PauseData, compute_volume


def _session(sd: object, start: datetime, minutes: int) -> object:
    return sd(started_at=start, ended_at=start + timedelta(minutes=minutes), pauses=[])


def test_volume_sums_net_minutes_per_window() -> None:
    """today/this_week/this_month/all_time sum net minutes; daily_avg_30d divides by 30.

    today = 2026-01-20 (Tue); Monday of that week = 2026-01-19. Sessions:
      - Jan20 (today): 60 min             -> today, week, month, all_time, daily_avg
      - Jan19 (Monday, this week): 90 min -> week, month, all_time, daily_avg
      - Jan05 (this month, prior week): 120 min -> month, all_time, daily_avg
      - 2025-12-01 (prior month): 200 min -> all_time only
    Trailing 30 days ending 2026-01-20 = 2025-12-22..2026-01-20 (30 days), so Dec1
    falls outside it and the Dec1 session does not enter daily_avg_30d.

    @trace FR-METR-01
    """
    SessionData, _PauseData, compute_volume = _load()
    today = date(2026, 1, 20)
    sessions = [
        _session(SessionData, datetime(2026, 1, 20, 9, 0, 0, tzinfo=UTC), 60),
        _session(SessionData, datetime(2026, 1, 19, 9, 0, 0, tzinfo=UTC), 90),
        _session(SessionData, datetime(2026, 1, 5, 9, 0, 0, tzinfo=UTC), 120),
        _session(SessionData, datetime(2025, 12, 1, 9, 0, 0, tzinfo=UTC), 200),
    ]

    result = compute_volume(sessions, "UTC", today)

    assert result.today_min == 60
    assert result.week_min == 60 + 90  # today + Monday
    assert result.month_min == 60 + 90 + 120  # + the Jan5 session, same calendar month
    assert result.all_time_min == 60 + 90 + 120 + 200  # every session ever
    # (60 + 90 + 120) net minutes over the trailing 30 days ending today, / 30.
    assert result.daily_avg_30d_min == (60 + 90 + 120) / 30


def test_net_minutes_exclude_paused_spans() -> None:
    """A gross-90-min session with 30 min of pauses contributes 60 net minutes, not 90.

    @trace FR-METR-01
    """
    SessionData, PauseData, compute_volume = _load()
    today = date(2026, 3, 1)
    start = datetime(2026, 3, 1, 9, 0, 0, tzinfo=UTC)
    session = SessionData(
        started_at=start,
        ended_at=start + timedelta(minutes=90),
        pauses=[
            PauseData(
                paused_at=start + timedelta(minutes=20),
                resumed_at=start + timedelta(minutes=50),
            )
        ],
    )

    result = compute_volume([session], "UTC", today)

    assert result.all_time_min == 60
    assert result.today_min == 60


def test_empty_history_yields_zero_volume() -> None:
    """No saved sessions -> every M1 field is 0 and nothing errors (E-1).

    @trace FR-METR-01
    """
    _SessionData, _PauseData, compute_volume = _load()

    result = compute_volume([], "UTC", date(2026, 1, 20))

    assert result.today_min == 0
    assert result.week_min == 0
    assert result.month_min == 0
    assert result.all_time_min == 0
    assert result.daily_avg_30d_min == 0
