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

#### Scenario: Health endpoint reports liveness
- **WHEN** an HTTP `GET /health` request hits the configured `PORT` while the bot is running
- **THEN** the server responds `200` with a small body indicating the process is alive

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
