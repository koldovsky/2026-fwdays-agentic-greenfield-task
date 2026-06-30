# body-metrics

## Purpose

Body metrics logging (US-7): when the router classifies an inbound message as `metric`, the system
parses body measurements in code (no LLM call), upserts a single tenant-scoped `body_metrics` row
per user per resolved date, and confirms it with code-computed trend deltas against each metric's
own most recent prior entry. Confirmation prose mirrors the user's language while column names and
structural content stay English. The database is the source of truth — no value is hand-summed or
guessed by the model — every row is tenant-scoped via the service layer, and raw body values are
kept out of application logs (invariants #1, #2, #5, #6, #8, #9).

## Requirements

### Requirement: Log a body metric from a text message

When the router classifies an inbound message as `metric`, the system SHALL parse the body
measurements, upsert one `body_metrics` row scoped to the user for the router-resolved date (user
timezone, including a `вчера`/`yesterday` back-date), and confirm it. The message-arrival date SHALL
NOT be used when the router resolved an override date.

#### Scenario: A weight + waist message is recorded for the resolved date

- **WHEN** a user sends "вес 89.2, талия 90" with no time reference
- **THEN** a `body_metrics` row for the user's current local date has `weight_kg` 89.2 and
  `waist_cm` 90
- **AND** the confirmation reply names the recorded metrics and their values

#### Scenario: Back-dated metric honors the router's resolved date

- **WHEN** a user sends "вчера весил 90.1"
- **THEN** the `body_metrics` row's `date` is yesterday's local date (the router's resolved date),
  not today

### Requirement: Metric values are parsed in code, never by the model

The system SHALL extract metric values with a deterministic keyword parser that maps RU/UA/EN synonyms
to the `body_metrics` columns (`weight_kg`, `waist_cm`, `chest_cm`, `hips_cm`, `bicep_cm`,
`thigh_cm`). The metric path SHALL issue no LLM call (invariant #5). A token the parser cannot
attribute to a column SHALL be skipped, not guessed, and SHALL NOT block the rest of the message.

#### Scenario: Mixed-language keywords map to the right columns

- **WHEN** a user sends "weight 89.2 талия 90"
- **THEN** `weight_kg` is 89.2 and `waist_cm` is 90, with no LLM call made

#### Scenario: Unrecognized tokens are skipped, recognized ones still log

- **WHEN** a user sends "вес 89.2 настроение бодрое"
- **THEN** `weight_kg` is 89.2 and the unparseable token is ignored (the row is still written)

### Requirement: One row per user per date

The system SHALL keep at most one `body_metrics` row per (user, date). A second metric message for the
same resolved date SHALL merge its parsed fields onto the existing row, without duplicating the row
and without nulling fields it did not mention.

#### Scenario: Same-day second message merges fields

- **WHEN** a user logs "вес 89.2" and later the same day logs "талия 90"
- **THEN** the single `body_metrics` row for that date has both `weight_kg` 89.2 and `waist_cm` 90

### Requirement: Trend diffs compare like-with-like against the most recent prior entry

For each metric the user just logged, the system SHALL compute the delta as the new value minus the
value of that **same** metric in the most recent `body_metrics` row dated before the logged row's date
that carries that metric — per field, never against the first/start entry and never across different
metrics. The deltas SHALL be computed in code.

#### Scenario: Weight delta is vs the last weight, not the start

- **WHEN** prior weights were 92.0 (start) then 90.0 (most recent) and the user logs "вес 89.2"
- **THEN** the confirmation shows a delta of −0.8 kg (89.2 − 90.0), not −2.8 vs the start

#### Scenario: Each metric diffs against its own most recent prior value

- **WHEN** waist was last logged 5 days ago at 91 and weight was last logged yesterday at 90.0, and
  the user logs "вес 89.2, талия 90"
- **THEN** the weight delta is −0.8 (vs 90.0) and the waist delta is −1 (vs 91), each like-with-like

#### Scenario: A first-ever metric shows no delta

- **WHEN** a user logs a metric they have never logged before
- **THEN** the confirmation states the value with no delta (there is no prior like entry)

### Requirement: Every metric entry is tenant-scoped

The system SHALL set `user_id` on every `body_metrics` row and resolve it from the message's Telegram
`chat_id` through the service layer. Reads (prior-entry lookup, staleness) and writes SHALL go through
the tenancy helpers so the filter is never omitted (invariant #8), and one user's prior values SHALL
never be read for another user's diff.

#### Scenario: Entry carries the acting user's id

- **WHEN** a user with `chat_id` C (mapped to user id U) logs a metric
- **THEN** the upserted `body_metrics` row has `user_id = U`

#### Scenario: Trend lookup is scoped to the acting user

- **WHEN** the prior-entry delta is computed
- **THEN** only the acting user's `body_metrics` rows are considered, never another user's

### Requirement: Confirmation prose mirrors language; structure stays English

Confirmation prose SHALL mirror the user's message language (RU/UA/EN/mixed) and present the numbers
and signed deltas built in code (invariant #2). The `body_metrics` column names and any structural
content SHALL stay English (invariant #6). Raw body values SHALL NOT be written to application logs
(invariant #9).

#### Scenario: Russian message gets Russian confirmation with code-built numbers

- **WHEN** a user logs metrics in Russian
- **THEN** the reply prose is Russian (labels like «вес», «талия») while the stored columns remain
  English (`weight_kg`, `waist_cm`) and the values/deltas are code-computed

### Requirement: Per-metric staleness is exposed

The system SHALL expose, per metric column, the number of days since that metric was last logged for
the user (or that it has never been logged). This read SHALL be available for the reviews capability;
this change does not itself emit staleness reminders.

#### Scenario: Staleness reports days since last log per metric

- **WHEN** weight was last logged 2 days ago and thigh has never been logged
- **THEN** the staleness read reports 2 days for weight and "never" for thigh
