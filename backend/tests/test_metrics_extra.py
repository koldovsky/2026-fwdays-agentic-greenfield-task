"""Supplementary metrics/snapshot tests (implementer-owned, not the acceptance bar).

The acceptance bar lives in ``test_metrics_*.py`` / ``test_metrics_snapshot.py`` (spec
004, one test per OpenSpec scenario) and is never edited here. Alongside the original
defensive-path coverage below, this file also carries the rework-pass coverage added for
two code-reviewer findings (both "should fix", not the acceptance bar):

  - A session with a ``category_id`` absent from the caller-supplied ``categories`` list
    (e.g. a stale read between two requests) is skipped rather than raising, in both
    category-keyed snapshot blocks.
  - M1's day totals (``app.core.metrics.days``) and M3's focus calculation
    (``app.core.metrics.m3_focus``) now agree on one session's own net minutes even when
    its pause segments overlap, since both are built on the same overlap-merging sweep
    (``app.core.metrics.intervals.net_intervals``) -- pinned against the naive,
    overlap-unaware ``app.core.durations.net_seconds`` for contrast.
  - M2's exactly-3-active-days floor (the ratified ">= 3 active days" boundary) is
    pinned at the edge, alongside the existing 2-active-days (low-confidence) case in
    the acceptance file.

This file also carries the coverage for a second rework pass (two independent
resource-exhaustion / algorithmic-complexity findings, both `[BLOCKING]`):

  - `app.services.stats._within_session_span_cap` -- the single choke point every saved
    session passes through before it can reach ``app.core.metrics.days``' day-by-day
    splitting -- is pinned at its exact 90/91-day boundary, the same way this slice pins
    every other threshold (M3's 60-minute floor, M4's switch_load thresholds, the
    ``window`` query param's 366-day cap in ``test_stats_api_extra.py``). The end-to-end
    proof that the cap actually protects a live ``GET /api/stats/snapshot`` /
    ``/heatmap`` call is DB-backed and lives in ``test_stats_api_extra.py`` instead
    (same split as the ``window``-cap tests).
  - M5's ``_longest_run`` (``app.core.metrics.m5_streaks``) no longer costs
    O(calendar-day span between the earliest and latest active day) -- an ordinary user
    with two active periods years apart used to pay for walking every day in between.
    The rewrite is O(n log n) in the actual number of active days; pinned here for both
    correctness (unchanged streak numbers) and a non-regression time bound.

Pure, no DB -- imports mirror the acceptance tests' own ``_load()`` style.
"""

from datetime import date, datetime, timedelta, timezone

import pytest

UTC = timezone.utc


def _load() -> tuple[object, object, object, object]:
    from app.core.metrics.model import CategorizedSession, CategoryInfo
    from app.core.model import SessionData
    from app.core.snapshot import build_snapshot

    return SessionData, CategorizedSession, CategoryInfo, build_snapshot


def test_a_session_with_an_unknown_category_id_is_skipped_not_crashed() -> None:
    """top_categories / per_category_per_day silently skip an unresolvable category_id.

    A session tagged ``category_id=99`` with no matching ``CategoryInfo`` must not
    raise -- it simply carries no identity to report against, so it is omitted from
    both category-keyed blocks while the rest of the snapshot still assembles.
    """
    SessionData, CategorizedSession, CategoryInfo, build_snapshot = _load()
    today = date(2026, 1, 20)
    monday = date(2026, 1, 19)
    known_start = datetime(monday.year, monday.month, monday.day, 9, 0, 0, tzinfo=UTC)
    unknown_start = datetime(monday.year, monday.month, monday.day, 11, 0, 0, tzinfo=UTC)
    sessions = [
        CategorizedSession(
            session=SessionData(
                started_at=known_start, ended_at=known_start + timedelta(minutes=30), pauses=[]
            ),
            category_id=1,
        ),
        CategorizedSession(
            session=SessionData(
                started_at=unknown_start,
                ended_at=unknown_start + timedelta(minutes=30),
                pauses=[],
            ),
            category_id=99,  # no matching CategoryInfo below
        ),
    ]
    categories = [CategoryInfo(id=1, name="Known", color="#111111")]

    snapshot = build_snapshot(sessions, categories, "UTC", today)

    top_ids = {entry["id"] for entry in snapshot["top_categories"]}
    per_day_ids = {entry["id"] for entry in snapshot["per_category_per_day"]}
    assert top_ids == {1}
    assert per_day_ids == {1}
    assert 99 not in top_ids
    assert 99 not in per_day_ids
    # The known category's own total is unaffected by the unresolvable one.
    assert snapshot["top_categories"][0]["week_min"] == 30


# --- M1/M3 agreement on overlapping-pause net minutes (code-reviewer finding) -----------


def _overlapping_pause_session() -> object:
    """A 60-min-gross session whose two pause segments overlap by 20 minutes.

    09:00->10:00 UTC gross; pauses 09:10->09:40 and 09:20->09:50 overlap on
    09:20->09:40 (20 min). The true (merged) paused span is 09:10->09:50 = 40 min, so
    the correct net is 60 - 40 = 20 min. A naive per-pause sum instead adds 30 + 30 = 60
    min of "paused" time (double-subtracting the 20-min overlap), reporting a wrong net
    of 0 -- exactly the bug this test guards against regressing.
    """
    from app.core.model import PauseData, SessionData

    start = datetime(2026, 1, 15, 9, 0, 0, tzinfo=UTC)
    return SessionData(
        started_at=start,
        ended_at=start + timedelta(minutes=60),
        pauses=[
            PauseData(
                paused_at=start + timedelta(minutes=10), resumed_at=start + timedelta(minutes=40)
            ),
            PauseData(
                paused_at=start + timedelta(minutes=20), resumed_at=start + timedelta(minutes=50)
            ),
        ],
    )


def test_intervals_net_seconds_merges_overlapping_pauses_unlike_the_naive_helper() -> None:
    """``app.core.metrics.intervals.net_seconds`` merges overlap; ``app.core.durations``' does not.

    Pinned in contrast against slice 003's ``app.core.durations.net_seconds`` (unmodified,
    still naive by design for its own simple use) to make the two helpers' disagreement on
    overlapping pauses an explicit, regression-proof fact rather than an implicit one.

    @trace FR-METR-03
    @trace FR-METR-07
    """
    from app.core.durations import net_seconds as naive_net_seconds
    from app.core.metrics.intervals import net_seconds as overlap_aware_net_seconds

    session = _overlapping_pause_session()

    assert overlap_aware_net_seconds(session) == 20 * 60
    assert naive_net_seconds(session) == 0  # the bug this fix corrects, pinned for contrast


def test_overlapping_pauses_agree_between_m1_day_totals_and_m3_focus_denominator() -> None:
    """M1's ``daily_net_minutes`` and M3's ``compute_focus`` agree on one session's own net
    minutes, even when its pause segments overlap.

    Before the fix, ``m3_focus.py`` reused slice 003's ``app.core.durations.net_seconds``
    (naive per-pause summing) while ``days.py`` used its own overlap-merging sweep, so the
    two disagreed about the same session: M1 correctly reported 20 net minutes for the
    session below, while M3's ``deep_share`` denominator silently used 0. Both are now
    built on the same ``app.core.metrics.intervals`` sweep.

    @trace FR-METR-01
    @trace FR-METR-03
    @trace FR-METR-07
    """
    from app.core.metrics import days
    from app.core.metrics.m3_focus import compute_focus
    from app.core.model import SessionData

    overlapping = _overlapping_pause_session()

    # M1's own ground truth for this session's net minutes.
    m1_day_totals = days.daily_net_minutes([overlapping], "UTC")
    assert m1_day_totals == {date(2026, 1, 15): 20}

    # A second, zero-pause deep-block session gives deep_share's denominator a second
    # term, so the overlapping session's own (correct-or-wrong) net minutes show up as an
    # observable difference: 60 / (60 + 20) if fixed, 60 / (60 + 0) if not.
    deep_start = datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)
    deep_session = SessionData(
        started_at=deep_start, ended_at=deep_start + timedelta(minutes=60), pauses=[]
    )

    focus = compute_focus([deep_session, overlapping])

    assert focus.deep_count == 1
    assert focus.deep_minutes == 60
    assert focus.deep_share == pytest.approx(60 / (60 + 20))  # agrees with M1's 20 above


# --- M2's exactly-3-active-days floor (code-reviewer coverage-gap finding) --------------


def test_exactly_3_active_days_meets_the_m2_floor_and_is_not_low_confidence() -> None:
    """Exactly 3 active days in the 14-day window meets the ">= 3 active days" floor.

    A named boundary in the ratified spec ("requires >= 3 active days ... below that
    reports null", architecture §3.2/§3.8) that, unlike every other pinned boundary in
    this slice (M3's 60-min, M4's switch_load thresholds, M6's zone cutpoints), had no
    test exactly at the edge -- the acceptance file only pins the 2-active-days
    (low-confidence) side. The code reviewer verified the existing code is already
    correct here; this closes the coverage gap.

    @trace FR-METR-02
    """
    from app.core.metrics.m2_consistency import compute_consistency
    from app.core.model import SessionData

    today = date(2026, 5, 14)
    # Exactly 3 active days (May1-3) inside the trailing 14-day window (May1..May14),
    # the same window shape as the acceptance file's 2-active-days case; the other 11
    # days are zero.
    sessions = [
        SessionData(
            started_at=datetime(2026, 5, day, 9, 0, 0, tzinfo=UTC),
            ended_at=datetime(2026, 5, day, 9, 30, 0, tzinfo=UTC),
            pauses=[],
        )
        for day in (1, 2, 3)
    ]

    result = compute_consistency(sessions, "UTC", today)

    assert result.low_confidence is False
    assert result.score is not None
    assert result.regularity is not None
    assert result.start_stability is not None


# --- Session span defensive cap (rework iteration 3, BLOCKING finding 1) ----------------


def test_within_session_span_cap_pins_the_90_91_day_boundary() -> None:
    """``app.services.stats._within_session_span_cap`` accepts exactly 90 days, rejects 91.

    This is the single choke point every saved session passes through before it can
    reach ``app.core.metrics.days``' day-by-day splitting (FR-METR-07): without it, one
    absurdly-dated session (a mistyped year on a manual add, or a deliberately crafted
    request -- nothing upstream bounds a session's own span beyond ``ended_at >
    started_at``) forces every metrics function that reads a caller's session history
    into an unbounded, event-loop-blocking walk on every stats read. Pinned at the exact
    edge the same way this slice pins every other threshold (M3's 60-minute floor, M4's
    switch_load thresholds, the ``window`` query param's 366-day cap). No DB needed --
    ``Session`` is a plain SQLAlchemy-mapped object here, never added to a session or
    flushed, so constructing one with just the two fields this predicate reads is safe
    and side-effect-free. The end-to-end proof that this cap actually protects a live
    ``GET /api/stats/snapshot``/``/heatmap`` call (with real before/after timings) is
    DB-backed and lives in ``test_stats_api_extra.py`` instead, mirroring how the
    ``window``-cap tests are split across these same two files.
    """
    from app.models.session import Session
    from app.services.stats import _within_session_span_cap

    start = datetime(2020, 1, 1, tzinfo=UTC)

    at_cap = Session(started_at=start, ended_at=start + timedelta(days=90))
    assert _within_session_span_cap(at_cap) is True

    over_cap = Session(started_at=start, ended_at=start + timedelta(days=91))
    assert _within_session_span_cap(over_cap) is False


# --- M5's longest-run algorithm (rework iteration 3, BLOCKING finding 2) ----------------


def _sessions_on(days: list[date]) -> list[object]:
    """One 30-min zero-pause session at 09:00 UTC on each of ``days`` (mirrors the
    acceptance file's own ``_sessions_on_days`` helper, duplicated locally rather than
    imported across test files)."""
    from app.core.model import SessionData

    sessions = []
    for day in days:
        start = datetime(day.year, day.month, day.day, 9, 0, 0, tzinfo=UTC)
        sessions.append(
            SessionData(started_at=start, ended_at=start + timedelta(minutes=30), pauses=[])
        )
    return sessions


def _consecutive(end: date, count: int) -> list[date]:
    return [end - timedelta(days=offset) for offset in range(count)][::-1]


def test_longest_streak_across_a_multi_millennium_gap_is_correct_and_fast() -> None:
    """A 7-day run ~9800 years ago plus a current 6-day run: correct numbers, and fast.

    Code-reviewer finding: ``_longest_run`` used to walk every calendar day between the
    earliest and latest active day one at a time, so its cost was
    O(calendar-day gap), not O(actual active days) -- and this needs no crafted session
    data at all, only two ordinary, short active periods far apart in calendar time (the
    reviewer's own repro: "tracked a week two years ago, resumed recently", measured at
    ~1.4s for exactly 2 sessions in their environment).

    This fixture deliberately pushes the gap far beyond "a couple of years" (~9800
    years, comfortably within ``datetime.date``'s year 1..9999 range and safe from
    ``_current_run``'s own earliest-representable-date edge, since these are two
    *isolated* short runs, not one continuous run reaching back to day 1) so the
    contrast is unmistakable on any machine, however fast: this repo's own environment
    measured the pre-fix algorithm directly (not estimated) at 6.41s for a similar
    ~9998-year gap between two ordinary sessions (see the rework's run record) -- so a
    2-second budget here is already >3x below where the old algorithm would land, while
    the fixed O(n log n)-in-active-days algorithm finishes in microseconds regardless of
    how far apart the two runs are.

    @trace FR-METR-05
    """
    import time

    from app.core.metrics.m5_streaks import compute_streaks

    today = date(9900, 3, 6)
    past_run = _consecutive(date(105, 3, 7), 7)  # year 105, 7 consecutive days
    current_run = _consecutive(today, 6)  # year 9900, 6 consecutive days through today
    sessions = _sessions_on(past_run + current_run)

    started = time.perf_counter()
    result = compute_streaks(sessions, "UTC", today)
    elapsed = time.perf_counter() - started

    assert result.current == 6
    assert result.longest == 7  # the older 7-day run, still the longest over all history
    assert elapsed < 2.0, (
        f"took {elapsed:.3f}s for a 2-run, ~9800-year-gap history -- looks like a "
        "day-by-day calendar walk regressed back in"
    )


# --- Session pause-count defensive cap (owner-approved iteration 4, BLOCKING finding 1) ---


def _pause_segments(count: int) -> list[object]:
    """``count`` transient ``PauseSegment`` rows -- only their number is read by the cap."""
    from app.models.pause_segment import PauseSegment

    start = datetime(2020, 1, 1, 9, 0, 0, tzinfo=UTC)
    end = start + timedelta(minutes=1)
    return [PauseSegment(paused_at=start, resumed_at=end) for _ in range(count)]


def _session_with_pause_count(count: int) -> object:
    """A 1-hour transient ``Session`` carrying ``count`` pause segments (never flushed)."""
    from app.models.session import Session

    start = datetime(2020, 1, 1, tzinfo=UTC)
    return Session(
        started_at=start,
        ended_at=start + timedelta(hours=1),
        pauses=_pause_segments(count),
    )


def test_within_pause_count_cap_pins_the_1000_1001_segment_boundary() -> None:
    """``_within_pause_count_cap`` accepts exactly 1000 pause segments, rejects 1001.

    The second defensive axis at ``StatsService``'s single load-time choke point (the first
    being the 90-day span cap pinned above). ``app.core.metrics.intervals.net_intervals``
    **sorts** a session's pauses, and that sweep drives day attribution (FR-METR-07) and
    M3/M4 on every stats read; nothing in slice 003 upstream bounds a saved session's pause
    count, so an unbounded array makes every read pay an unbounded sort. Pinned at the exact
    edge, the same way this slice pins every other threshold (the span cap, M3's 60-minute
    floor, M4's switch_load thresholds, the ``window`` param's 366-day cap).
    """
    from app.services.stats import _within_pause_count_cap

    assert _within_pause_count_cap(_session_with_pause_count(1000)) is True
    assert _within_pause_count_cap(_session_with_pause_count(1001)) is False


def test_defensive_caps_reject_either_an_absurd_span_or_a_pause_flood() -> None:
    """``_within_defensive_caps`` -- the predicate ``_load`` actually filters on -- rejects a
    session that busts EITHER cap and admits an ordinary one, so the single choke point now
    bounds both axes (gross span AND pause count) at once.
    """
    from app.models.session import Session
    from app.services.stats import _within_defensive_caps

    start = datetime(2020, 1, 1, tzinfo=UTC)
    ordinary = Session(started_at=start, ended_at=start + timedelta(hours=1), pauses=[])
    huge_span = Session(started_at=start, ended_at=start + timedelta(days=91), pauses=[])

    assert _within_defensive_caps(ordinary) is True
    assert _within_defensive_caps(huge_span) is False
    assert _within_defensive_caps(_session_with_pause_count(1001)) is False


# --- Snapshot shared-quantity memoization (owner-approved iteration 4, BLOCKING finding 2) -


def _even_two_category_history(days_each: int) -> list[object]:
    """``days_each`` days of one 30-min session in EACH of two categories.

    Evenly split across two categories, so any per-category day-split always covers strictly
    fewer sessions than the whole history -- letting the spy tell the single full-history
    split apart from the (inherent, partitioned) per-category splits by input length.
    """
    SessionData, CategorizedSession, _CategoryInfo, _build = _load()
    today = date(2026, 1, 20)
    sessions: list[object] = []
    for offset in range(days_each):
        day = today - timedelta(days=offset)
        for cat in (1, 2):
            start = datetime(day.year, day.month, day.day, 9 + cat, 0, 0, tzinfo=UTC)
            sessions.append(
                CategorizedSession(
                    session=SessionData(
                        started_at=start, ended_at=start + timedelta(minutes=30), pauses=[]
                    ),
                    category_id=cat,
                )
            )
    return sessions


def test_snapshot_splits_the_full_history_into_daily_minutes_exactly_once(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``build_snapshot`` computes the full-history day-split once, not once per metric.

    Finding: ``daily_net_minutes``/``compute_volume``/``compute_consistency`` were recomputed
    ~21 times per snapshot request (M1/M2/M5 and both sides of M6 each re-deriving the same
    full-history split), ~1.07-1.28s at 10k ordinary sessions -- over 2x the NFR-PERF-01
    <500ms budget with no crafted input. The fix threads one precomputed split through every
    consumer. This spies on ``app.core.snapshot``'s own ``daily_net_minutes`` reference:
    after the fix the only day-splits the assembler triggers are the single full-history one
    plus one small per-category one each. It asserts the full-history split runs exactly
    once and that the split count does NOT grow with the amount of history -- a per-metric
    recomputation creeping back in would fail both.
    """
    import app.core.snapshot as snapshot_mod

    _S, _C, CategoryInfo, build_snapshot = _load()
    today = date(2026, 1, 20)
    categories = [
        CategoryInfo(id=1, name="A", color="#111111"),
        CategoryInfo(id=2, name="B", color="#222222"),
    ]

    original = snapshot_mod.daily_net_minutes
    split_input_lengths: list[int] = []

    def counting(session_list, tz):
        split_input_lengths.append(len(session_list))
        return original(session_list, tz)

    monkeypatch.setattr(snapshot_mod, "daily_net_minutes", counting)

    def _measure(sessions: list[object]) -> tuple[int, int]:
        split_input_lengths.clear()
        build_snapshot(sessions, categories, "UTC", today)
        total = len(sessions)
        full_history = sum(1 for n in split_input_lengths if n == total)
        return full_history, len(split_input_lengths)

    full_small, total_small = _measure(_even_two_category_history(3))  # 6 sessions
    full_large, total_large = _measure(_even_two_category_history(30))  # 60 sessions

    # The expensive full-history split is computed exactly once, however much history.
    assert full_small == 1
    assert full_large == 1
    # Total day-splits stay constant (1 full + one per category), independent of session
    # count -- no metric re-derives the full-history split.
    assert total_small == total_large == 1 + len(categories)


# --- Switching-block linearity (owner-approved iteration 4, BLOCKING finding 3) ------------


def test_switching_block_is_linear_not_quadratic_in_reporting_days(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The switching block is O(reporting_days + sessions), not O(reporting_days x sessions).

    Finding: ``_build_switching_block`` re-filtered the whole history once per reporting day,
    so a legitimate ~1-year window over an ordinary large history went quadratic (~5.84s at
    10k sessions with a 366-day window). The fix buckets sessions by local start day once.
    This spies on ``app.core.snapshot``'s ``local_start_day`` and asserts its call count is
    IDENTICAL for a 3-day and a 366-day reporting window over the same sessions -- the per-day
    loop no longer calls it at all, so widening the window cannot add work proportional to
    the session count. Before the fix, the 366-day window alone drove ~363 x sessions extra
    calls.
    """
    import app.core.snapshot as snapshot_mod

    SessionData, CategorizedSession, CategoryInfo, build_snapshot = _load()
    today = date(2026, 1, 20)
    categories = [CategoryInfo(id=1, name="A", color="#111111")]
    sessions = [
        CategorizedSession(
            session=SessionData(
                started_at=datetime(2026, 1, day, 9, 0, 0, tzinfo=UTC),
                ended_at=datetime(2026, 1, day, 9, 30, 0, tzinfo=UTC),
                pauses=[],
            ),
            category_id=1,
        )
        for day in range(1, 11)  # 10 ordinary sessions, one per day
    ]

    original = snapshot_mod.local_start_day
    call_count = 0

    def counting(session, tz):
        nonlocal call_count
        call_count += 1
        return original(session, tz)

    monkeypatch.setattr(snapshot_mod, "local_start_day", counting)

    def _count(window: tuple[date, date]) -> int:
        nonlocal call_count
        call_count = 0
        build_snapshot(sessions, categories, "UTC", today, window=window)
        return call_count

    narrow = _count((date(2026, 1, 18), date(2026, 1, 20)))  # 3 reporting days
    wide = _count((date(2025, 1, 20), date(2026, 1, 20)))  # 366 reporting days

    assert narrow > 0  # sanity: the spy actually intercepted the assembler's own calls
    assert narrow == wide  # widening the window adds no session-proportional work
