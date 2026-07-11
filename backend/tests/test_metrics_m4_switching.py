"""Pure unit tests for M4 Context Switching (spec 004, FR-METR-04, architecture §3.4).

Tests the not-yet-written ``app.core.metrics.m4_switching`` module directly with fixture
``CategorizedSession`` lists -- no DB, no ``RUN_DB_TESTS`` gate.

``SessionData`` (slice 003) intentionally carries no category (see its own docstring);
M4 needs a session's category to detect switches, so this pins a **new** pairing
dataclass in a **new** module the implementer owns (not an edit to
``app/core/model.py``, which stays slice-003-owned per the cross-slice overlap rule):

    # app/core/metrics/model.py
    @dataclass
    class CategorizedSession:
        session: SessionData
        category_id: int

Expected pure API this file pins for ``app/core/metrics/m4_switching.py`` (does not
exist yet -> RED at ``ModuleNotFoundError``):

    @dataclass
    class DaySwitchCounts:
        day: date
        switches: int
        interruptions: int
        switch_load: int

    def compute_day_switch_load(
        sessions: Sequence[CategorizedSession], day: date
    ) -> DaySwitchCounts
        ``sessions`` is *already* the target day's own whole-session list (grouping a
        session to its local start day, per §3.7, is the caller's job via
        ``days.py``'s ``local_start_day`` -- this function only orders by
        ``started_at`` and counts transitions/pauses within what it is given).
        "Consecutive" is interpreted as *within* that day's own session list (switches
        reset at each day boundary) -- the ratified scenario's own example ("an active
        day with 3 jumps between consecutive sessions") only describes within-day
        transitions, and "per active day" is the requirement's stated unit, so a
        transition spanning two different days' session lists is never counted. This
        interpretation is a judgment call the implementer should be aware of.

    def is_fragmented(switch_load: int, baseline_mean: float) -> bool
        ``switch_load > max(3, 1.5 * baseline_mean)`` (architecture §3.4) -- isolated
        from any baseline-*computation* concern (the trailing-30-day-active-day mean
        itself), which is the snapshot assembler's wiring problem, not tested by name
        here since no scenario pins its own function shape.

Archived-category note: M4's pure math only ever compares opaque ``category_id``
values for equality -- archived-ness (a slice-002 read-layer concept) never reaches
this layer, so "archived categories still count toward switches" is encoded here by
using two *different* category ids (one commented as representing an archived
category) and asserting the transition still counts -- proving M4 does not special-case
any id, which is the only way archiving could otherwise suppress a switch.

Imports happen inside each test (``_load``) for a clean per-test ``ModuleNotFoundError``.
"""

from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc


def _load() -> tuple[object, object, object, object, object]:
    """Raises ``ModuleNotFoundError`` at RED.

    Returns ``(SessionData, PauseData, CategorizedSession, compute_day_switch_load,
    is_fragmented)``.
    """
    from app.core.metrics.m4_switching import compute_day_switch_load, is_fragmented
    from app.core.metrics.model import CategorizedSession
    from app.core.model import PauseData, SessionData

    return SessionData, PauseData, CategorizedSession, compute_day_switch_load, is_fragmented


def _cat_session(
    session_cls: object,
    categorized_cls: object,
    hour: int,
    category_id: int,
    pause: tuple[int, int] | None,
    pause_cls: object | None = None,
) -> object:
    """One 30-min session on 2026-03-10 at ``hour``:00 UTC, tagged with ``category_id``.

    ``pause`` is an optional ``(start_minute, end_minute)`` pair, minutes into the
    session, for a single pause segment.
    """
    start = datetime(2026, 3, 10, hour, 0, 0, tzinfo=UTC)
    pauses = []
    if pause is not None:
        assert pause_cls is not None
        pauses = [
            pause_cls(
                paused_at=start + timedelta(minutes=pause[0]),
                resumed_at=start + timedelta(minutes=pause[1]),
            )
        ]
    session = session_cls(started_at=start, ended_at=start + timedelta(minutes=30), pauses=pauses)
    return categorized_cls(session=session, category_id=category_id)


def test_switches_and_interruptions_compose_the_switch_load() -> None:
    """3 category jumps + 2 pauses -> switches=3, interruptions=2, switch_load=5.

    4 consecutive same-day sessions, categories A,B,A,B (3 transitions where the
    category differs), with one pause each on the 2nd and 3rd sessions.

    @trace FR-METR-04
    """
    SessionData, PauseData, CategorizedSession, compute_day_switch_load, _is_frag = _load()
    day = date(2026, 3, 10)
    sessions = [
        _cat_session(SessionData, CategorizedSession, 8, 1, None),
        _cat_session(SessionData, CategorizedSession, 9, 2, (5, 10), PauseData),
        _cat_session(SessionData, CategorizedSession, 10, 1, (5, 10), PauseData),
        _cat_session(SessionData, CategorizedSession, 11, 2, None),
    ]

    result = compute_day_switch_load(sessions, day)

    assert result.day == day
    assert result.switches == 3  # A->B, B->A, A->B
    assert result.interruptions == 2  # one pause each on the 2nd and 3rd sessions
    assert result.switch_load == 5


def test_each_pause_is_an_interruption() -> None:
    """A day whose sessions contain one pause segment counts it as an interruption (E-6).

    @trace FR-METR-04
    """
    SessionData, PauseData, CategorizedSession, compute_day_switch_load, _is_frag = _load()
    day = date(2026, 3, 10)
    session = _cat_session(SessionData, CategorizedSession, 8, 1, (10, 20), PauseData)

    result = compute_day_switch_load([session], day)

    assert result.switches == 0  # only one session -- no transition to compare
    assert result.interruptions == 1
    assert result.switch_load == 1


def test_archived_categories_still_count_toward_switches() -> None:
    """Two consecutive sessions with different categories still switch, archived or not.

    category_id=2 stands in for a category the user has since archived (slice 002
    §7); M4's pure math never sees or checks archived-ness, so the transition counts
    exactly as it would for two active categories.

    @trace FR-METR-04
    """
    SessionData, _PauseData, CategorizedSession, compute_day_switch_load, _is_frag = _load()
    day = date(2026, 3, 10)
    sessions = [
        _cat_session(SessionData, CategorizedSession, 8, 1, None),  # active category
        _cat_session(SessionData, CategorizedSession, 9, 2, None),  # now-archived category
    ]

    result = compute_day_switch_load(sessions, day)

    assert result.switches == 1


def test_a_day_above_the_flag_threshold_is_flagged_at_the_threshold_is_not() -> None:
    """switch_load > max(3, 1.5*baseline) flags; the boundary is strictly greater-than.

    baseline_mean=4.0 -> threshold = max(3, 6.0) = 6.0. switch_load=7 (> 6.0) is
    flagged; switch_load=6 (not > 6.0) is not.

    @trace FR-METR-04
    """
    _SessionData, _PauseData, _CategorizedSession, _compute, is_fragmented = _load()

    assert is_fragmented(7, 4.0) is True
    assert is_fragmented(6, 4.0) is False


def test_the_floor_prevents_flagging_near_zero_baselines() -> None:
    """A ~0 baseline floors the threshold at max(3, ...) = 3; switch_load=3 is not flagged.

    @trace FR-METR-04
    """
    _SessionData, _PauseData, _CategorizedSession, _compute, is_fragmented = _load()

    assert is_fragmented(3, 0.0) is False
