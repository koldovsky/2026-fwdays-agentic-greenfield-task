## Context

`add-trend-labels` shipped: `/вага` confirmations include factual values, numeric deltas, and
per-metric trend labels via `bot/trends.py`. `user_settings.display_name` exists (default
«Оленка») but is not yet used in replies. Supportive copy and `/допомога` were deferred.

PRD capability `messaging` covers `FR-MSG-01` through `FR-MSG-04`, `FR-MSG-07`, and
`FR-MSG-08`. `FR-MSG-05` (`/місяць` support line) and `FR-MSG-06` (factual `/історія`) ship
with `history`. `FR-MSG-03` also applies to `/прогрес` — helper built here, wired in `history`.

## Goals / Non-Goals

**Goals:**

- Pure `bot/messages.py` with pools, name prefixing, and `pick_support_line`.
- Append one supportive line after `/вага` when weight vs-previous trend is known.
- `/допомога` command with Ukrainian command list and input format.
- Unit tests for message selection and tone constraints (NFR-TEST-01).

**Non-Goals:**

- `/прогрес`, `/історія`, `/місяць`, `/весь_час` handlers — `history` capability.
- Month support line hook (FR-MSG-05) — `history` capability.
- `/налаштування` name editing (FR-SET-02) — `settings` capability; read existing `display_name`
  only.
- Reminder text personalization (FR-REM-03) — `reminders` capability.

## Decisions

### 1. Pure messages module `bot/messages.py`

```python
from bot.trends import TrendLabel

PROGRESS_LINES: tuple[str, ...] = (...)   # ≥ 3 variants
FLUCTUATION_LINES: tuple[str, ...] = (...)
STABLE_LINES: tuple[str, ...] = (...)

def prefix_with_name(line: str, display_name: str | None) -> str: ...

def pick_support_line(
    weight_trend: TrendLabel,
    *,
    display_name: str | None,
    rng: random.Random | None = None,
) -> str: ...
```

- `prefix_with_name`: if `display_name` is truthy after strip → `«{name}, {line}»`; else `line`.
- `pick_support_line`: map `TrendLabel` → pool; `rng.choice(pool)`; apply prefix.
- Pools are module-level constants — easy to review for BC-TONE-01 compliance.

**Rationale:** Same pattern as `compare.py` / `trends.py`; `history` imports `pick_support_line`
for `/прогрес` without duplicating pools.

### 2. Weight trend source on `/вага`

After successful insert, when `previous` exists:

1. `deltas = compute_metric_deltas(inserted, previous)`
2. `weight_trend = classify_trend(deltas.weight_kg)`
3. `support = pick_support_line(weight_trend, display_name=settings.display_name)`
4. Append `support` after comparison block (blank line separator).

First entry (`previous is None`): skip supportive line — no weight Δ vs previous.

**Rationale:** Matches FR-MSG-03 «based on weight Δ»; avoids inventing copy for baseline.

### 3. `/допомога` handler `bot/handlers/help.py`

Static Ukrainian help text constant listing:

- Implemented commands now: `/вага`, `/скасувати`, `/допомога`
- Planned commands noted briefly or full FR-CMD-01 roster as «скоро»/placeholders — prefer listing
  the full intended roster from PRD with markers for not-yet-shipped commands, OR only list
  shipped commands.

**Decision:** List **shipped** commands only (`/вага`, `/скасувати`, `/допомога`) plus weigh-in
format. Full roster expands in `commands` polish pass (FR-CMD-01). Simpler and honest for v1
messaging slice.

Register in `main.py` via `MessageHandler` regex `^/допомога(?:@\w+)?$`.

### 4. Ukrainian copy guidelines (BC-TONE-01)

| Pool | Tone |
|------|------|
| прогрес | Quiet encouragement; acknowledge effort |
| коливання | Normalise ups; no blame; no «регрес» |
| без змін | Plateau is OK; consistency matters |

Draft ≥ 3 variants per pool during apply; no exclamation-heavy hype.

### 5. Tests

- `tests/test_messages.py`: prefix with/without name, pool mapping, random selection (injected
  `rng`), no «регрес» in pools, first-entry skip logic via handler or messages API.
- `tests/test_help_handlers.py`: `/допомога` replies with commands and example format.
- Extend `tests/test_weigh_in_handlers.py`: second log includes supportive line; first log omits.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Message length on mobile | One short sentence; same pattern as product overview |
| `/прогрес` FR-MSG-03 gap until history | Export `pick_support_line`; document in tasks |
| `display_name` clear path untested until settings | FR-MSG-02 covered by unit tests with `None`/empty |

## Migration Plan

Additive — no schema migration. Deploy new handler and message module; next `/вага` after deploy
gets supportive lines.

## Open Questions

- Exact Ukrainian phrasing for pools — tune during apply; must pass BC-TONE-01 review in tests.
