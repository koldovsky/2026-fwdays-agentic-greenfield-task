"""Framework-free session/pause value objects for the duration derivation.

These pure dataclasses carry exactly what ``app.core.durations`` needs — a
session's bounds and its discrete pauses — with no SQLAlchemy or FastAPI import,
so the metrics slice (004) can reuse the same net/gross derivation without a DB.
The API layer maps ORM rows onto these before computing gross/net.
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class PauseData:
    """One closed pause interval (``paused_at`` .. ``resumed_at``)."""

    paused_at: datetime
    resumed_at: datetime


@dataclass
class SessionData:
    """A session's bounds and its discrete pauses (never merged)."""

    started_at: datetime
    ended_at: datetime
    pauses: list[PauseData] = field(default_factory=list)
