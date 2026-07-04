## Context

`add-entry-comparisons` shipped: `/вага` success replies include factual values plus numeric
deltas vs previous entry and weight vs first entry. `bot/compare.py` exposes `MetricDeltas`,
`compute_metric_deltas`, `format_delta`, and `build_comparison_message`. Trend labels and
supportive copy were explicitly deferred.

PRD capability `trends` covers `FR-TREND-01` through `FR-TREND-03`. Product overview defines
label vocabulary («прогрес» / «коливання» / «без змін») and inverted muscle % direction;
BC-TONE-01 forbids «регрес».

## Goals / Non-Goals

**Goals:**

- Classify each metric delta into a Ukrainian trend label with a shared 0.2 threshold.
- Show labels on the four «Порівняно з попереднім» lines in `/вага` comparison output.
- Pure trend logic unit-tested (NFR-TEST-01); reusable by `messaging` and `history`.

**Non-Goals:**

- Supportive message sentences — `messaging` capability.
- `/прогрес`, `/історія`, `/місяць`, `/весь_час` — `history` capability.
- Trend labels on «від старту» weight line or month/all-time summaries.
- Configurable threshold via settings or env.

## Decisions

### 1. Pure trends module `bot/trends.py`

```python
STABLE_THRESHOLD = 0.2

class TrendLabel(StrEnum):
    PROGRESS = "прогрес"
    FLUCTUATION = "коливання"
    STABLE = "без змін"

def classify_trend(delta: float, *, invert: bool = False) -> TrendLabel: ...

def classify_metric_deltas(deltas: MetricDeltas) -> dict[str, TrendLabel]: ...
```

- `classify_trend`: if `abs(delta) < STABLE_THRESHOLD` → `без змін`; else map sign to
  progress/fluctuation, flipping when `invert=True` (muscle %).
- `classify_metric_deltas` returns labels keyed by metric (`weight`, `fat`, `muscle`, `bmi`).

**Rationale:** Single source of truth for threshold and direction rules; history and messaging
import the same helpers later.

### 2. Inline label suffix in comparison lines

Extend `build_comparison_message` to append ` — {label}` after each vs-previous metric line:

```
Порівняно з попереднім:
вага −0,6 кг — прогрес,
жир −0,3 % — прогрес,
м'язи +0,2 % — прогрес,
BMI −0,2 — прогрес
Від старту: −0,6 кг
```

- «від старту» line unchanged (numeric delta only).
- Baseline first-entry message unchanged.

**Alternative:** Separate «Тренди:» block — rejected; inline keeps the compact multi-line
format and matches how `/прогрес` will likely read later.

### 3. Integration point stays in `compare.py`

`build_comparison_message` calls `classify_metric_deltas` when `previous` is not `None`. Handler
(`weigh_in.py`) unchanged unless tests need fixture updates.

**Rationale:** Comparison assembly already owns delta formatting; adding labels is the same
concern.

### 4. Tests

- `tests/test_trends.py`: threshold boundary (0.19 vs 0.2), sign cases, muscle inversion for all
  three label outcomes.
- Extend `tests/test_compare.py`: second-entry message includes expected labels; baseline and
  «від старту» lines still omit labels.
- Extend `tests/test_weigh_in_handlers.py` if handler assertions check full reply text.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Message length on mobile | Keep one short word per line; same structure as today |
| Threshold semantics at exactly ±0.2 | PRD uses strict `<`; document in tests (0.2 → directional label) |
| Label vocabulary drift vs messaging | Export `TrendLabel` enum; messaging imports same strings |

## Migration Plan

Additive — no schema migration. Deploy updated `compare.py` and new `trends.py`; existing
entries work immediately on next log.

## Open Questions

- None blocking. Em dash vs parentheses around labels can be tuned during apply if copy review
  prefers a different separator.
