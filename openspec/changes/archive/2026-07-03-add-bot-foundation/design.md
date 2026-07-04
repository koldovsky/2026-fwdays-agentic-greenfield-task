## Context

The repo is greenfield: PRD and capability plan exist, but `nedilya-na-vagakh/` has
not been created. Capability 1 (`foundation`) must land before any command handlers.
The PRD mandates Python 3.11+, `python-telegram-bot`, SQLite, env-based secrets, long
polling, and a single-user allowlist. All user-facing text is Ukrainian (NFR-I18N-01).

## Goals / Non-Goals

**Goals:**

- Runnable bot process that connects to Telegram via long polling.
- Durable SQLite storage with `user_settings` and `weigh_ins` tables matching the PRD
  data model.
- Allowlist middleware blocking unauthorized Telegram user IDs before any handler
  runs.
- Testable project layout with `pytest` and documented env vars in `.env.example`.

**Non-Goals:**

- Command handlers (`/start`, `/вага`, etc.) — later capabilities.
- Sunday reminder scheduler — `reminders` capability.
- Business logic (parse, compare, trends) — `weigh-in` and downstream capabilities.
- Webhook deployment, Docker, or CI — operator choice; long polling is sufficient
  for v1 (TC-DEPLOY-01).

## Decisions

### 1. Package layout under `nedilya-na-vagakh/`

```
nedilya-na-vagakh/
├── bot/
│   ├── __init__.py
│   ├── main.py          # entrypoint: build app, run polling
│   ├── config.py        # load env vars, validate required keys
│   ├── db.py            # connection + schema init
│   ├── repository.py    # CRUD for user_settings, weigh_ins
│   └── middleware.py    # allowlist filter
├── tests/
│   ├── test_config.py
│   ├── test_db.py
│   └── test_middleware.py
├── requirements.txt
├── .env.example
└── pytest.ini (or pyproject.toml test config)
```

**Rationale:** Flat `bot/` package keeps imports simple for a small v1 bot.
**Alternative considered:** src-layout (`src/nedilya/`) — rejected as over-engineering
for a single-package homework project.

### 2. `python-telegram-bot` v21+ with `Application` builder

Use the modern `Application.builder().token(...).build()` API with
`application.run_polling()`. Register allowlist as a `TypeHandler` or
`update.middleware` / custom `BaseHandler` in group `-1` so it runs before command
handlers added in later changes.

**Rationale:** PTB v21 is the current stable API; long polling needs no public URL.
**Alternative:** aiogram — rejected; PRD specifies `python-telegram-bot` (TC-STACK-01).

### 3. SQLite file path via `DATABASE_PATH` env (default `./data/bot.db`)

Schema created idempotently on startup (`CREATE TABLE IF NOT EXISTS`). Use
`sqlite3` stdlib with a thin wrapper; no ORM.

**Rationale:** PRD allows single-file SQLite (TC-STACK-02); stdlib avoids extra deps.
**Alternative:** SQLAlchemy — rejected for v1 complexity.

### 4. Repository layer with typed dataclasses

`UserSettings` and `WeighIn` dataclasses mirror PRD columns. Repository exposes
`get_or_create_settings(user_id)`, `insert_weigh_in(...)`, `get_latest_weigh_in(...)`,
etc. Handlers in later capabilities call repository, not raw SQL.

**Rationale:** Keeps SQL in one module; enables unit tests with in-memory SQLite
(`:memory:`).

### 5. Config from environment

| Variable           | Required | Default        | Notes                          |
| ------------------ | -------- | -------------- | ------------------------------ |
| `BOT_TOKEN`        | yes      | —              | Telegram bot token             |
| `ALLOWED_USER_IDS` | yes      | —              | Comma-separated Telegram IDs   |
| `DATABASE_PATH`    | no       | `./data/bot.db`| SQLite file location           |

Load via `os.environ`; fail fast at startup with a clear log message if required
vars are missing (NFR-OPS-01). Document all vars in `.env.example`.

**Rationale:** Matches PRD and AGENTS.md; no secrets in repo.

### 6. Allowlist as first handler group

Parse `ALLOWED_USER_IDS` into a `set[int]` at startup. On each update, if
`update.effective_user.id` not in the set, reply once with a neutral Ukrainian
message (e.g. «Вибачте, цей бот призначений лише для особистого користування.»)
and stop propagation — no DB reads, no command routing (FR-SEC-01, FR-SEC-02).

**Rationale:** Security gate must precede all handlers; middleware pattern is PTB-native.
**Alternative:** Check inside each handler — rejected; easy to forget on new commands.

### 7. Minimal smoke behavior for foundation

Register a no-op or `/ping`-style health check is **not** in PRD — instead, verify
via unit tests and manual `python -m bot.main` startup. Unauthorized users get the
refusal message; authorized users receive no reply until later capabilities add
commands.

**Rationale:** FR-CMD-01 ships with the `commands` capability; foundation only proves
the process runs and the gate works.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| SQLite write contention on concurrent updates | v1 is single-user; one writer is fine |
| Forgetting allowlist on new handlers | Central middleware in group `-1`; document in AGENTS.md |
| PTB version API drift | Pin `python-telegram-bot` in `requirements.txt` |
| DB file lost on ephemeral deploy | Document persistent volume for `DATABASE_PATH`; NFR-REL-01 assumes durable disk |

## Migration Plan

Greenfield — no migration. Operator steps:

1. Copy `.env.example` → `.env`, fill `BOT_TOKEN` and `ALLOWED_USER_IDS`.
2. `pip install -r requirements.txt`
3. `python -m bot.main` from `nedilya-na-vagakh/`
4. Send a message from a non-allowlisted account → expect Ukrainian refusal.
5. Run `pytest` to verify storage and config logic.

Rollback: stop the process; delete SQLite file if schema is wrong (no production data
yet).

## Open Questions

- None blocking v1. Webhook vs polling remains operator choice; implementation uses
  polling only.
