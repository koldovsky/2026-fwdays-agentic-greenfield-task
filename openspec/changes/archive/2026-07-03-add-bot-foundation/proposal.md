## Why

The «Неділя на вагах» Telegram bot has a locked PRD but no runnable code yet. Every
later capability (weigh-in logging, comparisons, history, onboarding) depends on a
project scaffold, durable SQLite storage, a bootstrapped bot process, and an
allowlist gate — without these, nothing can be implemented or deployed safely.

## What Changes

- Create the `nedilya-na-vagakh/` project root with Python 3.11+, `requirements.txt`,
  `pytest` setup, and `.env.example` documenting `BOT_TOKEN` and allowlist vars
  (TC-STACK-01..03, NFR-OPS-01).
- Add SQLite schema and a repository layer for `user_settings` and `weigh_ins` tables
  per the PRD data model, with initialization on first run (NFR-REL-01).
- Bootstrap the bot with `python-telegram-bot` long polling, loading config from
  environment variables (TC-DEPLOY-01).
- Add allowlist middleware that blocks non-configured Telegram user IDs with a
  neutral Ukrainian refusal and no data leakage (FR-SEC-01, FR-SEC-02).
- No user-facing commands beyond what is needed to verify the bot starts and the
  allowlist works; command handlers ship in later capabilities.

## Capabilities

### New Capabilities

- `project-scaffold`: Python package layout under `nedilya-na-vagakh/`, dependency
  pinning, pytest configuration, and `.env.example` for secrets (TC-STACK-01..03,
  NFR-OPS-01).
- `sqlite-persistence`: SQLite schema, migrations/init, and repository functions for
  `user_settings` and `weigh_ins` (NFR-REL-01, PRD data model).
- `bot-runtime`: Application entrypoint, config loading, long-polling bootstrap, and
  graceful startup/shutdown (TC-DEPLOY-01).
- `access-control`: Allowlist parsing from env and middleware/handler filter that
  rejects unauthorized users in Ukrainian (FR-SEC-01, FR-SEC-02).

### Modified Capabilities

<!-- No existing specs yet — greenfield repo. -->

## Impact

- **New code**: entire `nedilya-na-vagakh/` directory (bot package, tests, config).
- **Dependencies**: `python-telegram-bot`, SQLite (stdlib), `pytest` for tests.
- **Operations**: operator must set `BOT_TOKEN` and `ALLOWED_USER_IDS` (or equivalent)
  in environment before running; `.env.example` documents required vars.
- **Downstream capabilities**: `weigh-in`, `settings`, and all command handlers build
  on this foundation; no PRD requirement changes beyond implementation of accepted
  rows.
