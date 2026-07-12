"""Robustness units for the grounding validator (spec 006, FR-COACH-02, NFR-REL-01).

The acceptance suite (``tests/test_coach_grounding.py``) pins the core allowed-set rules on a
well-formed snapshot. These add-on units pin the validator's **edges**: the chat-message
widening for percent/time tokens, and that a malformed or off-shape snapshot leaf never
crashes the check (it simply contributes nothing) -- the coach must degrade, never raise
(NFR-REL-01). Pure, framework-free, no ``RUN_DB_TESTS`` gate. These complement, never replace,
the acceptance tests.
"""

from app.core.grounding import _to_float, check_grounding


def test_boolean_leaves_are_not_numbers() -> None:
    """A bool leaf (``low_confidence``/``flagged``) contributes no number, though bool is an int.

    @trace FR-COACH-02
    """
    assert _to_float(True) is None
    assert _to_float(False) is None
    assert _to_float(5) == 5.0
    assert _to_float("x") is None


def test_user_message_widens_the_allowed_set_with_percent_and_time_tokens() -> None:
    """A percent or ``h:mm`` the user cited in their message grounds the same token in the reply.

    @trace FR-COACH-02
    """
    snapshot = {"focus": {"deep_count": 3, "deep_minutes": 262, "deep_share": 0.43}}
    reply = "Next to the 50% and the 8:15 you mentioned, you are on track."

    with_message = check_grounding(
        snapshot, reply, user_message="I hit 50% focus and started at 8:15."
    )
    without_message = check_grounding(snapshot, reply)

    assert with_message.grounded is True
    assert without_message.grounded is False  # 50% / 8:15 are neither in the snapshot nor cited


def test_negative_minute_typed_leaf_adds_no_hmm_and_never_crashes() -> None:
    """A negative minute-typed leaf (e.g. a negative volume-baseline delta) yields no h:mm.

    @trace FR-COACH-02
    """
    snapshot = {"baselines": {"volume": {"value": 74.0, "delta": -12.0, "zone": "building"}}}

    result = check_grounding(snapshot, "Your daily average dipped a little this week.")

    assert result.grounded is True  # no numeric token in the text; the set built without error


def test_malformed_or_off_shape_snapshot_leaves_are_ignored_not_fatal() -> None:
    """A malformed local-time literal or a non-numeric numeric leaf contributes nothing, no crash.

    @trace FR-COACH-02
    """
    bad_time_colon = check_grounding(
        {"consistency": {"median_start_local": "aa:bb"}}, "A steady week overall."
    )
    bad_time_no_colon = check_grounding(
        {"consistency": {"median_start_local": "sometime"}}, "A steady week overall."
    )
    non_numeric_leaf = check_grounding({"window": {"days": "seven"}}, "A calm week.")

    assert bad_time_colon.grounded is True
    assert bad_time_no_colon.grounded is True
    assert non_numeric_leaf.grounded is True
