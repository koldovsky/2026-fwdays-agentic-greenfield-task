"""Day attribution: split a session's net minutes across local calendar days.

Architecture §3.7 (FR-METR-07): aggregation **splits a session's net minutes across the
local days it spans** (minute-accurate at local midnight, pauses subtracted from the day
they occur in) while the session **entity is never split** — a caller that needs a whole
entity attributed to exactly one day (a deep block, a day's switch grouping) uses
``local_start_day`` instead of the day-splitting ``daily_net_minutes``. A day is *active*
if it receives >= 1 attributed net minute.

Pure and framework-free (no FastAPI/SQLAlchemy/I/O imports, NFR-DET-01); every other
metric module builds on these three functions.
"""

from collections.abc import Iterator, Sequence
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.core.model import SessionData


def _net_intervals(session: SessionData) -> list[tuple[datetime, datetime]]:
    """The session's net time as sorted, pause-excluded ``[start, end)`` sub-intervals.

    Pauses are sorted by ``paused_at`` and subtracted in order; a zero-length or
    inverted remainder (defensive against out-of-order/overlapping pause input) is
    simply skipped.
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


def _local_midnight(day: date, zone: ZoneInfo) -> datetime:
    return datetime.combine(day, time.min, tzinfo=zone)


def _split_seconds_by_local_day(
    start: datetime, end: datetime, zone: ZoneInfo
) -> Iterator[tuple[date, int]]:
    """Yield ``(local_day, seconds)`` for ``[start, end)``, split at local midnight."""
    if end <= start:
        return
    cursor = start
    day = start.astimezone(zone).date()
    while True:
        next_midnight = _local_midnight(day + timedelta(days=1), zone)
        boundary = min(next_midnight, end)
        seconds = round((boundary - cursor).total_seconds())
        if seconds > 0:
            yield day, seconds
        if boundary >= end:
            return
        cursor = boundary
        day += timedelta(days=1)


def daily_net_minutes(sessions: Sequence[SessionData], tz: str) -> dict[date, int]:
    """Split every session's net minutes across the local days it spans.

    Minute-accurate at local midnight; a day with no attributed minutes is simply
    absent from the returned dict (never a zero-valued key) — callers that need
    zero-filled ranges build that themselves from the window bounds they already know.
    """
    zone = ZoneInfo(tz)
    seconds_by_day: dict[date, int] = {}
    for session in sessions:
        for start, end in _net_intervals(session):
            for day, seconds in _split_seconds_by_local_day(start, end, zone):
                seconds_by_day[day] = seconds_by_day.get(day, 0) + seconds
    minutes_by_day = {day: seconds // 60 for day, seconds in seconds_by_day.items()}
    return {day: minutes for day, minutes in minutes_by_day.items() if minutes > 0}


def active_days(sessions: Sequence[SessionData], tz: str) -> set[date]:
    """The local calendar days receiving >= 1 attributed net minute."""
    return set(daily_net_minutes(sessions, tz).keys())


def local_start_day(session: SessionData, tz: str) -> date:
    """The local calendar day of a single session's ``started_at``.

    Used to attribute a whole, never-split entity (a deep block, a day's switch
    grouping) to exactly one day, per §3.7's "session entity is never split" rule —
    always the session's *start* day, even when it spans local midnight.
    """
    return session.started_at.astimezone(ZoneInfo(tz)).date()
