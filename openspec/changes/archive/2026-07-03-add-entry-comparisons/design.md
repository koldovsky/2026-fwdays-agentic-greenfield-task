## Context

`add-weigh-in-logging` shipped: `/вага` persists four metrics and replies with a factual
multi-line confirmation; `/скасувати` undoes the latest row. Repository exposes
`insert_weigh_in`, `get_latest_weigh_in`, and `delete_latest_weigh_in`. `format_uk_decimal`
in `bot/parse.py` formats absolute values with one decimal and a comma separator.

PRD capability `compare` covers `FR-CMP-01` through `FR-CMP-04`. Product overview expects
instant comparison after each log; trend labels and supportive copy are out of scope here.

## Goals / Non-Goals

**Goals:**

- After each successful `/вага`, show comparison vs previous entry (when any) and weight vs first
  entry (when ≥ 2 entries).
- First entry acknowledged as baseline («стартова точка») with no previous deltas.
- Delta formatting reusable by later capabilities (`trends`, `history`).
- Pure comparison logic unit-tested (NFR-TEST-01).

**Non-Goals:**

- Trend labels («прогрес» / «коливання» / «без змін`) — `trends` capability.
- Supportive message lines — `messaging` capability.
- `/прогрес`, `/історія`, or other read commands — `history` capability.
- Stable-threshold logic (0.2) — `trends` capability.

## Decisions

### 1. Pure compare module `bot/compare.py`

```python
@dataclass(frozen=True)
class MetricDeltas:
    weight_kg: float
    fat_pct: float
    muscle_pct: float
    bmi: float

def compute_metric_deltas(current: WeighIn, previous: WeighIn) -> MetricDeltas: ...

def format_delta(value: float) -> str:
    # one decimal, comma decimal, Unicode minus (U+2212), explicit + for positive

def build_comparison_message(
    current: WeighIn,
    *,
    previous: WeighIn | None,
    first: WeighIn | None,
    entry_count: int,
) -> str: ...
```

- `compute_metric_deltas` subtracts `previous` from `current` field-wise.
- `format_delta` implements FR-CMP-04 (`−0,6`, `+0,3`, `0,0`).
- `build_comparison_message` returns only the comparison block (lines after the factual
  «Записано» section); handler concatenates with existing `_success_message`.

**Rationale:** Keeps handlers thin; same helpers will power `/прогрес` later.

### 2. Repository additions

```python
def get_first_weigh_in(conn, user_id: int) -> WeighIn | None: ...

def list_weigh_ins_desc(conn, user_id: int, *, limit: int) -> list[WeighIn]: ...
```

- `get_first_weigh_in`: `ORDER BY recorded_at ASC, id ASC LIMIT 1`.
- `list_weigh_ins_desc`: `ORDER BY recorded_at DESC, id DESC LIMIT ?`.

After insert, handler fetches `list_weigh_ins_desc(..., limit=2)`:
- index 0 = current (just inserted)
- index 1 = previous (if any)

`get_first_weigh_in` supplies the baseline for «від старту» when `entry_count >= 2`.

**Alternative:** Single SQL window query — rejected as overkill for v1 single-user scale.

### 3. Success message assembly in `weigh_in.py`

Flow after successful `insert_weigh_in`:

1. Build factual block via existing `_success_message(...)`.
2. Load `recent = list_weigh_ins_desc(conn, user.id, limit=2)`.
3. `previous = recent[1] if len(recent) > 1 else None`.
4. `first = get_first_weigh_in(conn, user.id)` when `len(recent) >= 2`.
5. Append `build_comparison_message(...)` separated by a blank line.

All DB reads happen in the same connection opened for insert (before `conn.close()`).

### 4. Ukrainian copy for comparison block

| Case | Draft lines |
|------|-------------|
| First entry | «Стартова точка — далі порівняємо з нею.» |
| vs previous header | «Порівняно з попереднім:» then four metric lines with deltas |
| vs start (weight only) | «Від старту: {delta} кг» |

Reuse `format_uk_decimal` from `parse.py` for absolute values; `format_delta` for deltas.

### 5. Tests

- `tests/test_compare.py`: delta math, `format_delta` edge cases (zero, positive, negative),
  `build_comparison_message` for first / second / third entry scenarios.
- Extend `tests/test_db.py`: `get_first_weigh_in`, `list_weigh_ins_desc`.
- Extend `tests/test_weigh_in_handlers.py`: success reply includes baseline or delta lines.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Race if two logs in quick succession | Single-user bot; sequential Telegram messages are sufficient in v1 |
| `format_delta` vs `format_uk_decimal` drift | Document: absolute values use `format_uk_decimal`; deltas use `format_delta` |
| Comparison block length on mobile | Keep compact multi-line format consistent with current success message |

## Migration Plan

Additive — no schema migration. Deploy updated handler and repository functions; existing rows
work immediately.

## Open Questions

- None blocking. Exact Ukrainian phrasing for comparison headers can be tuned during apply if
  copy review suggests shorter lines.
