"""Supplementary metrics/snapshot tests (implementer-owned, not the acceptance bar).

The acceptance bar lives in ``test_metrics_*.py`` / ``test_metrics_snapshot.py`` (spec
004, one test per OpenSpec scenario) and is never edited here. This file locks in a
defensive path the ratified scenarios do not exercise but the implementation must not
crash on: a session tagged with a ``category_id`` absent from the caller-supplied
``categories`` list (e.g. a stale read between two requests) is skipped rather than
raising, in both category-keyed snapshot blocks.

Pure, no DB -- imports mirror the acceptance tests' own ``_load()`` style.
"""

from datetime import date, datetime, timedelta, timezone

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
