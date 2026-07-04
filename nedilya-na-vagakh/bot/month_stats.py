from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from bot.models import WeighIn

KYIV_TZ = ZoneInfo("Europe/Kyiv")

UKRAINIAN_MONTHS: dict[int, str] = {
    1: "січень",
    2: "лютий",
    3: "березень",
    4: "квітень",
    5: "травень",
    6: "червень",
    7: "липень",
    8: "серпень",
    9: "вересень",
    10: "жовтень",
    11: "листопад",
    12: "грудень",
}


@dataclass(frozen=True)
class MonthSummary:
    year: int
    month: int
    entry_count: int
    first_in_month: WeighIn | None
    latest_in_month: WeighIn | None
    baseline: WeighIn | None


@dataclass(frozen=True)
class BestMonth:
    year: int
    month: int
    weight_loss_kg: float


def entry_kyiv_dt(entry: WeighIn) -> datetime:
    dt = datetime.fromisoformat(entry.recorded_at)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(KYIV_TZ)


def format_recorded_at_kyiv(recorded_at: str) -> str:
    dt = datetime.fromisoformat(recorded_at)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(KYIV_TZ).strftime("%d.%m.%y")


def month_bounds_kyiv(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=KYIV_TZ)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=KYIV_TZ)
    else:
        end = datetime(year, month + 1, 1, tzinfo=KYIV_TZ)
    return start, end


def entries_in_month(
    entries: Sequence[WeighIn], *, year: int, month: int
) -> list[WeighIn]:
    start, end = month_bounds_kyiv(year, month)
    in_month = [entry for entry in entries if start <= entry_kyiv_dt(entry) < end]
    return sorted(in_month, key=lambda entry: (entry.recorded_at, entry.id))


def latest_before_month(
    entries: Sequence[WeighIn], *, year: int, month: int
) -> WeighIn | None:
    start, _ = month_bounds_kyiv(year, month)
    before = [entry for entry in entries if entry_kyiv_dt(entry) < start]
    if not before:
        return None
    return max(before, key=lambda entry: (entry.recorded_at, entry.id))


def _resolve_baseline(
    first_in_month: WeighIn | None, pre_month_latest: WeighIn | None
) -> WeighIn | None:
    if first_in_month is None:
        return None
    if entry_kyiv_dt(first_in_month).day == 1:
        return first_in_month
    if pre_month_latest is not None:
        return pre_month_latest
    return first_in_month


def summarize_month(
    entries: Sequence[WeighIn],
    *,
    year: int,
    month: int,
    pre_month_latest: WeighIn | None,
) -> MonthSummary:
    month_entries = entries_in_month(entries, year=year, month=month)
    first_in_month = month_entries[0] if month_entries else None
    latest_in_month = month_entries[-1] if month_entries else None
    baseline = _resolve_baseline(first_in_month, pre_month_latest)
    return MonthSummary(
        year=year,
        month=month,
        entry_count=len(month_entries),
        first_in_month=first_in_month,
        latest_in_month=latest_in_month,
        baseline=baseline,
    )


def previous_month_weight_delta(
    entries: Sequence[WeighIn], *, ref: datetime
) -> float | None:
    ref_kyiv = ref.astimezone(KYIV_TZ) if ref.tzinfo else ref.replace(tzinfo=KYIV_TZ)
    if ref_kyiv.month == 1:
        prev_year, prev_month = ref_kyiv.year - 1, 12
    else:
        prev_year, prev_month = ref_kyiv.year, ref_kyiv.month - 1

    prev_entries = entries_in_month(entries, year=prev_year, month=prev_month)
    if len(prev_entries) < 2:
        return None

    first = prev_entries[0]
    latest = prev_entries[-1]
    return latest.weight_kg - first.weight_kg


def find_best_month(entries: Sequence[WeighIn]) -> BestMonth | None:
    by_month: dict[tuple[int, int], list[WeighIn]] = defaultdict(list)
    for entry in entries:
        dt = entry_kyiv_dt(entry)
        by_month[(dt.year, dt.month)].append(entry)

    best: BestMonth | None = None
    for year, month in sorted(by_month):
        month_entries = sorted(
            by_month[(year, month)], key=lambda entry: (entry.recorded_at, entry.id)
        )
        if len(month_entries) < 2:
            continue
        first = month_entries[0]
        latest = month_entries[-1]
        weight_loss = first.weight_kg - latest.weight_kg
        if best is None or weight_loss > best.weight_loss_kg:
            best = BestMonth(year=year, month=month, weight_loss_kg=weight_loss)
    return best


def format_month_label(year: int, month: int) -> str:
    return f"{UKRAINIAN_MONTHS[month]} {year}"
