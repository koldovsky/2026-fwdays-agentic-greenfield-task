"""Pure unit tests for the assembled §4.1 snapshot (spec 004, NFR-DET-01, FR-METR-01).

Tests the not-yet-written ``app.core.snapshot`` module directly with fixture
``CategorizedSession``/``CategoryInfo`` lists -- no DB, no ``RUN_DB_TESTS`` gate. The
one scenario that genuinely needs a live user (isolation, "user A never sees user B's
data") is DB/HTTP-level and lives in ``tests/test_stats_api.py`` instead.

Expected pure API this file pins (new module, does not exist yet -> RED at
``ModuleNotFoundError``):

    # app/core/metrics/model.py (new file; see test_metrics_m4_switching.py for
    # CategorizedSession)
    @dataclass
    class CategoryInfo:
        id: int
        name: str
        color: str
        archived: bool = False

    # app/core/snapshot.py
    def build_snapshot(
        sessions: Sequence[CategorizedSession],
        categories: Sequence[CategoryInfo],
        tz: str,
        today: date,
        window: tuple[date, date] | None = None,
    ) -> dict
        Returns a plain nested dict/list structure -- the literal §4.1 JSON shape (core
        stays framework-free; date values are native ``datetime.date`` objects, not
        pre-stringified -- the thin Pydantic response model at the API layer is what
        turns them into wire-format ISO strings, per architecture §1's "core is pure /
        api is thin" split). Top-level keys: window, volume, consistency, focus,
        switching, streaks, baselines, top_categories, per_category_per_day.

        ``window`` (optional): with none given, the reporting range is the current
        week (user-TZ Monday 00:00 -> today). With one given, it re-scopes ONLY
        ``volume.per_day``, ``focus``, ``switching.per_day``, and
        ``per_category_per_day`` (per_category_per_day's own defining text already
        says it follows "the same top-level reporting range as volume.per_day";
        switching.per_day is treated the same way for internal consistency -- a
        judgment call the ratified text does not name it by, but is the most
        defensible reading). ``consistency``, ``baselines``, ``streaks``, and
        ``top_categories`` NEVER change with ``window`` -- ``top_categories`` is
        pinned by its own requirement text to always be "current-week net minutes"
        regardless of the requested window; consistency/baselines keep their own fixed
        windows per §3.2/§3.6.

        ``volume.per_day`` / ``switching.per_day`` / a category's ``per_day`` in
        ``per_category_per_day`` all zero-fill every day of the reporting range
        (start..end inclusive), not just days with data, so a bar/line chart never has
        gaps -- a judgment call: the alternative (sparse, data-only days) is not ruled
        out by the ratified text but is a worse fit for a chart-driving API.

Low-confidence M2 shape (same judgment call as test_metrics_m2_consistency.py):
``{"score": None, "low_confidence": True, "regularity": None, "start_stability": None,
"median_start_local": None}``.

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``.
"""

from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc

SNAPSHOT_TOP_LEVEL_KEYS = {
    "window",
    "volume",
    "consistency",
    "focus",
    "switching",
    "streaks",
    "baselines",
    "top_categories",
    "per_category_per_day",
}
BASELINE_KEYS = {"volume", "consistency", "focus_share", "switch_load"}


def _load() -> tuple[object, object, object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, CategorizedSession, CategoryInfo, build_snapshot)``.
    """
    from app.core.metrics.model import CategorizedSession, CategoryInfo
    from app.core.snapshot import build_snapshot

    from app.core.model import SessionData

    return SessionData, CategorizedSession, CategoryInfo, build_snapshot


def _cs(
    session_cls: object,
    categorized_cls: object,
    day: date,
    hour: int,
    minutes: int,
    cat: int,
) -> object:
    start = datetime(day.year, day.month, day.day, hour, 0, 0, tzinfo=UTC)
    session = session_cls(
        started_at=start, ended_at=start + timedelta(minutes=minutes), pauses=[]
    )
    return categorized_cls(session=session, category_id=cat)


def test_identical_input_yields_identical_output() -> None:
    """A fixed session/pause list and a fixed today computed twice give identical results.

    @trace NFR-DET-01
    """
    SessionData, CategorizedSession, CategoryInfo, build_snapshot = _load()
    today = date(2026, 1, 20)
    sessions = [_cs(SessionData, CategorizedSession, date(2026, 1, 19), 9, 60, 1)]
    categories = [CategoryInfo(id=1, name="Work", color="#111111")]

    first = build_snapshot(sessions, categories, "UTC", today)
    second = build_snapshot(sessions, categories, "UTC", today)

    assert first == second


def test_assembled_snapshot_contains_only_computed_fields() -> None:
    """The snapshot has exactly the §4.1 blocks (plus the 3 ratified additions), no raw rows.

    baselines carries exactly the four zoned scores (no 5th "streak" entry); streaks
    is reported unzoned as current/longest only.

    @trace NFR-DET-01
    """
    _S, _C, _CI, build_snapshot = _load()

    snapshot = build_snapshot([], [], "UTC", date(2026, 1, 20))

    assert set(snapshot.keys()) == SNAPSHOT_TOP_LEVEL_KEYS
    assert set(snapshot["baselines"].keys()) == BASELINE_KEYS
    assert set(snapshot["streaks"].keys()) == {"current", "longest"}
    assert "all_time_min" in snapshot["volume"]  # the ratified additive field


def test_top_categories_lists_the_top_five_by_current_week_net_minutes() -> None:
    """Top 5 by current-week net minutes, ties broken by name, archived included.

    6 categories tracked this week: Zebra=100, Apple=90, Mango=90 (tie with Apple,
    "Apple" sorts first), Oldwork=80 (archived), Banana=70, Cherry=60 (6th -> excluded).
    today=2026-01-20 (Tue), current week = Mon Jan19..Tue Jan20; every session below
    is placed on the Monday.

    @trace NFR-DET-01
    """
    SessionData, CategorizedSession, CategoryInfo, build_snapshot = _load()
    today = date(2026, 1, 20)
    monday = date(2026, 1, 19)
    sessions = [
        _cs(SessionData, CategorizedSession, monday, 6, 100, 1),  # Zebra
        _cs(SessionData, CategorizedSession, monday, 8, 90, 2),  # Mango
        _cs(SessionData, CategorizedSession, monday, 10, 90, 3),  # Apple
        _cs(SessionData, CategorizedSession, monday, 12, 80, 4),  # Oldwork (archived)
        _cs(SessionData, CategorizedSession, monday, 14, 70, 5),  # Banana
        _cs(SessionData, CategorizedSession, monday, 16, 60, 6),  # Cherry -> excluded
    ]
    categories = [
        CategoryInfo(id=1, name="Zebra", color="#111111"),
        CategoryInfo(id=2, name="Mango", color="#222222"),
        CategoryInfo(id=3, name="Apple", color="#333333"),
        CategoryInfo(id=4, name="Oldwork", color="#444444", archived=True),
        CategoryInfo(id=5, name="Banana", color="#555555"),
        CategoryInfo(id=6, name="Cherry", color="#666666"),
    ]

    snapshot = build_snapshot(sessions, categories, "UTC", today)

    top = snapshot["top_categories"]
    assert top == [
        {"id": 1, "name": "Zebra", "color": "#111111", "week_min": 100},
        {"id": 3, "name": "Apple", "color": "#333333", "week_min": 90},
        {"id": 2, "name": "Mango", "color": "#222222", "week_min": 90},
        {"id": 4, "name": "Oldwork", "color": "#444444", "week_min": 80},
        {"id": 5, "name": "Banana", "color": "#555555", "week_min": 70},
    ]
    assert all(entry["id"] != 6 for entry in top)  # Cherry, 6th by rank, excluded


def test_per_category_per_day_groups_net_minutes_by_category_and_local_day() -> None:
    """One entry per category (archived included), a per-day series that sums correctly.

    Explicit window = Mon..Wed (2026-01-19..01-21). Category "Deep Work" (active):
    Mon=30, Tue=45. Category "Legacy" (archived): Wed=20. Each category's per_day
    sums to its own contribution; together they reproduce volume.per_day's range total.

    @trace NFR-DET-01
    """
    SessionData, CategorizedSession, CategoryInfo, build_snapshot = _load()
    today = date(2026, 1, 21)
    window = (date(2026, 1, 19), date(2026, 1, 21))
    sessions = [
        _cs(SessionData, CategorizedSession, date(2026, 1, 19), 9, 30, 10),  # Deep Work, Mon
        _cs(SessionData, CategorizedSession, date(2026, 1, 20), 9, 45, 10),  # Deep Work, Tue
        _cs(SessionData, CategorizedSession, date(2026, 1, 21), 9, 20, 20),  # Legacy, Wed
    ]
    categories = [
        CategoryInfo(id=10, name="Deep Work", color="#AAAAAA"),
        CategoryInfo(id=20, name="Legacy", color="#BBBBBB", archived=True),
    ]

    snapshot = build_snapshot(sessions, categories, "UTC", today, window=window)

    by_id = {entry["id"]: entry for entry in snapshot["per_category_per_day"]}
    assert set(by_id) == {10, 20}

    deep_work = by_id[10]
    assert deep_work["name"] == "Deep Work"
    assert deep_work["color"] == "#AAAAAA"
    deep_work_by_date = {d["date"]: d["min"] for d in deep_work["per_day"]}
    assert deep_work_by_date == {
        date(2026, 1, 19): 30,
        date(2026, 1, 20): 45,
        date(2026, 1, 21): 0,
    }
    assert sum(deep_work_by_date.values()) == 75

    legacy = by_id[20]  # archived, still present with its own id/color
    assert legacy["name"] == "Legacy"
    assert legacy["color"] == "#BBBBBB"
    legacy_by_date = {d["date"]: d["min"] for d in legacy["per_day"]}
    assert legacy_by_date == {
        date(2026, 1, 19): 0,
        date(2026, 1, 20): 0,
        date(2026, 1, 21): 20,
    }
    assert sum(legacy_by_date.values()) == 20

    # Consistent with volume.per_day over the same window: 75 + 20 = 95 total.
    volume_total = sum(d["min"] for d in snapshot["volume"]["per_day"])
    assert volume_total == 95


def test_empty_history_yields_a_well_formed_snapshot() -> None:
    """No saved sessions -> every block present with well-defined empty values (E-1).

    today=2026-01-20 (Tue); the default (no-window) reporting range is Mon Jan19..Tue
    Jan20 (2 days), so the zero-filled per_day series below are short and exact.

    @trace NFR-DET-01
    """
    _S, _C, _CI, build_snapshot = _load()
    today = date(2026, 1, 20)

    snapshot = build_snapshot([], [], "UTC", today)

    volume = snapshot["volume"]
    assert volume["today_min"] == 0
    assert volume["week_min"] == 0
    assert volume["month_min"] == 0
    assert volume["all_time_min"] == 0
    assert volume["daily_avg_30d_min"] == 0
    assert {(d["date"], d["min"]) for d in volume["per_day"]} == {
        (date(2026, 1, 19), 0),
        (date(2026, 1, 20), 0),
    }

    assert snapshot["consistency"] == {
        "score": None,
        "low_confidence": True,
        "regularity": None,
        "start_stability": None,
        "median_start_local": None,
    }
    assert snapshot["focus"] == {"deep_count": 0, "deep_minutes": 0, "deep_share": 0}
    assert snapshot["streaks"] == {"current": 0, "longest": 0}
    assert snapshot["switching"]["baseline_mean"] == 0
    for entry in snapshot["switching"]["per_day"]:
        assert entry["switches"] == 0
        assert entry["interruptions"] == 0
        assert entry["switch_load"] == 0
        assert entry["flagged"] is False
    for entry in snapshot["baselines"].values():
        assert entry["zone"] == "building"
        assert entry["delta"] is None
    assert snapshot["top_categories"] == []
    assert snapshot["per_category_per_day"] == []


def test_no_window_parameter_covers_the_current_week() -> None:
    """With no window given, the reporting range is the current week (Monday..today).

    today=2026-01-20 (Tue) -> window = Jan19 (Monday) .. Jan20, 2 days.

    @trace NFR-DET-01
    """
    _S, _C, _CI, build_snapshot = _load()
    today = date(2026, 1, 20)

    snapshot = build_snapshot([], [], "UTC", today)

    assert snapshot["window"] == {
        "start": date(2026, 1, 19),
        "end": date(2026, 1, 20),
        "days": 2,
    }


def test_a_window_parameter_re_scopes_only_the_top_level_reporting_range() -> None:
    """An explicit window re-scopes only volume.per_day/focus/switching/per_category_per_day.

    Same sessions/today, called once with no window (current week) and once with an
    explicit window entirely outside the current week: consistency, baselines,
    streaks, and top_categories stay byte-for-byte identical; the reporting-range
    blocks reflect the requested range.

    @trace NFR-DET-01
    """
    SessionData, CategorizedSession, CategoryInfo, build_snapshot = _load()
    today = date(2026, 2, 14)
    # 10 consecutive active days ending today -- gives M2/M6/M5 real, non-trivial
    # values so this equality check is decisive, not vacuously true on empty data.
    sessions = [
        _cs(SessionData, CategorizedSession, today - timedelta(days=offset), 9, 60, 1)
        for offset in range(10)
    ]
    categories = [CategoryInfo(id=1, name="Work", color="#111111")]
    custom_window = (date(2026, 1, 1), date(2026, 1, 3))  # well outside the current week

    default_snap = build_snapshot(sessions, categories, "UTC", today)
    custom_snap = build_snapshot(sessions, categories, "UTC", today, window=custom_window)

    assert default_snap["consistency"] == custom_snap["consistency"]
    assert default_snap["baselines"] == custom_snap["baselines"]
    assert default_snap["streaks"] == custom_snap["streaks"]
    assert default_snap["top_categories"] == custom_snap["top_categories"]

    assert default_snap["window"] != custom_snap["window"]
    assert custom_snap["window"] == {
        "start": date(2026, 1, 1),
        "end": date(2026, 1, 3),
        "days": 3,
    }
    default_dates = {d["date"] for d in default_snap["volume"]["per_day"]}
    custom_dates = {d["date"] for d in custom_snap["volume"]["per_day"]}
    assert default_dates != custom_dates
    assert custom_dates == {date(2026, 1, 1), date(2026, 1, 2), date(2026, 1, 3)}


def test_all_time_volume_is_exposed_in_the_snapshot() -> None:
    """volume.all_time_min equals M1's all_time net-minute sum across the whole history.

    Sessions span 2020, 2024, and today (2026-06-15): 45 + 55 + 60 = 160 net minutes.

    @trace FR-METR-01
    """
    SessionData, CategorizedSession, CategoryInfo, build_snapshot = _load()
    today = date(2026, 6, 15)
    sessions = [
        _cs(SessionData, CategorizedSession, date(2020, 1, 1), 9, 45, 1),
        _cs(SessionData, CategorizedSession, date(2024, 6, 1), 9, 55, 1),
        _cs(SessionData, CategorizedSession, today, 9, 60, 1),
    ]
    categories = [CategoryInfo(id=1, name="Work", color="#111111")]

    snapshot = build_snapshot(sessions, categories, "UTC", today)

    assert snapshot["volume"]["all_time_min"] == 45 + 55 + 60
