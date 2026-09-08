"""M3 Focus / Deep Work (architecture §3.3, FR-METR-03).

Operates over exactly the session list it is given -- no ``tz``/``today``/window
parameters. The caller (the snapshot assembler) pre-filters ``sessions`` to whichever
window applies, so M3 itself never needs to know about calendar days: a deep block is a
property of one whole session (net duration + pause count), never split by day
attribution (§3.7).

Net minutes are computed via ``app.core.metrics.intervals.net_seconds`` (the same
pause-overlap-merging sweep ``days.py`` uses for day splitting), **not**
``app.core.durations.net_seconds`` -- the latter sums each pause's own duration naively
and so disagrees with day attribution whenever two pause segments on the same session
overlap (M1's per-day totals and M3's ``deep_share`` denominator must agree on one
session's own net time).
"""

from collections.abc import Sequence
from dataclasses import dataclass

from app.core.metrics.intervals import net_seconds
from app.core.model import SessionData

_DEEP_BLOCK_MIN_MINUTES = 60


@dataclass
class FocusMetrics:
    deep_count: int
    deep_minutes: int
    deep_share: float


def _net_minutes(session: SessionData) -> int:
    return net_seconds(session) // 60


def _is_deep_block(session: SessionData) -> bool:
    """>= 60 net minutes (inclusive, E-5) AND zero pause segments (any pause disqualifies, E-6)."""
    return not session.pauses and _net_minutes(session) >= _DEEP_BLOCK_MIN_MINUTES


def compute_focus(sessions: Sequence[SessionData]) -> FocusMetrics:
    deep_sessions = [session for session in sessions if _is_deep_block(session)]
    deep_minutes = sum(_net_minutes(session) for session in deep_sessions)
    total_minutes = sum(_net_minutes(session) for session in sessions)
    deep_share = deep_minutes / total_minutes if total_minutes else 0.0

    return FocusMetrics(
        deep_count=len(deep_sessions),
        deep_minutes=deep_minutes,
        deep_share=deep_share,
    )
