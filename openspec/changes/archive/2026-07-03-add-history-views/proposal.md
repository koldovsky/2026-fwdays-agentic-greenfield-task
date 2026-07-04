## Why

`add-supportive-messaging` shipped warm copy on `/вага`, but the bot still cannot answer
«how am I doing?» beyond the latest log. Capability `history` adds the four read views
(`/історія`, `/прогрес`, `/місяць`, `/весь_час`) so Оленка can review recent logs, current
progress, the Kyiv calendar month, and all-time trends without scrolling old Telegram messages.

## What Changes

- Add `/історія` — compact table of the last 8 entries (date, weight, fat %, muscle %, BMI);
  factual only, no supportive paragraphs (FR-HIST-01, FR-MSG-06).
- Add `/прогрес` — latest entry with deltas vs previous and vs start, trend labels, and one
  supportive line from `pick_support_line` (FR-HIST-02, FR-MSG-03).
- Add `/місяць` — current calendar month in Europe/Kyiv: entry count, first→latest per metric,
  previous-month weight delta line, single-entry fallback, carry-over baseline (FR-HIST-03..06,
  NFR-TZ-01, FR-MSG-05).
- Add `/весь_час` — first→latest summary, total entry count, first-entry date, and best month
  by weight loss when enough data (FR-HIST-07..09).
- Add pure month-stats logic with unit tests (NFR-TEST-01); extend repository queries as needed.
- Register four new command handlers in `bot/main.py`.
- No `/налаштування`, `/start` onboarding, reminders, or full FR-CMD-01 command-menu polish in
  this change.

## Capabilities

### New Capabilities

- `history-command`: `/історія` handler and compact last-8 table formatting (FR-HIST-01,
  FR-MSG-06).
- `progress-command`: `/прогрес` handler reusing compare/trends/messages (FR-HIST-02,
  FR-MSG-03).
- `month-view`: `/місяць` handler, Europe/Kyiv month boundaries, baseline carry-over, and
  month support line (FR-HIST-03..06, FR-MSG-05, NFR-TZ-01).
- `month-stats`: Pure month aggregation and best-month logic with unit tests (FR-HIST-03..06,
  FR-HIST-08..09, NFR-TEST-01).
- `all-time-view`: `/весь_час` handler and all-time summary formatting (FR-HIST-07..09).

### Modified Capabilities

- `help-command`: Expand `/допомога` text to list the newly shipped history commands.

## Impact

- **New code**: `bot/month_stats.py`, `bot/handlers/history.py` (or split handlers),
  `tests/test_month_stats.py`, `tests/test_history_handlers.py` (and related handler tests).
- **Modified code**: `bot/repository.py` (month/range queries), `bot/main.py` (register
  commands), `bot/handlers/help.py` (updated command list).
- **Dependencies**: `bot/compare.py`, `bot/trends.py`, `bot/messages.py`, existing
  `list_weigh_ins_desc` / `get_first_weigh_in`.
- **Downstream**: `settings` and `onboarding` remain independent; `commands` polish pass
  (FR-CMD-01) registers the full Telegram command menu after all handlers exist.
