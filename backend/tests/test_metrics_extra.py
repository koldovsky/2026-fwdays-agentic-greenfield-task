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
