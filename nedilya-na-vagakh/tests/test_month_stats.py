from datetime import datetime

from bot.models import WeighIn
from bot.month_stats import (
    KYIV_TZ,
    entries_in_month,
    entry_kyiv_dt,
    find_best_month,
    latest_before_month,
    month_bounds_kyiv,
    previous_month_weight_delta,
    summarize_month,
)


def _entry(
    entry_id: int,
    recorded_at: str,
    weight_kg: float,
    *,
    fat_pct: float = 28.0,
    muscle_pct: float = 32.0,
    bmi: float = 24.0,
) -> WeighIn:
    return WeighIn(
        id=entry_id,
        user_id=1,
        recorded_at=recorded_at,
        weight_kg=weight_kg,
        fat_pct=fat_pct,
        muscle_pct=muscle_pct,
        bmi=bmi,
    )


def test_month_bounds_kyiv():
    start, end = month_bounds_kyiv(2026, 7)
    assert start == datetime(2026, 7, 1, tzinfo=KYIV_TZ)
    assert end == datetime(2026, 8, 1, tzinfo=KYIV_TZ)


def test_entries_in_month_respects_kyiv_boundary():
    entries = [
        _entry(1, "2026-06-30T20:00:00+00:00", 72.0),
        _entry(2, "2026-06-30T21:30:00+00:00", 71.5),
        _entry(3, "2026-07-01T08:00:00+00:00", 71.0),
    ]
    june = entries_in_month(entries, year=2026, month=6)
    july = entries_in_month(entries, year=2026, month=7)
    assert len(june) == 1
    assert len(july) == 2
    assert july[0].id == 2


def test_summarize_month_carry_over_baseline():
    entries = [
        _entry(1, "2026-06-15T09:00:00+00:00", 72.0),
        _entry(2, "2026-07-10T09:00:00+00:00", 71.5),
        _entry(3, "2026-07-20T09:00:00+00:00", 71.0),
    ]
    pre_month = latest_before_month(entries, year=2026, month=7)
    summary = summarize_month(entries, year=2026, month=7, pre_month_latest=pre_month)

    assert summary.entry_count == 2
    assert summary.baseline is not None
    assert summary.baseline.weight_kg == 72.0


def test_summarize_month_first_on_first_uses_in_month_entry():
    entries = [
        _entry(1, "2026-07-01T06:00:00+00:00", 71.5),
        _entry(2, "2026-07-15T09:00:00+00:00", 71.0),
    ]
    summary = summarize_month(entries, year=2026, month=7, pre_month_latest=None)

    assert summary.baseline is not None
    assert summary.baseline.id == 1


def test_previous_month_weight_delta_requires_two_entries():
    entries = [
        _entry(1, "2026-06-01T09:00:00+00:00", 72.0),
        _entry(2, "2026-06-15T09:00:00+00:00", 71.0),
        _entry(3, "2026-07-01T09:00:00+00:00", 70.5),
    ]
    ref = datetime(2026, 7, 3, tzinfo=KYIV_TZ)
    assert previous_month_weight_delta(entries, ref=ref) == -1.0


def test_previous_month_weight_delta_none_with_single_entry():
    entries = [_entry(1, "2026-06-10T09:00:00+00:00", 72.0)]
    ref = datetime(2026, 7, 3, tzinfo=KYIV_TZ)
    assert previous_month_weight_delta(entries, ref=ref) is None


def test_find_best_month_picks_largest_weight_loss():
    entries = [
        _entry(1, "2026-05-01T09:00:00+00:00", 73.0),
        _entry(2, "2026-05-15T09:00:00+00:00", 72.0),
        _entry(3, "2026-06-01T09:00:00+00:00", 72.0),
        _entry(4, "2026-06-15T09:00:00+00:00", 71.5),
    ]
    best = find_best_month(entries)

    assert best is not None
    assert best.year == 2026
    assert best.month == 5
    assert best.weight_loss_kg == 1.0


def test_find_best_month_none_when_only_single_entry_months():
    entries = [
        _entry(1, "2026-05-01T09:00:00+00:00", 73.0),
        _entry(2, "2026-06-01T09:00:00+00:00", 72.0),
    ]
    assert find_best_month(entries) is None


def test_entry_kyiv_dt_converts_utc():
    entry = _entry(1, "2026-07-01T21:00:00+00:00", 72.0)
    assert entry_kyiv_dt(entry).hour == 0 or entry_kyiv_dt(entry).day == 2
