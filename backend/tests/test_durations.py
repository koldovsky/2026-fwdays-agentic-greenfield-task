"""Pure unit tests for the derived duration functions (spec 003, FR-SESS-02).

Net and gross are derived, never stored (architecture §2.2): ``gross = ended - started``
and ``net = gross - sum(pause durations)``. These live as a framework-free pure function
in ``app/core`` that the metrics slice will reuse, so this file needs no DB and is NOT
gated behind ``RUN_DB_TESTS`` — it imports and calls the functions directly.

At RED ``app.core.model`` / ``app.core.durations`` do not exist yet. The imports are
performed *inside* each test (via ``_load``) rather than at module top so the
missing-symbol failure is a clean per-test ``ModuleNotFoundError`` — the intended
absent-behavior reason — instead of a collection error that would halt the whole suite.
"""

from datetime import datetime, timezone

UTC = timezone.utc


def _load() -> tuple[object, object, object, object]:
    """Import the not-yet-existing pure duration API.

    Raises ``ModuleNotFoundError`` at RED (modules absent); returns the four symbols at
    GREEN: ``(SessionData, PauseData, gross_seconds, net_seconds)``.
    """
    from app.core.durations import gross_seconds, net_seconds
    from app.core.model import PauseData, SessionData

    return SessionData, PauseData, gross_seconds, net_seconds


def test_gross_is_end_minus_start_in_seconds() -> None:
    """Gross duration is ended_at - started_at expressed in whole seconds.

    @trace FR-SESS-02
    """
    SessionData, _PauseData, gross_seconds, _net_seconds = _load()
    session = SessionData(
        started_at=datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 15, 11, 0, 0, tzinfo=UTC),
        pauses=[],
    )
    assert gross_seconds(session) == 3600


def test_net_equals_gross_when_no_pauses() -> None:
    """With no pauses, net equals gross.

    @trace FR-SESS-02
    """
    SessionData, _PauseData, gross_seconds, net_seconds = _load()
    session = SessionData(
        started_at=datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 15, 11, 0, 0, tzinfo=UTC),
        pauses=[],
    )
    assert net_seconds(session) == gross_seconds(session) == 3600


def test_net_subtracts_a_single_pause() -> None:
    """Net subtracts a pause's duration from gross.

    @trace FR-SESS-02
    """
    SessionData, PauseData, _gross_seconds, net_seconds = _load()
    session = SessionData(
        started_at=datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 15, 11, 0, 0, tzinfo=UTC),
        pauses=[
            PauseData(
                paused_at=datetime(2026, 1, 15, 10, 10, 0, tzinfo=UTC),
                resumed_at=datetime(2026, 1, 15, 10, 20, 0, tzinfo=UTC),
            )
        ],
    )
    # 3600 gross - 600 paused = 3000 net.
    assert net_seconds(session) == 3000


def test_net_subtracts_both_of_two_pauses() -> None:
    """Net subtracts the sum of two discrete pauses, not just one.

    @trace FR-SESS-02
    """
    SessionData, PauseData, _gross_seconds, net_seconds = _load()
    session = SessionData(
        started_at=datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC),
        ended_at=datetime(2026, 1, 15, 11, 0, 0, tzinfo=UTC),
        pauses=[
            PauseData(
                paused_at=datetime(2026, 1, 15, 10, 10, 0, tzinfo=UTC),
                resumed_at=datetime(2026, 1, 15, 10, 15, 0, tzinfo=UTC),
            ),  # 5 min
            PauseData(
                paused_at=datetime(2026, 1, 15, 10, 30, 0, tzinfo=UTC),
                resumed_at=datetime(2026, 1, 15, 10, 40, 0, tzinfo=UTC),
            ),  # 10 min
        ],
    )
    # 3600 gross - (300 + 600) paused = 2700 net.
    assert net_seconds(session) == 2700
