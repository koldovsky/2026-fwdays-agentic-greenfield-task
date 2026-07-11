"""Pure unit tests for M3 Focus / Deep Work (spec 004, FR-METR-03, architecture §3.3).

Tests the not-yet-written ``app.core.metrics.m3_focus`` module directly with fixture
``SessionData`` lists -- no DB, no ``RUN_DB_TESTS`` gate.

Expected pure API this file pins (new module, does not exist yet -> RED at
``ModuleNotFoundError``):

    @dataclass
    class FocusMetrics:
        deep_count: int
        deep_minutes: int
        deep_share: float

    def compute_focus(sessions: Sequence[SessionData]) -> FocusMetrics
        Operates over exactly the session list it is given -- no ``tz``/``today``/window
        parameters. The caller (the snapshot assembler) pre-filters ``sessions`` to
        whichever window applies (the current-week default or an explicit ``window``,
        per NFR-DET-01), so M3 itself never needs to know about calendar days: a deep
        block is a property of one whole session (net duration + pause count), never
        split by day attribution (§3.7) -- which is exactly what the midnight-spanning
        test below pins.

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``.
"""

from datetime import datetime, timedelta, timezone

UTC = timezone.utc


def _load() -> tuple[object, object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, PauseData, compute_focus)``.
    """
    from app.core.metrics.m3_focus import compute_focus
    from app.core.model import PauseData, SessionData

    return SessionData, PauseData, compute_focus


def test_exactly_60_minute_zero_pause_session_counts_as_a_deep_block() -> None:
    """A zero-pause session of exactly 60 net minutes is a deep block (E-5, inclusive).

    @trace FR-METR-03
    """
    SessionData, _PauseData, compute_focus = _load()
    start = datetime(2026, 1, 15, 9, 0, 0, tzinfo=UTC)
    session = SessionData(started_at=start, ended_at=start + timedelta(minutes=60), pauses=[])

    result = compute_focus([session])

    assert result.deep_count == 1
    assert result.deep_minutes == 60


def test_a_short_pause_disqualifies_an_otherwise_deep_session() -> None:
    """A >= 60 net-minute session with one pause segment does not count as deep (E-6).

    Gross 70 min with one 5-min pause nets 65 min (>= 60), but the single pause
    disqualifies it regardless.

    @trace FR-METR-03
    @trace FR-METR-04
    """
    SessionData, PauseData, compute_focus = _load()
    start = datetime(2026, 1, 15, 9, 0, 0, tzinfo=UTC)
    session = SessionData(
        started_at=start,
        ended_at=start + timedelta(minutes=70),
        pauses=[
            PauseData(
                paused_at=start + timedelta(minutes=30),
                resumed_at=start + timedelta(minutes=35),
            )
        ],
    )

    result = compute_focus([session])

    assert result.deep_count == 0
    assert result.deep_minutes == 0


def test_deep_share_divides_deep_minutes_by_total_window_net_minutes() -> None:
    """deep_share = deep_minutes / total net minutes in the window; 0 when the window is empty.

    @trace FR-METR-03
    """
    SessionData, _PauseData, compute_focus = _load()
    start = datetime(2026, 1, 15, 9, 0, 0, tzinfo=UTC)
    deep = SessionData(started_at=start, ended_at=start + timedelta(minutes=90), pauses=[])
    non_deep = SessionData(
        started_at=start + timedelta(hours=2),
        ended_at=start + timedelta(hours=2, minutes=30),
        pauses=[],
    )

    result = compute_focus([deep, non_deep])

    assert result.deep_minutes == 90
    assert result.deep_share == 90 / 120  # 90 deep of 120 total net minutes

    empty_result = compute_focus([])
    assert empty_result.deep_share == 0


def test_a_sub_60_minute_session_is_not_deep() -> None:
    """A zero-pause session of 59 net minutes is below the inclusive 60-minute boundary.

    @trace FR-METR-03
    """
    SessionData, _PauseData, compute_focus = _load()
    start = datetime(2026, 1, 15, 9, 0, 0, tzinfo=UTC)
    session = SessionData(started_at=start, ended_at=start + timedelta(minutes=59), pauses=[])

    result = compute_focus([session])

    assert result.deep_count == 0


def test_deep_block_stays_whole_and_is_attributed_to_its_start_day() -> None:
    """A midnight-spanning zero-pause session counts as ONE deep block, full duration (E-3).

    90 net minutes split 60-before/30-after local midnight (Jan15 23:00 -> Jan16
    00:30, zero pauses). A day-attribution bug that naively split this session by
    calendar day would report a 60-min "day-1" slice and a 30-min "day-2" slice --
    yielding deep_minutes=60 (wrong) instead of the whole 90. Asserting deep_minutes
    == 90 (not 60 or 0) is what proves the entity, and the deep block on it, is never
    split (§3.7, §3.3).

    @trace FR-METR-03
    @trace FR-METR-07
    """
    SessionData, _PauseData, compute_focus = _load()
    session = SessionData(
        started_at=datetime(2026, 1, 15, 23, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 16, 0, 30, 0, tzinfo=UTC),
        pauses=[],
    )

    result = compute_focus([session])

    assert result.deep_count == 1
    assert result.deep_minutes == 90
