## Context

`add-supportive-messaging` shipped `bot/messages.py`, `/допомога`, and supportive lines on
`/вага`. `add-trend-labels` and `add-entry-comparisons` provide `bot/trends.py` and
`bot/compare.py`. Repository already exposes `list_weigh_ins_desc`, `get_latest_weigh_in`,
`get_first_weigh_in`, and `get_or_create_settings`.

PRD capability `history` covers `FR-HIST-01..09`, `FR-MSG-05` (month support line),
`FR-MSG-06` (factual `/історія`), `NFR-TZ-01` (Europe/Kyiv months). `/прогрес` reuses
`FR-MSG-03` via `pick_support_line` exported in the messaging change.

## Goals / Non-Goals

**Goals:**

- Four command handlers: `/історія`, `/прогрес`, `/місяць`, `/весь_час`.
- Pure `bot/month_stats.py` for Kyiv month boundaries, carry-over baseline, previous-month
  delta, and best-month selection — unit-tested (NFR-TEST-01).
- Reuse `build_comparison_message`, `format_delta`, `classify_metric_deltas`, and
  `pick_support_line` where possible.
- Extend repository with range/all queries needed by month and all-time views.
- Update `/допомога` to list the new commands.

**Non-Goals:**

- `/налаштування`, `/start` onboarding, Sunday reminders (later capabilities).
- Telegram BotFather command-menu registration (FR-CMD-01 — `commands` polish pass).
- Charts, CSV export, or multi-user access.

## Decisions

### 1. Handler module layout `bot/handlers/views.py`

Single module with four async handlers:

```python
async def istoriya_command(update, context) -> None: ...
async def progres_command(update, context) -> None: ...
async def misyats_command(update, context) -> None: ...
async def ves_chas_command(update, context) -> None: ...
```

Register in `main.py` via `MessageHandler` regex (same pattern as `/допомога`).

**Rationale:** Four small read-only handlers share DB access and formatting helpers; one file
keeps registration simple. Split later if it grows.

**Alternative:** One file per command — rejected as over-split for v1.

### 2. Pure month stats `bot/month_stats.py`

```python
KYIV_TZ = ZoneInfo("Europe/Kyiv")

@dataclass(frozen=True)
class MonthSummary:
    year: int
    month: int
    entry_count: int
    first_in_month: WeighIn | None
    latest_in_month: WeighIn | None
    baseline: WeighIn | None  # carry-over aware
    ...

def month_bounds_kyiv(year: int, month: int) -> tuple[datetime, datetime]: ...

def summarize_month(
    entries: Sequence[WeighIn],
    *,
    year: int,
    month: int,
    pre_month_latest: WeighIn | None,
) -> MonthSummary: ...

def previous_month_weight_delta(
    entries: Sequence[WeighIn],
    *,
    ref: datetime,
) -> float | None: ...

def find_best_month(entries: Sequence[WeighIn]) -> BestMonth | None: ...
```

- Handlers load all entries (or month-filtered rows) once; pure functions do aggregation.
- `baseline`: if first in-month exists and is not on day 1, use `pre_month_latest` when
  present; else first in-month (FR-HIST-06).
- `find_best_month`: group by Kyiv `(year, month)`, require ≥ 2 entries, pick largest
  `(first.weight - latest.weight)` (FR-HIST-08..09).

**Rationale:** Matches `compare.py` / `trends.py` testability pattern; NFR-TEST-01 explicitly
names month stats.

### 3. Repository extensions

Add to `bot/repository.py`:

```python
def list_weigh_ins_asc(conn, user_id: int) -> list[WeighIn]: ...
def count_weigh_ins(conn, user_id: int) -> int: ...
```

`list_weigh_ins_asc` returns all entries oldest-first for month grouping and all-time views.
Existing `list_weigh_ins_desc(..., limit=8)` serves `/історія`.

**Rationale:** Minimal new surface; month logic stays in Python with injectable entry lists in
tests.

### 4. `/історія` table formatting

Monospace or aligned plain-text table in Ukrainian:

```
Дата       Вага  Жир  М'язи  BMI
03.07.26   72,4  28,5  32,1  24,8
```

- Dates formatted `DD.MM.YY` in Kyiv local time.
- Values use Ukrainian decimal comma (reuse formatting from compare or small helper).
- No trend labels, no supportive text (FR-MSG-06).

**Rationale:** Telegram monospace is readable for 8 rows; product overview calls for compact
table.

### 5. `/прогрес` reuses comparison block

Mirror `/вага` success path:

1. Load latest, previous, first, entry count.
2. Format latest values line.
3. `build_comparison_message(latest, previous=..., first=..., entry_count=...)`.
4. If `previous` exists: `weight_trend = classify_trend(deltas.weight_kg)` →
   `pick_support_line(...)`.

**Rationale:** DRY with weigh-in confirmation; satisfies FR-HIST-02 and FR-MSG-03.

### 6. `/місяць` message structure

1. `now_kyiv = datetime.now(KYIV_TZ)` → current year/month.
2. Filter entries to current month; compute `MonthSummary`.
3. If `entry_count == 0`: empty-month reply.
4. If `entry_count == 1`: show values + «ще мало даних для порівняння в місяці» (FR-HIST-05).
5. Else: entry count + labeled first→latest lines (baseline-aware deltas).
6. Append previous-month weight line when `previous_month_weight_delta` returns a value
   (FR-HIST-04).
7. Append `pick_support_line` from month weight trend when comparison is meaningful
   (FR-MSG-05).

### 7. `/весь_час` message structure

1. Load all entries asc; if empty → no-data reply.
2. Show count, first date, first→latest deltas (all metrics).
3. `find_best_month(entries)` → optional «найкращий місяць: …» line (FR-HIST-07..09).

### 8. Empty-state copy

Consistent Ukrainian empty replies per command (no shared pool — short factual sentences).

### 9. Tests

| File | Covers |
|------|--------|
| `tests/test_month_stats.py` | Kyiv boundaries, carry-over, prev month, best month, edge cases |
| `tests/test_views_handlers.py` | Handler replies for each command (mocked DB) |
| Extend `tests/test_help_handlers.py` | New commands in `/допомога` |

Inject fixed `datetime` / entry fixtures; no live Telegram.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Kyiv DST edge cases | Use `zoneinfo.ZoneInfo`; test boundary dates in unit tests |
| Long `/весь_час` reply on many years | Single user, ~52 entries/year — acceptable for v1 |
| Table alignment on narrow screens | Keep 8 rows; monospace; short date format |
| Carry-over baseline confusion | Document in month message which baseline was used only if needed; PRD does not require explicit label |

## Migration Plan

Additive — no schema migration. Deploy handlers; existing data immediately available in views.

## Open Questions

- Exact Ukrainian month names in best-month line (e.g. «березень 2026») — pick natural
  genitive or nominative during apply.
- Whether `/місяць` supportive line uses month delta trend only on weight (mirror FR-MSG-03) —
  **decision: yes**, weight-only trend for support line consistency.
