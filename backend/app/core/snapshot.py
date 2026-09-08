"""Assembles the architecture §4.1 snapshot JSON (NFR-DET-01, FR-METR-01).

Pure and framework-free: returns a plain nested dict/list structure with native
``datetime.date`` values (never pre-stringified) -- the thin Pydantic response model at
the API layer (``app/schemas/stats.py``) is what turns dates into wire-format ISO
strings, per architecture §1's "core is pure / api is thin" split.

``window`` (optional): with none given, the reporting range is the current week
(user-TZ Monday 00:00 -> today). With one given, it re-scopes ONLY ``volume.per_day``,
``focus``, ``switching.per_day``, and ``per_category_per_day`` -- ``consistency``,
``baselines``, ``streaks``, and ``top_categories`` never change with ``window``
(``top_categories`` is pinned by its own requirement text to always be "current-week net
minutes"; consistency/baselines keep their own fixed windows per §3.2/§3.6; switching's
own baseline_mean also stays fixed, matching the M6 baselines it feeds -- a judgment call
the ratified text does not name by, kept for internal consistency).

``volume.per_day`` / ``switching.per_day`` / a category's ``per_day`` in
``per_category_per_day`` all zero-fill every day of the reporting range, so a chart never
has gaps -- a judgment call the ratified text does not rule out.
"""

from collections.abc import Sequence
from datetime import date, timedelta

from app.core.metrics.days import daily_net_minutes, local_start_day
from app.core.metrics.m1_volume import compute_volume
from app.core.metrics.m2_consistency import compute_consistency
from app.core.metrics.m3_focus import compute_focus
from app.core.metrics.m4_switching import compute_day_switch_load, is_fragmented, mean_switch_load
from app.core.metrics.m5_streaks import compute_streaks
from app.core.metrics.m6_baseline import BaselineEntry, compute_baselines
from app.core.metrics.model import CategorizedSession, CategoryInfo
from app.core.model import SessionData

_SWITCHING_BASELINE_WINDOW_DAYS = 30


def _monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _date_range(start: date, end: date) -> list[date]:
    return [start + timedelta(days=offset) for offset in range((end - start).days + 1)]


def _sessions_starting_in(
    sessions: Sequence[CategorizedSession], tz: str, start: date, end: date
) -> list[CategorizedSession]:
    return [entry for entry in sessions if start <= local_start_day(entry.session, tz) <= end]


def _entry_dict(entry: BaselineEntry) -> dict[str, object]:
    return {"value": entry.value, "delta": entry.delta, "zone": entry.zone}


def _per_category_daily_minutes(
    sessions: Sequence[CategorizedSession], tz: str
) -> dict[int, dict[date, int]]:
    """Net minutes per category per local day -- the same §3.7 attribution, grouped."""
    sessions_by_category: dict[int, list[SessionData]] = {}
    for entry in sessions:
        sessions_by_category.setdefault(entry.category_id, []).append(entry.session)
    return {
        category_id: daily_net_minutes(category_sessions, tz)
        for category_id, category_sessions in sessions_by_category.items()
    }


def _build_switching_block(
    sessions: Sequence[CategorizedSession],
    tz: str,
    today: date,
    reporting_days: list[date],
) -> dict[str, object]:
    baseline_start = today - timedelta(days=_SWITCHING_BASELINE_WINDOW_DAYS - 1)
    baseline_mean = mean_switch_load(sessions, tz, baseline_start, today)

    # Bucket every session by its local start day ONCE (O(sessions)), then look each
    # reporting day up in its bucket -- so this block is O(reporting_days + total_sessions),
    # not O(reporting_days x total_sessions). The old per-day re-filter of the whole history
    # went quadratic on an ordinary large history under a legitimate ~1-year window.
    # ``compute_day_switch_load`` sorts its input by ``started_at`` internally, so bucket
    # insertion order is irrelevant and the result is byte-for-byte identical to the filter.
    sessions_by_day: dict[date, list[CategorizedSession]] = {}
    for entry in sessions:
        sessions_by_day.setdefault(local_start_day(entry.session, tz), []).append(entry)

    per_day = []
    for day in reporting_days:
        counts = compute_day_switch_load(sessions_by_day.get(day, []), day)
        per_day.append(
            {
                "date": day,
                "switches": counts.switches,
                "interruptions": counts.interruptions,
                "switch_load": counts.switch_load,
                "flagged": is_fragmented(counts.switch_load, baseline_mean),
            }
        )
    return {"per_day": per_day, "baseline_mean": baseline_mean}


def _build_top_categories(
    per_category: dict[int, dict[date, int]],
    categories: Sequence[CategoryInfo],
    week_start: date,
    today: date,
) -> list[dict[str, object]]:
    categories_by_id = {category.id: category for category in categories}

    entries = []
    for category_id, daily_totals in per_category.items():
        category = categories_by_id.get(category_id)
        if category is None:
            continue
        week_min = sum(
            minutes for day, minutes in daily_totals.items() if week_start <= day <= today
        )
        if week_min > 0:
            entries.append(
                {
                    "id": category.id,
                    "name": category.name,
                    "color": category.color,
                    "week_min": week_min,
                }
            )
    entries.sort(key=lambda entry: (-entry["week_min"], entry["name"]))  # type: ignore[operator]
    return entries[:5]


def _build_per_category_per_day(
    per_category: dict[int, dict[date, int]],
    categories: Sequence[CategoryInfo],
    reporting_days: list[date],
) -> list[dict[str, object]]:
    categories_by_id = {category.id: category for category in categories}

    entries = []
    for category_id, daily_totals in per_category.items():
        category = categories_by_id.get(category_id)
        if category is None:
            continue
        per_day = [{"date": day, "min": daily_totals.get(day, 0)} for day in reporting_days]
        if sum(item["min"] for item in per_day) > 0:  # type: ignore[misc]
            entries.append(
                {
                    "id": category.id,
                    "name": category.name,
                    "color": category.color,
                    "per_day": per_day,
                }
            )
    return entries


def build_snapshot(
    sessions: Sequence[CategorizedSession],
    categories: Sequence[CategoryInfo],
    tz: str,
    today: date,
    window: tuple[date, date] | None = None,
) -> dict[str, object]:
    plain_sessions = [entry.session for entry in sessions]

    # The full-history per-day net-minute split (FR-METR-07) is the single most expensive
    # shared quantity: M1/M2/M5 and both sides of M6 all need it. Compute it **once** here
    # and thread it through every consumer via their ``daily_totals`` param, so a snapshot
    # assembles with the day-split evaluated once instead of ~a dozen times (NFR-PERF-01).
    full_totals = daily_net_minutes(plain_sessions, tz)

    range_start, range_end = window if window is not None else (_monday_of(today), today)
    reporting_days = _date_range(range_start, range_end)

    # --- volume (per_day re-scoped by window; the windows below never are) -----------
    volume = compute_volume(plain_sessions, tz, today, daily_totals=full_totals)
    volume_block = {
        "today_min": volume.today_min,
        "week_min": volume.week_min,
        "month_min": volume.month_min,
        "all_time_min": volume.all_time_min,
        "daily_avg_30d_min": volume.daily_avg_30d_min,
        "per_day": [{"date": day, "min": full_totals.get(day, 0)} for day in reporting_days],
    }

    # --- consistency (fixed 14-day window, §3.2 -- never re-scoped) -------------------
    consistency = compute_consistency(plain_sessions, tz, today, daily_totals=full_totals)
    consistency_block = {
        "score": consistency.score,
        "low_confidence": consistency.low_confidence,
        "regularity": consistency.regularity,
        "start_stability": consistency.start_stability,
        "median_start_local": consistency.median_start_local,
    }

    # --- focus (re-scoped to the reporting range) --------------------------------------
    range_sessions = _sessions_starting_in(sessions, tz, range_start, range_end)
    focus = compute_focus([entry.session for entry in range_sessions])
    focus_block = {
        "deep_count": focus.deep_count,
        "deep_minutes": focus.deep_minutes,
        "deep_share": focus.deep_share,
    }

    # --- switching (per_day re-scoped; baseline_mean stays fixed) ----------------------
    switching_block = _build_switching_block(sessions, tz, today, reporting_days)

    # --- streaks (fixed, never re-scoped) -----------------------------------------------
    streaks = compute_streaks(plain_sessions, tz, today, daily_totals=full_totals)
    streaks_block = {"current": streaks.current, "longest": streaks.longest}

    # --- baselines (fixed 30-day windows, §3.6 -- never re-scoped) ----------------------
    # Reuse the one full-history split plus the ``today`` volume/consistency already built
    # above, so M6 never re-derives them (its four zoned scores otherwise recompute the
    # snapshot's own work per request).
    baselines = compute_baselines(
        sessions,
        tz,
        today,
        daily_totals=full_totals,
        volume_today=volume,
        consistency_today=consistency,
    )
    baselines_block = {
        "volume": _entry_dict(baselines.volume),
        "consistency": _entry_dict(baselines.consistency),
        "focus_share": _entry_dict(baselines.focus_share),
        "switch_load": _entry_dict(baselines.switch_load),
    }

    # --- category-keyed blocks (one per-category split, shared by both) -----------------
    # top_categories is always the current week (never re-scoped); per_category_per_day is
    # re-scoped to the reporting range. Both attribute the same §3.7 per-category net
    # minutes, so build that mapping once and hand it to each.
    per_category = _per_category_daily_minutes(sessions, tz)
    week_start = _monday_of(today)
    top_categories = _build_top_categories(per_category, categories, week_start, today)
    per_category_per_day = _build_per_category_per_day(per_category, categories, reporting_days)

    return {
        "window": {"start": range_start, "end": range_end, "days": len(reporting_days)},
        "volume": volume_block,
        "consistency": consistency_block,
        "focus": focus_block,
        "switching": switching_block,
        "streaks": streaks_block,
        "baselines": baselines_block,
        "top_categories": top_categories,
        "per_category_per_day": per_category_per_day,
    }
