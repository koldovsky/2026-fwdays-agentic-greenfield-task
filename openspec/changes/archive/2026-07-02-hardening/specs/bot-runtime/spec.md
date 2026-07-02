# bot-runtime — delta (hardening)

## ADDED Requirements

### Requirement: Update-handler error boundary

The bot SHALL register a global update-error boundary (`bot.catch`) so that an error thrown by any
update handler never terminates the long-poll process. The boundary SHALL log the error **message
only** (never raw user/body values or full payloads — invariant #9) and SHALL make a best-effort
reply to the affected chat with a short, honest, language-mirrored "something went wrong, try
again" line (prose mirrors the inbound text's language; no inbound text → Russian default). A
failure of that reply itself SHALL be swallowed (logged message-only), never rethrown.

#### Scenario: A throwing handler does not kill the poller

- **WHEN** an update handler throws while processing a message
- **THEN** the process keeps polling and handling subsequent updates
- **AND** the error is logged message-only

#### Scenario: The affected user gets an honest error reply

- **WHEN** the boundary catches a handler error for a chat whose inbound message was in Russian
- **THEN** the bot attempts to send that chat a short Russian "something went wrong" reply
- **AND** structural content/enums involved remain English (invariant #6 untouched)

#### Scenario: A failing error-reply is swallowed

- **WHEN** the boundary's own reply attempt fails (e.g. Telegram unreachable)
- **THEN** the failure is logged message-only and nothing rethrows; polling continues

### Requirement: Process-level fatal-error posture

The process SHALL install `unhandledRejection` and `uncaughtException` handlers that log the error
message only and exit with a non-zero code (crash-and-restart posture). Recovery relies on the
supervisor restarting the container and on Telegram long-polling redelivering updates that were
never acknowledged — no logged entry is lost (Postgres writes are already committed or absent).

#### Scenario: Unhandled rejection exits non-zero after logging

- **WHEN** a promise rejection escapes all handlers
- **THEN** the process logs the reason message-only and exits with a non-zero code

#### Scenario: No lost entries across a crash-restart

- **WHEN** the process crashes after a food entry's Postgres write committed
- **THEN** the entry exists after restart (DB is the memory)
- **AND** an update fetched but unprocessed is redelivered by Telegram on the next long-poll

### Requirement: Outgoing Telegram API retry

Outgoing Telegram Bot API calls SHALL be retried on HTTP 429 (honoring Telegram's `retry_after`)
and on transient network errors, with a bounded retry budget (bounded attempts and a per-wait
ceiling). A call still failing after the budget SHALL surface as a normal error to the caller (and
thence the error boundary) — never an infinite retry loop.

#### Scenario: A rate-limited send eventually succeeds

- **WHEN** a `sendMessage` call receives 429 with a small `retry_after`
- **THEN** the call is retried after the indicated delay and the user receives the message

#### Scenario: Retry budget is bounded

- **WHEN** the API keeps failing beyond the configured attempts/delay ceiling
- **THEN** the call fails with an error instead of retrying indefinitely

### Requirement: Graceful shutdown covers the review scheduler

The shutdown path (SIGINT/SIGTERM) SHALL stop the review cron task in addition to the existing
bot/worker/health/Prisma teardown, so no new sweep starts mid-shutdown.

#### Scenario: Cron task stopped on SIGTERM

- **WHEN** the process receives SIGTERM
- **THEN** the review scheduler's cron task is stopped as part of shutdown

## MODIFIED Requirements

### Requirement: Internal health probe

The bot SHALL expose a minimal HTTP server on `PORT` that answers a liveness probe for Coolify.
This port SHALL be internal only — not publicly routed and not used for Telegram update delivery.
The probe response SHALL be `200` with a JSON body reporting process liveness and memory:
`status`, RSS (MB), heap used (MB), and uptime (seconds) — the on-box evidence for the 512 MB cap
(PRD §4 M6). Any body change SHALL keep the status code `200` so existing status-code probes stay
green.

#### Scenario: Health endpoint reports liveness

- **WHEN** an HTTP `GET /health` request hits the configured `PORT` while the bot is running
- **THEN** the server responds `200` with a small body indicating the process is alive

#### Scenario: Health body carries memory evidence

- **WHEN** `GET /health` is requested
- **THEN** the JSON body includes numeric RSS-in-MB, heap-used-in-MB, and uptime-in-seconds fields
