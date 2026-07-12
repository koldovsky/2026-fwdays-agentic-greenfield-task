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


# --- Rework (slice 006): three grounding-contract deviations, each red-first (FR-COACH-02) ----
# The comma below is a uk decimal separator, not a thousands separator: `3,5` == the number 3.5.


def test_uk_comma_decimal_is_extracted_and_validated_like_a_period_decimal() -> None:
    """A uk comma decimal ("3,5") is ONE number token, not two exempt bare digits (FR-COACH-06).

    The extractor knew only period decimals, so a fabricated "3,5 hours" split into bare ``3``
    and ``5`` (both exempt 0-9) and the fabricated 3.5 slipped through as **grounded** -- a hole
    in the CRITICAL anti-fabrication promise for the shipped ``uk`` coach. A real leaf rendered
    with a comma ("74,6" for ``daily_avg_30d_min`` 74.6) must stay grounded.

    @trace FR-COACH-02
    """
    snapshot = {"volume": {"daily_avg_30d_min": 74.6}}

    fabricated = check_grounding(snapshot, "You logged 3,5 hours of deep work.")
    grounded = check_grounding(snapshot, "Your daily average is 74,6 minutes.")

    assert fabricated.grounded is False  # 3.5 is absent from the snapshot's allowed set
    assert "3,5" in fabricated.violations  # read whole, normalized to 3.5, then rejected
    assert grounded.grounded is True  # 74,6 is daily_avg_30d_min's uk comma rendering


def test_share_grounds_bare_and_worded_percent_without_a_glyph() -> None:
    """A share's rounded percent grounds with OR without a "%" glyph (spec.md FR-COACH-02).

    The contract enumerates that ``focus.deep_share`` 0.4295 grounds ``{43, 43.0}`` -- i.e.
    "43%", bare "43", AND "43 percent". ``share()`` had added the percent only to the "%"-form
    set, so a bare or worded percent was a false-positive violation.

    @trace FR-COACH-02
    """
    snapshot = {"focus": {"deep_count": 3, "deep_minutes": 262, "deep_share": 0.4295}}

    bare = check_grounding(snapshot, "Deep focus was about 43 of your week.")
    worded = check_grounding(snapshot, "Deep focus was about 43 percent of your week.")
    glyph = check_grounding(snapshot, "Deep focus was about 43% of your week.")

    assert bare.grounded is True
    assert worded.grounded is True
    assert glyph.grounded is True  # the "%"-form path still grounds (no regression)


def test_large_minute_leaf_renders_as_wide_hmm_and_grounds() -> None:
    """A >=100h h:mm rendering of a large minute leaf grounds; a fabricated one is still caught.

    ``all_time_min`` 9000 renders "150:00"; the h:mm extractor capped hours at two digits, so
    "150:00" split into "150"+"00" and the real rendering was flagged. FR-COACH-02 names
    ``all_time_min`` a minute leaf allowed in h:mm.

    @trace FR-COACH-02
    """
    snapshot = {"volume": {"all_time_min": 9000}}

    grounded = check_grounding(snapshot, "All-time deep work stands at 150:00.")
    fabricated = check_grounding(snapshot, "All-time deep work stands at 151:00.")

    assert grounded.grounded is True  # 9000 min == 150:00 (both floor and round)
    assert fabricated.grounded is False
    assert any("151" in v for v in fabricated.violations)  # a fabricated h:mm still fails
