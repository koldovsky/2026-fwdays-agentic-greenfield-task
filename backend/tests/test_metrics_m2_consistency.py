"""Pure unit tests for M2 Consistency (spec 004, FR-METR-02, architecture §3.2, §3.8).

Tests the not-yet-written ``app.core.metrics.m2_consistency`` module directly with
fixture ``SessionData`` lists over its fixed, internal trailing-14-calendar-day window
ending ``today`` -- no DB, no ``RUN_DB_TESTS`` gate.

Expected pure API this file pins (new module, does not exist yet -> RED at
``ModuleNotFoundError``):

    @dataclass
    class ConsistencyMetrics:
        score: int | None
        low_confidence: bool
        regularity: float | None
        start_stability: float | None
        median_start_local: str | None   # "HH:MM" 24h local time, or None

    def compute_consistency(
        sessions: Sequence[SessionData], tz: str, today: date
    ) -> ConsistencyMetrics
        The 14-day window is internal/fixed (today-13..today); callers never pass a window.

Low-confidence shape (a judgment call the ratified spec leaves open -- "null with a
low-confidence flag" but not the field names): ``score=None, low_confidence=True`` and
every other field also ``None``, applied uniformly below < 3 active days. This is the
contract the implementer must satisfy.

Population standard deviation (``statistics.pstdev``, ddof=0) is assumed for CV -- the
whole 14-day window is the full population of interest, not a sample; regularity is
computed with the Bash tool ahead of time and pinned via ``pytest.approx``.

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``.
"""

from datetime import date, datetime, timedelta, timezone

import pytest

UTC = timezone.utc


def _load() -> tuple[object, object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, PauseData, compute_consistency)``.
    """
    from app.core.metrics.m2_consistency import compute_consistency
    from app.core.model import PauseData, SessionData

    return SessionData, PauseData, compute_consistency


def _blend_fixture_sessions(session_data_cls: object) -> list[object]:
    """11 active days (Feb1..Feb11 2026) at 60 net min each, 3 zero days (Feb12-14).

    First-session-start times (minutes since local midnight), one per active day, in
    day order: 540, 545, 550, 555, 560, 535, 530, 525, 520, 900, 300 -- 9 clustered
    around 540 (09:00) and 2 outliers (900=15:00, 300=05:00). n=11 (odd) so the median
    is a single data point (540 = 09:00), never an average of two, avoiding rounding
    ambiguity in ``median_start_local``.

    Precomputed (population stdev, CV = pstdev/mean over the 14 daily totals
    [60]*11 + [0]*3):
      regularity ~= 47.77670321329065
      start_stability = 9/11 * 100 (9 of the 11 starts lie within +/-60 min of 540)
      M2 = round(0.5*47.7767... + 0.5*81.8181...) = 65
      median_start_local = "09:00"
    """
    starts = [540, 545, 550, 555, 560, 535, 530, 525, 520, 900, 300]
    sessions = []
    for day_offset, start_min in enumerate(starts):
        day = date(2026, 2, 1) + timedelta(days=day_offset)
        start = datetime(day.year, day.month, day.day, tzinfo=UTC) + timedelta(minutes=start_min)
        sessions.append(
            session_data_cls(started_at=start, ended_at=start + timedelta(minutes=60), pauses=[])
        )
    return sessions


def test_m2_is_the_50_50_blend_with_zero_days_counted_against_regularity() -> None:
    """M2 = round(0.5*regularity + 0.5*start_stability); zero (rest) days count in the CV.

    @trace FR-METR-02
    """
    SessionData, _PauseData, compute_consistency = _load()
    sessions = _blend_fixture_sessions(SessionData)

    result = compute_consistency(sessions, "UTC", date(2026, 2, 14))

    assert result.low_confidence is False
    assert result.regularity == pytest.approx(47.77670321329065, abs=1e-6)
    assert result.start_stability == pytest.approx(9 / 11 * 100, abs=1e-6)
    assert result.score == 65


def test_start_stability_uses_the_60_minute_band_around_the_median_start() -> None:
    """start_stability = share of active days within +/-60 min of the median start, * 100.

    Same fixture as the blend test: median first-start = 540 min (09:00); 9 of the 11
    active-day starts lie within [480, 600] (+/-60 min); the two outliers (900, 300) do
    not.

    @trace FR-METR-02
    """
    SessionData, _PauseData, compute_consistency = _load()
    sessions = _blend_fixture_sessions(SessionData)

    result = compute_consistency(sessions, "UTC", date(2026, 2, 14))

    assert result.start_stability == pytest.approx(9 / 11 * 100, abs=1e-6)
    assert result.median_start_local == "09:00"


def test_fewer_than_3_active_days_is_low_confidence_not_an_error() -> None:
    """Only 1-2 active days in the 14-day window -> null + low-confidence, no error (E-2).

    @trace FR-METR-02
    """
    SessionData, _PauseData, compute_consistency = _load()
    today = date(2026, 5, 14)
    # Exactly 2 active days (Feb1-equivalent window May1..May14); the other 12 are zero.
    sessions = [
        SessionData(
            started_at=datetime(2026, 5, 1, 9, 0, 0, tzinfo=UTC),
            ended_at=datetime(2026, 5, 1, 9, 30, 0, tzinfo=UTC),
            pauses=[],
        ),
        SessionData(
            started_at=datetime(2026, 5, 2, 9, 0, 0, tzinfo=UTC),
            ended_at=datetime(2026, 5, 2, 9, 30, 0, tzinfo=UTC),
            pauses=[],
        ),
    ]

    result = compute_consistency(sessions, "UTC", today)

    assert result.low_confidence is True
    assert result.score is None
    assert result.regularity is None
    assert result.start_stability is None
    assert result.median_start_local is None


def test_empty_window_returns_null_consistency() -> None:
    """No sessions in the trailing 14 days -> null / low-confidence (0 active days) (E-1).

    @trace FR-METR-02
    """
    _SessionData, _PauseData, compute_consistency = _load()

    result = compute_consistency([], "UTC", date(2026, 5, 14))

    assert result.low_confidence is True
    assert result.score is None
    assert result.regularity is None
    assert result.start_stability is None
    assert result.median_start_local is None
