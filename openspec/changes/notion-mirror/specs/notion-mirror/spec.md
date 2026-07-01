## ADDED Requirements

### Requirement: Every mirrored write enqueues an outbox row

The system SHALL append a `notion_sync` outbox row (`status = "pending"`) after every successful
Postgres write to the four mirrored tables — `food_log` (create and correction-update),
`food_database`, `body_metrics`, `reviews` — carrying `source_table`, `source_id`, and the owning
`user_id` (invariant #8). The enqueue SHALL be best-effort: a failure inside enqueue is logged and
SHALL never propagate to (or delay) the user-facing reply — the data is already safe in Postgres
(invariant #1). `progress_notes` SHALL NOT be mirrored.

#### Scenario: food log write enqueues a pending row
- **WHEN** a food entry is persisted to `food_log` for user A
- **THEN** a `notion_sync` row is created with `source_table = "food_log"`, `source_id` = the new
  row's id, `user_id` = A's id, `status = "pending"`

#### Scenario: correction enqueues for the same source row
- **WHEN** a user corrects an existing food entry and the `food_log` row is updated
- **THEN** a new `notion_sync` row is enqueued for the same `(source_table, source_id)` so the
  worker patches the existing Notion page rather than creating a duplicate

#### Scenario: enqueue failure never breaks the reply
- **WHEN** the outbox insert throws (e.g. transient DB error) right after a successful
  `body_metrics` write
- **THEN** the error is logged, no exception reaches the handler, and the user receives the normal
  confirmation reply

#### Scenario: progress notes are not mirrored
- **WHEN** a progress photo produces a `progress_notes` row
- **THEN** no `notion_sync` row is enqueued for it

### Requirement: Background worker mirrors outbox rows to Notion

The system SHALL run an in-process background worker that periodically fetches up to a bounded
batch of `notion_sync` rows with `status IN ("pending","failed")` and `next_attempt_at` null or due,
ordered by `created_at`, and processes them sequentially, throttled to at most ~3 Notion requests
per second. For each row it SHALL resolve the user's Notion target, map the source row to Notion
page properties, create the page — or update it when a `notion_page_id` is already known for that
`(source_table, source_id)` — and mark the row `done`, storing the resulting `notion_page_id`.
Notion is write-only downstream: the system SHALL never read facts back from Notion (invariant #1).

#### Scenario: pending row is mirrored and marked done
- **WHEN** the worker tick picks up a `pending` row for a `food_log` entry of an `env`-configured
  user
- **THEN** it creates a page in the user's food-log Notion DB and updates the outbox row to
  `status = "done"` with the created `notion_page_id`

#### Scenario: second job for the same source updates, not duplicates
- **WHEN** the worker processes an enqueued correction whose `(source_table, source_id)` already has
  a prior `done` row with a `notion_page_id`
- **THEN** it updates that existing Notion page instead of creating a second one

#### Scenario: processing is rate-limited
- **WHEN** a batch of many due rows is processed in one tick
- **THEN** Notion requests are issued sequentially at no more than ~3 requests per second

### Requirement: Failures retry with backoff and dead-letter

On a per-row mirror failure the system SHALL increment `attempts`, set `status = "failed"`, store
the error message in `last_error`, and set `next_attempt_at = now + min(base·2^attempts, cap)` plus
jitter. Once `attempts` reaches the configured maximum the row SHALL become `status = "dead"` and
SHALL no longer be retried. A failing row SHALL never abort the rest of the batch. `last_error`
SHALL contain only the error message — never raw body/progress values (invariant #9).

#### Scenario: transient Notion error schedules a retry
- **WHEN** the Notion API returns an error for a row on its first attempt
- **THEN** the row becomes `status = "failed"` with `attempts = 1`, a populated `last_error`, and a
  future `next_attempt_at`, and later ticks retry it after that time

#### Scenario: max attempts dead-letters the row
- **WHEN** a row fails and its incremented `attempts` reaches the maximum
- **THEN** the row becomes `status = "dead"` and subsequent ticks never pick it up again

#### Scenario: one bad row does not abort the batch
- **WHEN** the first row of a batch throws during mirroring
- **THEN** the remaining rows in the batch are still processed in the same tick

### Requirement: Per-user Notion config with env credential reference

The system SHALL resolve each outbox row's Notion target through a per-user `notion_config` row
(`user_id` unique, `auth_type` enum `env|oauth`, `credential_ref`, the four Notion DB IDs,
`enabled`). `credential_ref` SHALL hold a reference (the env var name), never the secret itself
(invariant #9). v1 SHALL implement only `auth_type = "env"` (client built from `NOTION_TOKEN`);
rows for a user whose config is absent, `enabled = false`, or `auth_type = "oauth"` SHALL be
skipped without error. The owner's `env` config row SHALL be seeded lazily from the `NOTION_*` env
vars on first enqueue.

#### Scenario: env auth resolves a client and DB ids
- **WHEN** the worker resolves a user whose config row is `auth_type = "env"`, `enabled = true`
- **THEN** it gets a Notion client authenticated with the `NOTION_TOKEN` env value plus that row's
  four DB ids, and the token never appears in any DB column

#### Scenario: disabled or missing config skips the row
- **WHEN** the worker picks up a row for a user with no `notion_config` row or `enabled = false`
- **THEN** the row is skipped without being marked `dead` by that resolution alone and no Notion
  call is made

#### Scenario: oauth branch is declared but skipped in v1
- **WHEN** a config row has `auth_type = "oauth"`
- **THEN** resolution returns no target and the row is skipped (no crash, no Notion call)

### Requirement: Mirror is fully off the reply path and off by default

Notion I/O SHALL never run on the reply path: the user's confirmation is sent as soon as the
Postgres write succeeds, independent of mirror state (US-10 acceptance). The worker SHALL start
only when `NOTION_TOKEN` is set; without it the bot boots normally, enqueue is a no-op, and all
suites pass with no `NOTION_*` env vars set. On shutdown the worker SHALL stop polling and let any
in-flight row finish (invariant #7 — one lightweight in-process poller, no extra process).

#### Scenario: reply is confirmed before any Notion I/O
- **WHEN** a user logs food while the Notion API is slow or down
- **THEN** the confirmation reply arrives immediately after the Postgres write; the mirror outcome
  affects only `notion_sync` state

#### Scenario: bot boots with no NOTION_* env set
- **WHEN** the bot starts with none of the five `NOTION_*` vars set
- **THEN** it boots normally, the worker is not started, and mirrored writes behave exactly as
  before (no outbox errors surface)

#### Scenario: graceful shutdown stops the worker
- **WHEN** the process receives a shutdown signal while the worker is mid-row
- **THEN** polling stops, the in-flight row is allowed to finish, and the process exits cleanly
