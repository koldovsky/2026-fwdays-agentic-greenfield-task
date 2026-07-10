# Design — add-top-clock

## Goals / Non-goals

**Goals**

- Show visitor local time in the header with tabular numerals.
- Tick once per minute without console noise on a healthy session.
- Expose an accessible name via i18n strings.

**Non-goals**

- Syncing to the active city's timezone (forecast slice defers that).
- Showing seconds or a full date line in the header.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| Client-only `TopClock` with minute interval | Server-rendered time | Avoids hydration mismatch while still updating live |
| Pure formatter in `lib/top-clock/` | Inline `Intl` in component | Keeps `@trace FR-CLOCK-01` unit tests framework-free |
| 24-hour `uk-UA` format | 12-hour clock | Matches Ukrainian expectations and tabular layout |

## Error Handling

- If `Intl` fails in an exotic environment, fall back to `HH:MM` from local getters.
- No network dependency; clock never blocks other header content.
