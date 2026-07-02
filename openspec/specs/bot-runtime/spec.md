# bot-runtime

## Purpose

The application's runtime spine: env-validated boot, the long-poll Telegram update loop, the
`/start` round-trip, and the internal `/health` liveness probe. This is the shared skeleton every
later capability (data, router, onboarding, …) plugs into. Delivery is long-polling, not webhook
([ADR-0014](../../../docs/adr/0014-long-polling-over-webhook.md)).
## Requirements
### Requirement: Environment validation on boot
The bot SHALL validate all required environment variables through a zod schema in `config/`
before starting any I/O, and SHALL refuse to boot (exit non-zero with a clear message) when a
required variable is missing or malformed. Required: `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `PORT`
(default `3000` when unset). `ANTHROPIC_API_KEY` SHALL be required (validated present) even though no
LLM call is made yet. `NOTION_TOKEN` and `NOTION_*` DB ids SHALL be optional. `TZ` SHALL be optional
with a default of `Europe/Kyiv` (used by the later review cron). Secrets SHALL be read from
environment only — never from the repo or the database.

#### Scenario: Missing required variable aborts boot
- **WHEN** the process starts with `TELEGRAM_BOT_TOKEN` unset
- **THEN** zod validation fails, a message naming the missing variable is logged, and the process
  exits non-zero without opening the Telegram connection or the health server

#### Scenario: PORT defaults when unset
- **WHEN** the process starts with all required secrets present and `PORT` unset
- **THEN** validation passes and the health server binds to `3000`

#### Scenario: Optional Notion vars absent still boots
- **WHEN** the process starts with no `NOTION_*` variables set but all required vars present
- **THEN** validation passes and the bot boots normally

### Requirement: Long-poll update delivery
The bot SHALL receive Telegram updates via long-polling (`bot.start()` / `getUpdates`), and SHALL
NOT register a webhook, open a public inbound endpoint, or require a TLS certificate or public
domain ([ADR-0014](../../../docs/adr/0014-long-polling-over-webhook.md)).

#### Scenario: Updates arrive over an outbound poll
- **WHEN** the bot starts
- **THEN** it opens an outbound long-poll connection to the Telegram API and processes incoming
  updates without any `setWebhook` call or exposed inbound HTTP route for updates

### Requirement: `/start` round-trip
The bot SHALL handle the `/start` command by replying to the same chat, proving the end-to-end
delivery path (Telegram → bot → Telegram).

#### Scenario: User sends /start
- **WHEN** a user sends `/start` to the bot
- **THEN** the bot replies in that chat with an acknowledgement message

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

### Requirement: Build off-box, image runs under the memory cap
The production image SHALL be produced by a multi-stage build in CI and pushed to GHCR; the
production host (Coolify) SHALL only pull and run it — no `npm install` or `tsc` runs on the host
(invariant #7). The running bot SHALL stay within the 512 MB bot memory cap.

#### Scenario: CI builds and pushes the image
- **WHEN** CI runs on the change branch / push
- **THEN** the multi-stage Dockerfile builds the image (pushed to GHCR on `main`), and no build step
  is configured to run on the production host

#### Scenario: Idle footprint within cap
- **WHEN** the bot runs idle on a long-poll connection
- **THEN** its resident memory stays well within 512 MB (plain grammY idle ~60–100 MB per
  requirements §4)

### Requirement: Database migration and connectivity on startup
On boot, after env validation and before the bot begins serving updates, the runtime SHALL apply
pending Prisma migrations (`prisma migrate deploy`, run inside the container) and confirm a working
database connection. If migrations fail or the database is unreachable, the process SHALL exit
non-zero rather than serve traffic against an unmigrated or absent database.

#### Scenario: Migrations applied before serving
- **WHEN** the container starts in production
- **THEN** `prisma migrate deploy` runs and completes successfully before `bot.start()` is called

#### Scenario: Unreachable database aborts boot
- **WHEN** the bot starts and the database connection cannot be established
- **THEN** the process logs the failure and exits non-zero without entering the long-poll loop

### Requirement: Non-command messages route through the classifier
The long-poll handler SHALL pass non-command text messages to the message router and act on the
returned intent, instead of only handling the `/start` command. Commands (e.g. `/start`) SHALL
continue to be handled directly without a router call.

#### Scenario: A text message is routed
- **WHEN** a user sends a non-command text message
- **THEN** the handler invokes the router classifier and dispatches on the returned `intent`

#### Scenario: Commands bypass the router
- **WHEN** a user sends `/start`
- **THEN** the command handler runs directly, with no classification call

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

