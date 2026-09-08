"""M4 Context Switching (architecture §3.4, FR-METR-04)."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

from app.core.metrics.days import local_start_day
from app.core.metrics.model import CategorizedSession

_FLAG_FLOOR = 3
_FLAG_MULTIPLIER = 1.5


@dataclass
class DaySwitchCounts:
    day: date
    switches: int
    interruptions: int
    switch_load: int


def compute_day_switch_load(
    sessions: Sequence[CategorizedSession], day: date
) -> DaySwitchCounts:
    """``sessions`` is already the target day's own whole-session list (caller groups by day).

    "Consecutive" is interpreted as *within* that day's own session list — switches
    reset at each day boundary, never spanning two different days' session lists.
    """
    ordered = sorted(sessions, key=lambda entry: entry.session.started_at)
    # Consecutive pairs: ``ordered[1:]`` is deliberately one element shorter than
    # ``ordered`` (the last session has no successor), so this zip is never ``strict``.
    switches = sum(
        1
        for previous, current in zip(ordered, ordered[1:], strict=False)
        if previous.category_id != current.category_id
    )
    interruptions = sum(len(entry.session.pauses) for entry in ordered)
    return DaySwitchCounts(
        day=day,
        switches=switches,
        interruptions=interruptions,
        switch_load=switches + interruptions,
    )


def is_fragmented(switch_load: int, baseline_mean: float) -> bool:
    """``switch_load > max(3, 1.5 * baseline_mean)`` — the floor guards near-zero baselines."""
    threshold = max(_FLAG_FLOOR, _FLAG_MULTIPLIER * baseline_mean)
    return switch_load > threshold


def mean_switch_load(
    sessions: Sequence[CategorizedSession], tz: str, start: date, end: date
) -> float:
    """The mean per-active-day ``switch_load`` over ``[start, end]`` (the §3.4 baseline).

    Reused both by M6's ``switch_load`` baseline entry and the snapshot's
    ``switching.baseline_mean`` -- architecture §3.4's "the baseline mean is over the
    trailing 30 days' active days", grouped here by each session's whole-entity local
    start day (§3.7), the same grouping ``compute_day_switch_load`` expects per call.
    0.0 when no day in the range has a session (a well-defined, non-crashing empty case).
    """
    windowed = [entry for entry in sessions if start <= local_start_day(entry.session, tz) <= end]
    days_present = sorted({local_start_day(entry.session, tz) for entry in windowed})
    if not days_present:
        return 0.0
    total_switch_load = sum(
        compute_day_switch_load(
            [entry for entry in windowed if local_start_day(entry.session, tz) == day], day
        ).switch_load
        for day in days_present
    )
    return total_switch_load / len(days_present)
