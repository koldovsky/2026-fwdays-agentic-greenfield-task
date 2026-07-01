# review-generation

## Purpose

Daily/weekly/monthly review generation (US-4/US-5): the system produces a user's review either on
manual trigger (`/done` or a `review_trigger` intent) or via a midnight cron fallback that guarantees
every finished day is covered exactly once. All numeric content — totals, averages, days-hit-target,
coverage, and weight/waist deltas — is computed in code from tenant-scoped `food_log` and
`body_metrics` rows (SQL SUM/groupBy), never parsed from prior prose; the LLM makes exactly one
structured, prose-only call per review (no agent loop) that is spliced into a deterministic numeric
template. Reviews follow `docs/review-templates.md`, mirror the user's language in prose while keeping
DB enums/`period` literals English, are idempotent per `(user_id, period, period_start)`, degrade
honestly on sparse data, and are strictly tenant-scoped (invariants #1, #2, #5, #6, #8).

## Requirements

### Requirement: Manual daily review trigger

The system SHALL generate the acting user's daily review for **today** (user timezone) when the
user sends the `/done` command or a message the router classifies as `review_trigger`
("готово на сегодня"). The generated review SHALL be persisted and replied to the chat, and the
day SHALL be marked reviewed (`reviewed_flag = true`).

#### Scenario: /done generates today's daily review
- **WHEN** a user with a completed profile sends `/done`
- **THEN** the system generates the daily review for today in the user timezone, persists a
  `reviews` row with `period = "daily"`, `period_start = today`, `reviewed_flag = true`, and
  replies with the rendered review

#### Scenario: review_trigger intent generates today's daily review
- **WHEN** a user sends "готово на сегодня" and the router classifies it `review_trigger`
- **THEN** the system generates and replies with today's daily review and sets `reviewed_flag = true`,
  identically to `/done`

### Requirement: Midnight cron fallback guarantees coverage

The system SHALL run a single scheduled job that, at each user's **local** midnight, generates the
just-finished day's daily review **if and only if** no daily review already exists for that
(user, date). Auto-generated reviews SHALL be pushed proactively to the user's chat and stored with
`reviewed_flag = false`. The sweep SHALL evaluate every user against their own timezone.

#### Scenario: unreviewed day auto-generates at local midnight
- **WHEN** the scheduler tick fires and a user's local time has just crossed midnight and that user
  has no `reviews` row for the finished day
- **THEN** the system generates that day's daily review, stores it with `reviewed_flag = false`, and
  proactively sends it to the user's chat

#### Scenario: already-reviewed day is not regenerated
- **WHEN** the scheduler tick fires for a user who already triggered `/done` for the finished day
  (a daily `reviews` row exists for that date)
- **THEN** the system does NOT generate or send a second review for that day

#### Scenario: per-user timezone drives the trigger instant
- **WHEN** two users in different timezones are swept in the same hourly tick
- **THEN** each user's review fires only when the finished day has ended in that user's own
  timezone, not the server's

### Requirement: Weekly and monthly rollups

After a daily review is generated, the system SHALL also generate the **weekly** review when that
date is a **Sunday** (period = the Mon–Sun week ending that day) and the **monthly** review when
that date is the **last day of the month** (period = that calendar month). Rollup period numbers
SHALL be computed from the raw `food_log` / `body_metrics` rows for the period, never parsed from
prior review prose. A generated rollup SHALL be delivered to the user alongside the daily (each as
its own message, via the same reply or proactive-push path that carried the daily) — not merely
persisted.

#### Scenario: Sunday daily also generates the weekly
- **WHEN** a daily review is generated for a date that is a Sunday
- **THEN** the system also generates and persists a `reviews` row with `period = "weekly"`,
  `period_start` = that week's Monday, `period_end` = that Sunday

#### Scenario: month-end daily also generates the monthly
- **WHEN** a daily review is generated for the last calendar day of a month
- **THEN** the system also generates and persists a `reviews` row with `period = "monthly"`,
  `period_start` = the first of that month, `period_end` = that last day

#### Scenario: a non-boundary day generates only the daily
- **WHEN** a daily review is generated for a Wednesday that is not month-end
- **THEN** no weekly or monthly review is generated

#### Scenario: a generated rollup is delivered, not just stored
- **WHEN** a Sunday `/done` generates the daily and the weekly
- **THEN** the user receives both the daily and the weekly review (each as its own message), not only
  the daily

### Requirement: Numbers computed in code and prose from the model

The system SHALL compute all numeric content of every review in code from a SQL SUM or groupBy over
raw `food_log` and `body_metrics` rows. This covers totals, per-day averages, days-hit-target counts,
coverage, and weight and waist deltas. The LLM SHALL make exactly one structured call per review that
returns only prose slots and SHALL never emit the numbers. The system SHALL assemble the final message
by splicing the model prose into a deterministically rendered numeric template. This honors invariants
one, two, and five.

#### Scenario: totals equal the SUM of the period's rows
- **WHEN** a review is rendered for a period
- **THEN** every calorie/macro total in the output equals the SUM (or code-computed average) of the
  tenant-scoped `food_log` rows for that period, independent of any model output

#### Scenario: exactly one LLM call, prose only
- **WHEN** a review is generated
- **THEN** the system makes exactly one `parseStructured` call (no agent loop) whose result supplies
  only the prose lines; the numeric block is unchanged by the model

### Requirement: Template-faithful, language-mirrored rendering

Reviews SHALL follow the daily/weekly/monthly layouts in `docs/review-templates.md`. Prose SHALL be
in the user's language: for a manual trigger, detected from the trigger text; for a cron-generated
review (no user text, no chat history), Russian by default. Structural labels, DB enum values, and
`period` literals SHALL stay English. (Invariant #6.)

#### Scenario: manual review mirrors the trigger language
- **WHEN** a user triggers a review with Ukrainian text
- **THEN** the review prose is rendered in Ukrainian while `period`/DB values stay English

#### Scenario: cron review defaults to Russian
- **WHEN** the scheduler generates a review with no user text available
- **THEN** the prose is rendered in Russian

### Requirement: Idempotent generation (no doubles)

Review persistence SHALL be idempotent per `(user_id, period, period_start)`: re-triggering the same
period upserts the same row rather than creating a duplicate. (PRD M4: no doubles.)

#### Scenario: re-triggering the same day does not duplicate
- **WHEN** a user sends `/done` twice for the same day
- **THEN** exactly one daily `reviews` row exists for that (user, date); the second trigger updates
  it in place

#### Scenario: cron does not double a manually-reviewed day
- **WHEN** a user manually reviewed a day and the midnight sweep later evaluates that same day
- **THEN** no second `reviews` row is created for that (user, day)

### Requirement: Edge-case handling for sparse data

Reviews SHALL degrade honestly when data is missing, never fabricating baselines or zeros.

#### Scenario: empty period nudges instead of zeros
- **WHEN** a review is generated for a period with no logged food
- **THEN** the output omits the macro table and instead shows a short nudge to log, not a table of
  zeros

#### Scenario: partial period states coverage
- **WHEN** a weekly/monthly review covers a period where some days have no entries
- **THEN** the output states coverage (e.g. "5/7 дней залогировано") and averages only the logged days

#### Scenario: missing delta baseline renders a dash
- **WHEN** there is no prior weight/waist entry to compare against
- **THEN** the delta is rendered as "—" and no baseline is invented

#### Scenario: missing body metric omits its line
- **WHEN** no weight or waist was logged in the period
- **THEN** that line is omitted or marked "нет данных" and no prior value is carried forward

### Requirement: Tenant isolation

Every read and write in review generation SHALL be scoped to the acting user via `tenantWhere`
(invariant #8). A user's review SHALL never include another user's `food_log` or `body_metrics`
rows, and a review row SHALL never be written for or read from another user.

#### Scenario: reviews read only the acting user's rows
- **WHEN** a review is generated for user A while user B has rows in the same period
- **THEN** only user A's rows contribute to the numbers, and the `reviews` row is written under
  user A's `user_id`
