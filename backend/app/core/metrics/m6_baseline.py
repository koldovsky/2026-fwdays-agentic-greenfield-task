"""M6 baseline deltas and zones (architecture §3.6, §3.8, FR-METR-06).

For each of the four zoned scores {M1 daily volume, M2, M3 ``deep_share``, M4
``switch_load``}: ``value`` is the score's own current 30-day reading (trailing 30 days
ending **today**) and ``baseline`` is the same score over the trailing 30 days ending
**yesterday** (so today's partial day never pollutes its own baseline, §3.6). The exact
choice of "value" window is a judgment call the ratified scenarios deliberately leave
open (see ``test_metrics_m6_baseline.py``'s own docstring) -- anchoring both sides on the
same 30-day frame keeps ``value``/``baseline`` genuinely comparable and reuses each
metric's own pure function unmodified.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from app.core.metrics.days import daily_net_minutes, local_start_day
from app.core.metrics.m1_volume import VolumeMetrics, compute_volume
from app.core.metrics.m2_consistency import ConsistencyMetrics, compute_consistency
from app.core.metrics.m3_focus import compute_focus
from app.core.metrics.m4_switching import mean_switch_load
from app.core.metrics.model import CategorizedSession

_BASELINE_WINDOW_DAYS = 30
_MIN_HISTORY_DAYS = 7
_GREEN_CUTOFF = -0.05
_YELLOW_CUTOFF = -0.20


@dataclass
class BaselineEntry:
    value: float
    delta: float | None
    zone: str


def zone_for(value: float, baseline: float, *, higher_is_better: bool) -> BaselineEntry:
    """The §3.6 threshold math: ``delta = value - baseline`` always; ``rel`` only when defined.

    ``rel`` is normalized (negated for a lower-better metric) so positive ``rel`` always
    means improvement; zone is green (``rel >= -0.05``), yellow (``-0.20 <= rel < -0.05``),
    red (``rel < -0.20``), or neutral (``baseline == 0``, ``rel`` undefined).
    """
    delta = value - baseline
    if baseline == 0:
        return BaselineEntry(value=value, delta=delta, zone="neutral")

    rel = delta / baseline
    if not higher_is_better:
        rel = -rel

    if rel >= _GREEN_CUTOFF:
        zone = "green"
    elif rel >= _YELLOW_CUTOFF:
        zone = "yellow"
    else:
        zone = "red"
    return BaselineEntry(value=value, delta=delta, zone=zone)


def baseline_window(today: date) -> tuple[date, date]:
    """The trailing-30-day baseline window ending **yesterday** (never today)."""
    end = today - timedelta(days=1)
    start = end - timedelta(days=_BASELINE_WINDOW_DAYS - 1)
    return start, end


def sparse_data_floor(entry: BaselineEntry, *, history_days: int) -> BaselineEntry:
    """Below 7 days of history: show ``value``, null the delta, and zone "building"."""
    if history_days < _MIN_HISTORY_DAYS:
        return BaselineEntry(value=entry.value, delta=None, zone="building")
    return entry


@dataclass
class Baselines:
    volume: BaselineEntry
    consistency: BaselineEntry
    focus_share: BaselineEntry
    switch_load: BaselineEntry
    # Deliberately no 5th "streak" field -- M5 is reported unzoned elsewhere (§3.6 vs
    # §4.1, resolved in favor of exactly these four zoned scores).


def _history_days(sessions: Sequence[CategorizedSession], tz: str, today: date) -> int:
    """The span from the earliest saved session's local start day to ``today``, inclusive."""
    if not sessions:
        return 0
    earliest = min(local_start_day(entry.session, tz) for entry in sessions)
    return (today - earliest).days + 1


def _sessions_in_range(
    sessions: Sequence[CategorizedSession], tz: str, start: date, end: date
) -> list[CategorizedSession]:
    return [entry for entry in sessions if start <= local_start_day(entry.session, tz) <= end]


def _score_or_zero(score: float | None) -> float:
    """A metric's own low-confidence ``None`` degrades to 0 for M6's arithmetic (§3.8)."""
    return float(score) if score is not None else 0.0


def compute_baselines(
    sessions: Sequence[CategorizedSession],
    tz: str,
    today: date,
    *,
    daily_totals: dict[date, int] | None = None,
    volume_today: VolumeMetrics | None = None,
    consistency_today: ConsistencyMetrics | None = None,
) -> Baselines:
    """``daily_totals`` / ``volume_today`` / ``consistency_today`` (optional): quantities the
    snapshot assembler already computed for ``today``. Threading them in stops M6 from
    re-deriving, per snapshot request, the exact same full-history day-split and the same
    ``today`` volume/consistency the snapshot just built (the NFR-PERF-01 hot path). Every
    value is identical whether supplied or recomputed here — this only removes redundant
    work; the ``yesterday`` side still computes, but reuses ``daily_totals`` for its
    day-split instead of re-splitting the whole history. When nothing is supplied (a direct
    caller, e.g. a unit test) M6 computes the day-split once and threads it internally.
    """
    plain_sessions = [entry.session for entry in sessions]
    totals = daily_net_minutes(plain_sessions, tz) if daily_totals is None else daily_totals
    history_days = _history_days(sessions, tz, today)

    current_start = today - timedelta(days=_BASELINE_WINDOW_DAYS - 1)
    baseline_start, baseline_end = baseline_window(today)
    yesterday = baseline_end

    current_range = _sessions_in_range(sessions, tz, current_start, today)
    baseline_range = _sessions_in_range(sessions, tz, baseline_start, baseline_end)
    current_range_sessions = [entry.session for entry in current_range]
    baseline_range_sessions = [entry.session for entry in baseline_range]

    volume_current = (
        compute_volume(plain_sessions, tz, today, daily_totals=totals)
        if volume_today is None
        else volume_today
    )
    volume_value = volume_current.daily_avg_30d_min
    volume_baseline = compute_volume(
        plain_sessions, tz, yesterday, daily_totals=totals
    ).daily_avg_30d_min
    volume_entry = sparse_data_floor(
        zone_for(volume_value, volume_baseline, higher_is_better=True), history_days=history_days
    )

    consistency_current = (
        compute_consistency(plain_sessions, tz, today, daily_totals=totals)
        if consistency_today is None
        else consistency_today
    )
    consistency_value = _score_or_zero(consistency_current.score)
    consistency_baseline = _score_or_zero(
        compute_consistency(plain_sessions, tz, yesterday, daily_totals=totals).score
    )
    consistency_entry = sparse_data_floor(
        zone_for(consistency_value, consistency_baseline, higher_is_better=True),
        history_days=history_days,
    )

    focus_value = compute_focus(current_range_sessions).deep_share
    focus_baseline = compute_focus(baseline_range_sessions).deep_share
    focus_entry = sparse_data_floor(
        zone_for(focus_value, focus_baseline, higher_is_better=True), history_days=history_days
    )

    switch_value = mean_switch_load(sessions, tz, current_start, today)
    switch_baseline = mean_switch_load(sessions, tz, baseline_start, baseline_end)
    switch_entry = sparse_data_floor(
        zone_for(switch_value, switch_baseline, higher_is_better=False), history_days=history_days
    )

    return Baselines(
        volume=volume_entry,
        consistency=consistency_entry,
        focus_share=focus_entry,
        switch_load=switch_entry,
    )
