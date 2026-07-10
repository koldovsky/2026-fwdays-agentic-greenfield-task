"""Derived session durations (architecture §2.2, FR-SESS-02).

``gross = ended_at - started_at``; ``net = gross - sum(pause durations)``. Both
are whole seconds derived at read time and **never stored**, so no total can fall
out of sync when a pause is edited. Pure and framework-free (reused by slice 004).
"""

from app.core.model import SessionData


def gross_seconds(session: SessionData) -> int:
    """Whole seconds between ``started_at`` and ``ended_at``."""
    return int((session.ended_at - session.started_at).total_seconds())


def net_seconds(session: SessionData) -> int:
    """Gross minus the summed durations of every discrete pause segment."""
    paused = sum(
        int((pause.resumed_at - pause.paused_at).total_seconds()) for pause in session.pauses
    )
    return gross_seconds(session) - paused
