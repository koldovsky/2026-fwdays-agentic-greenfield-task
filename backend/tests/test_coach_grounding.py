"""Pure unit tests for the grounding validator (spec 006, FR-COACH-02, architecture §4.4).

The grounding validator is the coach's **CRITICAL** promise made mechanical: coach output
may cite **no** number that is not present in the metrics snapshot (or one of its fixed
derived renderings, or the user's own chat message). This suite pins that contract against
a realistic ``SnapshotResponse``-shaped fixture -- no DB, no network, no ``RUN_DB_TESTS``
gate (framework-free, like ``tests/test_metrics_snapshot.py``).

Expected pure API this file pins (new module ``app/core/grounding.py`` -- does not exist
yet, so every test is RED at ``ModuleNotFoundError`` until the implementer writes it):

    # app/core/grounding.py  (pure: no FastAPI / SQLAlchemy / I/O at import,
    #                         like app/core/snapshot.py)
    def check_grounding(
        snapshot: Mapping[str, object],   # a SnapshotResponse-shaped dict
        text: str,                        # the coach output text to validate
        *,
        user_message: str | None = None,  # the current chat message (chat path)
    ) -> GroundingResult
        # GroundingResult exposes:
        #   .grounded:   bool        -- True iff every extracted number is in the
        #                              allowed-number set OR exempt (bare int 0-9)
        #   .violations: list[str]   -- the offending numeric tokens ([] when grounded)

The allowed-number set is derived deterministically from the real snapshot leaves
(architecture §4.4): every numeric leaf at raw / round(v) / round(v,1); **share-typed**
leaves (``focus.deep_share``, ``baselines.focus_share.value``/``.delta``) also as percent
``round(v*100)`` / ``round(v*100, 1)``; **minute-typed** leaves (``*_min``,
``deep_minutes``, ``daily_avg_30d_min``, every ``per_day[].min``, ``top_categories[].week_min``,
``baselines.volume.value``/``.delta``) also as ``h:mm`` from both ``floor(v)`` and
``round(v)`` minutes; ``consistency.median_start_local`` as its ``HH:MM`` literal; **date
components excluded**; plus numbers in ``user_message``. Bare integers 0-9 without units are
exempt (§4.4 item 3).

The snapshot fixture below uses native ``datetime.date`` objects for the date leaves --
exactly what ``StatsService.get_snapshot`` -> ``build_snapshot`` returns at runtime (the
artifact the coach feeds the validator, FR-COACH-04); dates must be excluded from grounding
regardless of representation. ``consistency.median_start_local`` is a plain ``str``. Every
numeric leaf value is chosen to avoid colliding with the fabricated probe numbers this
suite plants (8, 82, 95, 180, 2026), so each "absent number" test proves the rule, not an
accident of the fixture.

Imports happen inside ``_load()`` for a clean per-test ``ModuleNotFoundError`` at RED.
"""

from datetime import date


def _load() -> object:
    """Return ``check_grounding``. Raises ``ModuleNotFoundError`` at RED."""
    from app.core.grounding import check_grounding

    return check_grounding


def _snapshot(**overrides: object) -> dict[str, object]:
    """A realistic ``SnapshotResponse``-shaped dict; ``overrides`` replace top-level blocks.

    Numeric leaves deliberately avoid {8, 82, 95, 180, 2026} and their derived renderings so
    the fabricated-number probes below are genuinely absent from the allowed set.
    """
    snapshot: dict[str, object] = {
        "window": {"start": date(2026, 7, 6), "end": date(2026, 7, 12), "days": 7},
        "volume": {
            "today_min": 120,
            "week_min": 540,
            "month_min": 2100,
            "all_time_min": 9000,
            "daily_avg_30d_min": 74.6,
            "per_day": [
                {"date": date(2026, 7, 6), "min": 120},
                {"date": date(2026, 7, 7), "min": 60},
                {"date": date(2026, 7, 8), "min": 0},
                {"date": date(2026, 7, 9), "min": 90},
                {"date": date(2026, 7, 10), "min": 45},
                {"date": date(2026, 7, 11), "min": 75},
                {"date": date(2026, 7, 12), "min": 50},
            ],
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
                },
                {
                    "date": date(2026, 7, 7),
                    "switches": 3,
                    "interruptions": 1,
                    "switch_load": 4,
                    "flagged": False,
                },
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
        "top_categories": [
            {"id": 10, "name": "Deep Work", "color": "#3B82F6", "week_min": 300},
            {"id": 11, "name": "Reading", "color": "#10B981", "week_min": 140},
        ],
        "per_category_per_day": [
            {
                "id": 10,
                "name": "Deep Work",
                "color": "#3B82F6",
                "per_day": [
                    {"date": date(2026, 7, 6), "min": 120},
                    {"date": date(2026, 7, 7), "min": 60},
                ],
            }
        ],
    }
    snapshot.update(overrides)
    return snapshot


def _mentions(violations: object, token: str) -> bool:
    """True if ``token`` appears among the reported violation tokens."""
    assert isinstance(violations, list)
    return any(token in str(v) for v in violations)


def test_out_of_snapshot_unit_bearing_number_is_a_violation() -> None:
    """A unit-bearing number absent from the snapshot is a grounding violation (E-9).

    @trace FR-COACH-02
    """
    check_grounding = _load()

    result = check_grounding(_snapshot(), "You logged 180 min of deep work this week.")

    assert result.grounded is False
    assert _mentions(result.violations, "180")


def test_derived_share_percent_and_minutes_hmm_renderings_are_allowed() -> None:
    """A share cited as a percent and minutes cited as h:mm are grounded derived renderings.

    focus.deep_share 0.43 -> "43%"; focus.deep_minutes 262 -> "4:22".

    @trace FR-COACH-02
    """
    check_grounding = _load()

    result = check_grounding(
        _snapshot(), "You spent 43% of your time in deep focus, about 4:22 total."
    )

    assert result.grounded is True
    assert result.violations == []


def test_non_clean_share_rendered_as_a_rounded_percent_is_grounded() -> None:
    """A non-clean share ~0.4295 cited as "43%" is grounded, not a false-positive violation.

    round(0.4295 * 100) = round(42.95) = 43, and the allowed set includes both the floored
    and rounded rendering (architecture §4.4).

    @trace FR-COACH-02
    """
    check_grounding = _load()
    snapshot = _snapshot(focus={"deep_count": 3, "deep_minutes": 262, "deep_share": 0.4295})

    result = check_grounding(snapshot, "Deep work was about 43% of your week.")

    assert result.grounded is True


def test_allowed_set_is_deterministic_from_real_leaves_and_excludes_dates() -> None:
    """median_start_local + a share's percent form are grounded; a date component is not.

    consistency.median_start_local "09:40" is allowed as its HH:MM literal and
    baselines.focus_share.value 0.38 -> "38%" is allowed, while the year of window.start
    (2026) is a date component excluded from the allowed set, so a bare 2026 is a violation.

    @trace FR-COACH-02
    """
    check_grounding = _load()

    allowed = check_grounding(
        _snapshot(), "Your median start is 09:40 and your focus baseline sits near 38%."
    )
    assert allowed.grounded is True

    fabricated = check_grounding(_snapshot(), "You completed 2026 sessions.")
    assert fabricated.grounded is False
    assert _mentions(fabricated.violations, "2026")


def test_null_low_confidence_consistency_leaf_contributes_no_number() -> None:
    """A null (low-confidence) consistency leaf adds nothing to the allowed set and never crashes.

    With < 3 active days, consistency.score/regularity/start_stability/median_start_local are
    all null (architecture §3.2); a number that would only be grounded by the (now null) score
    leaf is a violation -- but grounded when the same leaf is non-null.

    @trace FR-COACH-02
    """
    check_grounding = _load()
    null_snapshot = _snapshot(
        consistency={
            "score": None,
            "low_confidence": True,
            "regularity": None,
            "start_stability": None,
            "median_start_local": None,
        }
    )
    scored_snapshot = _snapshot(
        consistency={
            "score": 82,
            "low_confidence": False,
            "regularity": 0.6,
            "start_stability": 0.5,
            "median_start_local": "08:15",
        }
    )
    text = "Your rhythm score is 82."

    null_result = check_grounding(null_snapshot, text)
    scored_result = check_grounding(scored_snapshot, text)

    assert null_result.grounded is False  # the null leaf contributes no 82
    assert scored_result.grounded is True  # the same leaf, non-null, grounds 82


def test_bare_small_integer_without_units_is_exempt() -> None:
    """A bare integer 0-9 without units is exempt, and a spelled-out number yields no token.

    "your 8 deep blocks" -> the extractor emits 8 but the exemption clears it (8 is absent
    from the snapshot here, so this proves the exemption, not membership); "eight" yields no
    digit token (architecture §4.4 item 3).

    @trace FR-COACH-02
    """
    check_grounding = _load()
    snapshot = _snapshot(focus={"deep_count": 3, "deep_minutes": 262, "deep_share": 0.43})

    digit = check_grounding(snapshot, "Nice work on your 8 deep blocks.")
    spelled = check_grounding(snapshot, "You completed eight deep blocks.")

    assert digit.grounded is True
    assert spelled.grounded is True


def test_number_in_the_users_chat_message_is_allowed() -> None:
    """A number the user cited in their current message widens the allowed set (chat path).

    @trace FR-COACH-02
    """
    check_grounding = _load()
    snapshot = _snapshot()  # 95 is absent from the snapshot
    reply = "Compared with the 95 minutes you mentioned, you are on track."

    with_message = check_grounding(snapshot, reply, user_message="I did 95 minutes yesterday.")
    without_message = check_grounding(snapshot, reply)

    assert with_message.grounded is True
    assert without_message.grounded is False
    assert _mentions(without_message.violations, "95")
