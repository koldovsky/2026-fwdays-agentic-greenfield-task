## Purpose

Defines how the parser agent resolves the expense datetime from free-form Ukrainian text, using the message receipt timestamp injected into each LLM call.

## Requirements

### Requirement: Datetime inference rules for parser agent
The parser agent SHALL resolve the expense datetime according to four cases, evaluated in order:

1. **Explicit time given** (e.g., "о 18:30", "в 14:00") — use the user-specified time. If no date is given, use today's date.
2. **Relative time given** (e.g., "годину назад", "2 години тому", "хвилину назад") — compute the datetime by subtracting the offset from the **message receipt timestamp** injected in the user message.
3. **Date only, no time** (e.g., "вчора", "2026-06-25", "у п'ятницю") — use **midnight (00:00:00)** of that date.
4. **No date and no time at all** — use the **message receipt timestamp** injected in the user message.

The message receipt timestamp SHALL be injected into every LLM call as the first line of the user message in the format:
```
Message received at: <ISO 8601 datetime>
```

The returned datetime SHALL be a valid ISO 8601 string with no timezone suffix (naive datetime).

#### Scenario: Explicit time is preserved
- **WHEN** the user inputs "в ресторані о 18:30 витратив 350"
- **THEN** the parsed datetime SHALL use 18:30 of today's date (e.g., "2026-06-28T18:30:00")

#### Scenario: Relative time resolved from receipt timestamp
- **WHEN** the user inputs "годину назад купив каву за 50" and the receipt timestamp is "2026-06-28T15:00:00"
- **THEN** the parsed datetime SHALL be "2026-06-28T14:00:00"

#### Scenario: Date-only input uses midnight
- **WHEN** the user inputs "50 на продукти вчора" and today is 2026-06-28
- **THEN** the parsed datetime SHALL be "2026-06-27T00:00:00" (midnight of yesterday)

#### Scenario: No date/time uses receipt timestamp
- **WHEN** the user inputs "купив каву за 50" with no date or time and the receipt timestamp is "2026-06-28T14:35:00"
- **THEN** the parsed datetime SHALL be "2026-06-28T14:35:00"

#### Scenario: Per-expense inference in multi-expense input
- **WHEN** the user inputs "купив каву о 14:00 і хліб годину тому" and the receipt timestamp is "2026-06-28T15:00:00"
- **THEN** the coffee expense datetime SHALL be "2026-06-28T14:00:00" and the bread expense datetime SHALL be "2026-06-28T14:00:00"
