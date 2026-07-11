"""Session net-time interval merging, shared by day attribution and M3 focus.

``net_intervals`` sorts a session's pauses by ``paused_at`` and sweeps them against a
``cursor`` to subtract paused time from ``[started_at, ended_at)``, **merging** any
overlapping or nested pause segments as it goes (a pause that starts before the cursor
has already caught up simply extends the cursor rather than being double-subtracted).
This is the same sweep ``app/core/metrics/days.py`` has always used for its own day
splitting -- pulled out here so ``m3_focus.py`` can share it too, rather than falling
back to ``app.core.durations.net_seconds``, which sums each pause's own duration
**naively** and so over-subtracts (and can under-report net time, even to zero) whenever
two pause segments overlap. Extracting this into its own module (rather than importing
``days.py`` from ``m3_focus.py`` or vice versa) keeps both call sites peers of a shared
primitive instead of one metric module depending on another's internals.

Pure and framework-free (no FastAPI/SQLAlchemy/I/O imports, NFR-DET-01).
"""

from datetime import datetime

from app.core.model import SessionData


def net_intervals(session: SessionData) -> list[tuple[datetime, datetime]]:
    """The session's net time as sorted, pause-excluded ``[start, end)`` sub-intervals.

    Pauses are sorted by ``paused_at`` and subtracted in order, merging overlapping or
    nested segments so each moment of paused time is only ever subtracted once; a
    zero-length or inverted remainder (defensive against out-of-order/overlapping pause
    input) is simply skipped.
    """
    intervals: list[tuple[datetime, datetime]] = []
    cursor = session.started_at
    for pause in sorted(session.pauses, key=lambda p: p.paused_at):
        if pause.paused_at > cursor:
            intervals.append((cursor, pause.paused_at))
        if pause.resumed_at > cursor:
            cursor = pause.resumed_at
    if session.ended_at > cursor:
        intervals.append((cursor, session.ended_at))
    return intervals


def net_seconds(session: SessionData) -> int:
    """Overlap-aware net seconds: the summed duration of ``net_intervals``.

    Agrees with ``days.py``'s day-splitting (built on the same sweep) even when pause
    segments overlap -- unlike ``app.core.durations.net_seconds``, which is naive about
    overlap and so can disagree with day attribution on the same session's own net time.
    """
    return sum(round((end - start).total_seconds()) for start, end in net_intervals(session))
