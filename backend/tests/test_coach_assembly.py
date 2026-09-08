"""Pure unit tests for coach request assembly / memory trimming (spec 006, FR-COACH-04).

Architecture §4.3 bounds the conversation history sent to the model: the most recent turns,
newest-first, under a **~2,000-token** budget (approximated as ``len(chars) / 4``) **and** a
**hard cap of 20 turns**; older turns are dropped with no summarization. That trimming is
pure list logic, so it is tested here directly -- no DB, no network, no ``RUN_DB_TESTS`` gate
(like ``tests/test_metrics_snapshot.py``).

Expected pure API this file pins (does not exist yet -> RED at ``ModuleNotFoundError``):

    # app/services/coach.py  (pure, importable without I/O)
    def trim_history(turns: list[dict]) -> list[dict]
        # turns: the user's stored thread as {"role": "user"|"coach", "content": str}
        #        dicts in CHRONOLOGICAL order (oldest first, as read from coach_messages).
        # returns the retained subset, keeping the MOST RECENT turns, bounded by BOTH the
        #        20-turn hard cap AND the ~2,000-token budget (len(content)/4), dropping the
        #        oldest first; no summarization (architecture §4.3).

Assertions are deliberately order-agnostic (membership + recency), so they pin the §4.3
behaviour without over-constraining the returned ordering or the exact crossing turn.

This file also carries the **producer-drift seam guard**: the coach reuses slice-004's
shipped ``SnapshotResponse`` as the closed set of citable numbers (FR-COACH-04), so a
fixture mirroring that shape is validated field-for-field against the real Pydantic model.
That guard is expected GREEN today -- it fails only if the slice-004 producer drifts, which
is exactly when the coach's grounding fixtures would silently go stale.

``trim_history`` imports live inside ``_load_trim()`` for a clean per-test
``ModuleNotFoundError`` at RED.
"""

from datetime import date

from app.schemas.stats import SnapshotResponse

_SNAPSHOT_TOP_LEVEL_KEYS = {
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


def _load_trim() -> object:
    """Return ``trim_history``. Raises ``ModuleNotFoundError`` at RED."""
    from app.services.coach import trim_history

    return trim_history


def _turn(index: int, content: str) -> dict[str, str]:
    return {"role": "user" if index % 2 == 0 else "coach", "content": content}


def _small_turn(index: int) -> dict[str, str]:
    return _turn(index, f"[{index:03d}]")


def _big_turn(index: int) -> dict[str, str]:
    # 800 chars each: [NNN] tag (5) + 795 filler. ~200 tokens per turn by len/4.
    return _turn(index, f"[{index:03d}]" + "x" * 795)


def _has_turn(retained: object, index: int) -> bool:
    assert isinstance(retained, list)
    tag = f"[{index:03d}]"
    return any(str(turn.get("content", "")).startswith(tag) for turn in retained)


def _snapshot() -> dict[str, object]:
    """A complete ``SnapshotResponse``-shaped snapshot dict (native ``date`` leaves)."""
    return {
        "window": {"start": date(2026, 7, 6), "end": date(2026, 7, 12), "days": 7},
        "volume": {
            "today_min": 120,
            "week_min": 540,
            "month_min": 2100,
            "all_time_min": 9000,
            "daily_avg_30d_min": 74.6,
            "per_day": [{"date": date(2026, 7, 6), "min": 120}],
        },
        "consistency": {
            "score": 71,
            "low_confidence": False,
            "regularity": 0.62,
            "start_stability": 0.55,
            "median_start_local": "09:40",
        },
        "focus": {"deep_count": 3, "deep_minutes": 262, "deep_share": 0.43},
        "switching": {
            "per_day": [
                {
                    "date": date(2026, 7, 6),
                    "switches": 4,
                    "interruptions": 2,
                    "switch_load": 6,
                    "flagged": False,
                }
            ],
            "baseline_mean": 5.2,
        },
        "streaks": {"current": 4, "longest": 12},
        "baselines": {
            "volume": {"value": 74.0, "delta": 6.0, "zone": "steady"},
            "consistency": {"value": 55.0, "delta": -3.0, "zone": "building"},
            "focus_share": {"value": 0.38, "delta": 0.05, "zone": "steady"},
            "switch_load": {"value": 5.0, "delta": 1.0, "zone": "steady"},
        },
        "top_categories": [{"id": 10, "name": "Deep Work", "color": "#3B82F6", "week_min": 300}],
        "per_category_per_day": [
            {
                "id": 10,
                "name": "Deep Work",
                "color": "#3B82F6",
                "per_day": [{"date": date(2026, 7, 6), "min": 120}],
            }
        ],
    }


def test_history_is_trimmed_newest_first_to_the_twenty_turn_cap() -> None:
    """A thread of >20 short turns is trimmed newest-first to the 20-turn hard cap.

    25 tiny turns (token budget not binding) -> only the 20 most recent survive; the 5
    oldest are dropped and not summarized (architecture §4.3).

    @trace FR-COACH-04
    """
    trim_history = _load_trim()
    turns = [_small_turn(i) for i in range(25)]

    retained = trim_history(turns)

    assert isinstance(retained, list)
    assert len(retained) == 20
    assert not _has_turn(retained, 0)  # oldest dropped
    assert not _has_turn(retained, 4)
    assert _has_turn(retained, 5)  # newest 20 kept
    assert _has_turn(retained, 24)


def test_history_is_trimmed_to_the_token_budget_oldest_dropped_first() -> None:
    """<=20 turns whose combined size exceeds ~2,000 tokens drop oldest-first until they fit.

    12 turns of 800 chars each is ~2,400 tokens (len/4), over the ~2,000-token budget, so the
    oldest turns are dropped newest-first until the history fits (the exact crossing turn is
    not pinned, architecture §4.3). The 20-turn cap is not the binding constraint here.

    @trace FR-COACH-04
    """
    trim_history = _load_trim()
    turns = [_big_turn(i) for i in range(12)]

    retained = trim_history(turns)

    assert isinstance(retained, list)
    assert 1 <= len(retained) < 12  # some oldest turns dropped by the token budget
    retained_chars = sum(len(str(turn["content"])) for turn in retained)
    assert retained_chars <= 8000  # ~2,000 tokens at len/4
    assert not _has_turn(retained, 0)  # the two oldest dropped first
    assert not _has_turn(retained, 1)
    assert _has_turn(retained, 11)  # the newest is always kept


def test_coach_snapshot_fixture_conforms_to_shipped_snapshot_response() -> None:
    """The coach's snapshot fixture matches the shipped slice-004 ``SnapshotResponse`` shape.

    Producer-drift seam guard (expected GREEN): the coach reads the real ``SnapshotResponse``
    as its closed set of citable numbers (FR-COACH-04), so if the slice-004 producer drifts
    this validation fails here rather than silently staling the coach's grounding fixtures.

    @trace FR-COACH-04
    """
    snapshot = _snapshot()

    model = SnapshotResponse.model_validate(snapshot)  # raises on any field drift

    assert set(SnapshotResponse.model_fields) == _SNAPSHOT_TOP_LEVEL_KEYS
    assert set(model.model_dump().keys()) == set(snapshot.keys())
