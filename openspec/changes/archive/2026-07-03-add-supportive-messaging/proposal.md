## Why

`add-trend-labels` shipped qualitative labels on `/вага` deltas, but replies are still
mostly factual. Capability `messaging` adds warm Ukrainian supportive copy and
personalization (FR-MSG-01..04, FR-MSG-07..08, BC-TONE-01) so weigh-ins feel encouraging
without shame — especially on коливання and без змін.

## What Changes

- Add pure supportive-message logic: name-prefixed vs general copy, pools with ≥ 3 variants
  per weight-trend category, random selection (FR-MSG-01..02, FR-MSG-04, FR-MSG-07,
  NFR-TEST-01).
- Append one supportive line after successful `/вага` when a weight delta vs previous exists,
  driven by weight trend from `bot/trends.py` (FR-MSG-03).
- Add `/допомога` command listing bot commands and weigh-in input format (FR-MSG-08).
- Export supportive-line helper for `/прогрес` — wired in `history` capability (FR-MSG-03).
- No `/прогрес`, `/історія`, `/місяць` views, month support line (FR-MSG-05), or settings
  name editing in this change.

## Capabilities

### New Capabilities

- `supportive-messaging`: Message pools, name personalization, and weight-trend-based
  supportive line selection (FR-MSG-01..04, FR-MSG-07, BC-TONE-01, NFR-TEST-01).
- `help-command`: `/допомога` handler and Ukrainian help text (FR-MSG-08).

### Modified Capabilities

- `weigh-in-commands`: Successful `/вага` confirmation SHALL append one supportive line when
  weight delta vs previous is available (FR-MSG-03).

## Impact

- **New code**: `bot/messages.py`, `bot/handlers/help.py`, `tests/test_messages.py`,
  `tests/test_help_handlers.py`.
- **Modified code**: `bot/handlers/weigh_in.py` (append support line), `bot/main.py`
  (register `/допомога`).
- **Dependencies**: `bot/trends.py` (`TrendLabel`), `user_settings.display_name` from repository.
- **Downstream**: `history` reuses `pick_support_line` on `/прогрес` and FR-MSG-05 on `/місяць`;
  `reminders` reuses name prefixing (FR-REM-03).
