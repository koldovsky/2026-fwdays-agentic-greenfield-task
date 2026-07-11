"""Pure unit tests for M6 baseline deltas and zones (spec 004, FR-METR-06, arch. §3.6, §3.8).

Tests the not-yet-written ``app.core.metrics.m6_baseline`` module directly with fixture
values and, for the sparse-data scenarios, fixture ``CategorizedSession`` lists -- no
DB, no ``RUN_DB_TESTS`` gate.

Expected pure API this file pins (new module, does not exist yet -> RED at
``ModuleNotFoundError``):

    @dataclass
    class BaselineEntry:
        value: float
        delta: float | None
        zone: str   # "green" | "yellow" | "red" | "neutral" | "building"

    def zone_for(value: float, baseline: float, *, higher_is_better: bool) -> BaselineEntry
        The core §3.6 threshold math in isolation: delta = value - baseline (always,
        even when baseline = 0); rel = delta / baseline, normalized (negated) for a
        lower-better metric so positive rel = improvement; zone is green (rel >= -0.05),
        yellow (-0.20 <= rel < -0.05), red (rel < -0.20), or neutral (baseline == 0).
        Scenarios are written abstractly ("a higher-better score whose rel = -0.05") so
        this is tested with plain value/baseline numbers, independent of which of M1-M4
        supplies them -- the ratified spec never pins that mapping.

    def baseline_window(today: date) -> tuple[date, date]
        The (start, end) of the trailing-30-day baseline window ending **yesterday**.

    def sparse_data_floor(entry: BaselineEntry, *, history_days: int) -> BaselineEntry
        Below 7 days of history: override to (entry.value, None, "building"). At or
        above 7: pass ``entry`` through unchanged. ``history_days`` = the span from the
        earliest saved session's local day to ``today``, inclusive (0 with no sessions
        at all) -- a judgment call the ratified text does not pin a formula for.

    @dataclass
    class Baselines:
        volume: BaselineEntry
        consistency: BaselineEntry
        focus_share: BaselineEntry
        switch_load: BaselineEntry
        # deliberately no 5th "streak" field -- M5 is reported unzoned (§4.1 vs §3.6).

    def compute_baselines(sessions: Sequence[CategorizedSession], tz: str, today: date) -> Baselines

This file does not assert the exact numeric ``value``/``delta`` a real M1-M4 score
produces inside ``compute_baselines`` (the ratified spec never pins which underlying
quantity plays "value" vs "baseline" per score -- only ``architecture.md``'s now-stale
§4.1 example hints at it) -- only the *structural* claims the scenarios actually state:
whether ``delta`` is null, whether ``zone`` is "building", and that ``value`` is always
present. The exact zone/delta *math* is pinned precisely via ``zone_for`` instead, which
the ratified scenarios describe in fully abstract (value/baseline-independent) terms.

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``.
"""

from dataclasses import fields
from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc


def _load() -> tuple[object, object, object, object, object, object, object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, CategorizedSession, BaselineEntry, zone_for,
    baseline_window, sparse_data_floor, Baselines, compute_baselines)``.
    """
    from app.core.metrics.m6_baseline import (
        BaselineEntry,
        Baselines,
        baseline_window,
        compute_baselines,
        sparse_data_floor,
        zone_for,
    )
    from app.core.metrics.model import CategorizedSession

    from app.core.model import SessionData

    return (
        SessionData,
        CategorizedSession,
        BaselineEntry,
        zone_for,
        baseline_window,
        sparse_data_floor,
        Baselines,
        compute_baselines,
    )


def _consecutive_day_sessions(
    session_data_cls: object, categorized_cls: object, end: date, count: int
) -> list[object]:
    """One 30-min, category-1 session at 09:00 UTC on each of ``count`` days ending ``end``."""
    sessions = []
    for offset in range(count):
        day = end - timedelta(days=offset)
        start = datetime(day.year, day.month, day.day, 9, 0, 0, tzinfo=UTC)
        session = session_data_cls(
            started_at=start, ended_at=start + timedelta(minutes=30), pauses=[]
        )
        sessions.append(categorized_cls(session=session, category_id=1))
    return sessions


def test_green_at_or_within_5_percent_below_baseline() -> None:
    """rel = -0.05 (exactly 5% below baseline) zones green.

    value=95, baseline=100 (higher-better): rel = (95-100)/100 = -0.05.

    @trace FR-METR-06
    """
    _S, _C, _BE, zone_for, *_rest = _load()

    result = zone_for(95, 100, higher_is_better=True)

    assert result.zone == "green"
    assert result.delta == -5


def test_yellow_between_5_and_20_percent_below_baseline() -> None:
    """rel = -0.20 and rel = -0.10 both zone yellow (-0.20 <= rel < -0.05).

    @trace FR-METR-06
    """
    _S, _C, _BE, zone_for, *_rest = _load()

    at_20 = zone_for(80, 100, higher_is_better=True)  # rel = -0.20
    at_10 = zone_for(90, 100, higher_is_better=True)  # rel = -0.10

    assert at_20.zone == "yellow"
    assert at_10.zone == "yellow"


def test_red_more_than_20_percent_below_baseline() -> None:
    """rel = -0.25 (more than 20% below baseline) zones red.

    @trace FR-METR-06
    """
    _S, _C, _BE, zone_for, *_rest = _load()

    result = zone_for(75, 100, higher_is_better=True)  # rel = -0.25

    assert result.zone == "red"


def test_a_lower_better_metric_is_normalized_before_zoning() -> None:
    """M4 switch_load 25% above baseline (worse) normalizes to rel=-0.25 and zones red.

    delta is still the literal value - baseline (25, unsigned) per the "delta =
    value - baseline(S)" formula; only the zoning ``rel`` is direction-normalized.

    @trace FR-METR-06
    """
    _S, _C, _BE, zone_for, *_rest = _load()

    result = zone_for(125, 100, higher_is_better=False)  # 25% above baseline, worse

    assert result.delta == 25
    assert result.zone == "red"


def test_a_zero_baseline_is_neutral() -> None:
    """baseline(S) = 0 -> rel is undefined and the zone is neutral.

    delta = value - baseline(S) is still well-defined arithmetic (50 - 0 = 50); only
    ``rel`` (delta / baseline) is undefined, which is what forces the neutral zone.

    @trace FR-METR-06
    """
    _S, _C, _BE, zone_for, *_rest = _load()

    result = zone_for(50, 0, higher_is_better=True)

    assert result.zone == "neutral"
    assert result.delta == 50


def test_baseline_spans_the_trailing_30_days_ending_yesterday() -> None:
    """baseline_window(today) spans the 30 days ending yesterday, never today.

    @trace FR-METR-06
    """
    _S, _C, _BE, _zf, baseline_window, *_rest = _load()

    start, end = baseline_window(date(2026, 3, 15))

    assert end == date(2026, 3, 14)  # yesterday
    assert start == date(2026, 2, 14)  # 30 days ending yesterday, inclusive
    assert (end - start).days + 1 == 30


def test_under_7_days_of_history_the_zone_is_building() -> None:
    """Fewer than 7 days of history -> value shown, delta null, zone "building" (E-2, E-7).

    Isolated boundary check (history_days=1, the single-session case, and 6) plus an
    end-to-end wiring check via ``compute_baselines`` over 5 real consecutive active
    days (>= M2's own 3-active-day floor, so this stays about M6's 7-day gate and does
    not also trip M2's independent low-confidence null).

    @trace FR-METR-06
    """
    (
        SessionData,
        CategorizedSession,
        BaselineEntry,
        _zf,
        _bw,
        sparse_data_floor,
        _Baselines,
        compute_baselines,
    ) = _load()
    green = BaselineEntry(value=50.0, delta=5.0, zone="green")
    expected_building = BaselineEntry(value=50.0, delta=None, zone="building")

    assert sparse_data_floor(green, history_days=1) == expected_building
    assert sparse_data_floor(green, history_days=6) == expected_building

    today = date(2026, 6, 10)
    sessions = _consecutive_day_sessions(SessionData, CategorizedSession, today, 5)  # Jun6-10
    baselines = compute_baselines(sessions, "UTC", today)

    entries = (
        baselines.volume,
        baselines.consistency,
        baselines.focus_share,
        baselines.switch_load,
    )
    for entry in entries:
        assert entry.zone == "building"
        assert entry.delta is None
        assert entry.value is not None


def test_between_7_and_29_days_deltas_and_zones_compute_on_available_history() -> None:
    """7-29 days of history -> deltas/zones compute (not "building"), no error (E-7).

    Isolated boundary check (history_days=7 and 29 pass ``sparse_data_floor`` through
    unchanged) plus an end-to-end wiring check via ``compute_baselines`` over 10 real
    consecutive active days.

    @trace FR-METR-06
    """
    (
        SessionData,
        CategorizedSession,
        BaselineEntry,
        _zf,
        _bw,
        sparse_data_floor,
        _Baselines,
        compute_baselines,
    ) = _load()
    green = BaselineEntry(value=50.0, delta=5.0, zone="green")

    assert sparse_data_floor(green, history_days=7) == green
    assert sparse_data_floor(green, history_days=29) == green

    today = date(2026, 7, 20)
    sessions = _consecutive_day_sessions(SessionData, CategorizedSession, today, 10)  # Jul11-20
    baselines = compute_baselines(sessions, "UTC", today)

    entries = (
        baselines.volume,
        baselines.consistency,
        baselines.focus_share,
        baselines.switch_load,
    )
    for entry in entries:
        assert entry.zone != "building"
        assert entry.delta is not None
        assert entry.value is not None


def test_streak_carries_no_baseline_zone() -> None:
    """The zoned baselines block is exactly {volume, consistency, focus_share, switch_load}.

    M5 Streak is reported only as current/longest elsewhere in the snapshot, with no
    delta and no zone -- resolving §3.6 vs §4.1 in favor of the four zoned scores.

    @trace FR-METR-06
    """
    SessionData, CategorizedSession, _BE, _zf, _bw, _sdf, Baselines, compute_baselines = _load()

    field_names = {f.name for f in fields(Baselines)}
    assert field_names == {"volume", "consistency", "focus_share", "switch_load"}

    today = date(2026, 7, 20)
    sessions = _consecutive_day_sessions(SessionData, CategorizedSession, today, 10)
    baselines = compute_baselines(sessions, "UTC", today)

    assert not hasattr(baselines, "streak")
    assert not hasattr(baselines, "streaks")
