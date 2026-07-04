## Context

All v1 product capabilities are shipped. The bot runs via `python -m bot` with long
polling, env-based config (`BOT_TOKEN`, `ALLOWED_USER_IDS`, `DATABASE_PATH`), and
SQLite under `./data/bot.db`. The operator needs always-on hosting when the
development laptop is off (weekends). `TC-DEPLOY-02` adds container packaging without
changing handlers or schema.

Foundation design explicitly deferred Docker to operator choice; this change
implements that path for home-router (ARM64) and VPS targets.

## Goals / Non-Goals

**Goals:**

- Runnable OCI image from `nedilya-na-vagakh/Dockerfile` using Python 3.11 slim.
- `docker compose up` (or equivalent `docker run`) with `.env`, persistent data
  volume, and `restart: unless-stopped`.
- Secrets and allowlist from environment only — never copied into the image.
- Documented ARM64 build for hosts like Xiaomi BE7000 (`linux/arm64`).
- Manual smoke verification: container starts, polls Telegram, DB survives restart.

**Non-Goals:**

- Webhook mode, TLS termination, or published inbound ports.
- Kubernetes manifests, CI Docker build job, or image registry publishing.
- Changes to `bot/` handlers, scheduler, or SQLite schema.
- Splitting `requirements.txt` into prod/dev files (out of scope; Dockerfile
  installs runtime deps explicitly).

## Decisions

### 1. Base image: `python:3.11-slim`

Multi-arch official image supports `linux/amd64` and `linux/arm64` from one
Dockerfile. Matches `TC-STACK-01`.

**Alternative:** `alpine` — rejected; musl compatibility issues with some Python
wheels; slim is sufficient for a tiny bot.

### 2. Runtime dependencies installed explicitly in Dockerfile

`requirements.txt` includes `pytest` for local dev. The image installs only:

- `python-dotenv==1.1.0`
- `python-telegram-bot[job-queue]==21.10`

(pinned to match `requirements.txt`).

**Rationale:** Keeps image small; avoids test deps in production container.
**Alternative:** `pip install -r requirements.txt` — rejected; pulls pytest.

### 3. Entrypoint: `python -m bot`

Uses existing `bot/__main__.py` → `main()` with long polling. No wrapper script.

### 4. Config via container environment (not `.env` in image)

Compose uses `env_file: .env` on the host. Inside the container, `load_config()`
reads `os.environ` when vars are injected by Docker — no `.env` file baked in.
`python-dotenv` still works if `.env` is bind-mounted for local compose convenience,
but production path is env injection only (`NFR-OPS-01`).

### 5. SQLite persistence via bind mount

| Host path (example) | Container path | Env |
| ------------------- | -------------- | --- |
| `./data` or USB mount | `/app/data` | `DATABASE_PATH=/app/data/bot.db` |

Compose: `volumes: ["./data:/app/data"]`. Ensures `NFR-REL-01` across rebuilds.

**Rationale:** Matches existing default layout; operator can point host path at USB
on BE7000 (e.g. `/mnt/usb-xxxx/nedilya/data:/app/data`).

### 6. No exposed ports

Long polling uses outbound HTTPS to Telegram only (`TC-DEPLOY-01`). No `ports:`
in compose.

### 7. `docker-compose.yml` as optional convenience

Single-service compose file with `build: .`, `env_file`, `volumes`, `restart`.
Operators on SimpleDocker can use equivalent `docker run` flags.

### 8. `.dockerignore`

Exclude `.venv/`, `data/`, `tests/`, `__pycache__/`, `.env`, `.pytest_cache/`,
`*.db` to keep build context small and prevent secret leakage.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Ephemeral container FS without volume wipes DB | Document volume mount as required; compose defaults `./data` |
| ARM image pull slow on router | Document `docker build --platform linux/arm64` on dev machine + save/load |
| `requirements.txt` drift vs Dockerfile pins | Tasks include verify pins match; note in README |
| dotenv path assumes repo layout | Container relies on env vars from Docker, not file load |

## Migration Plan

Additive — no schema or data migration.

1. Operator copies `.env.example` → `.env`, fills secrets.
2. `docker compose build` (or `docker build --platform linux/arm64` for ARM host).
3. `docker compose up -d` with data volume.
4. Smoke: message bot from allowlisted account; restart container; confirm DB intact.
5. Rollback: `docker compose down`; data remains on host volume.

## Open Questions

- None blocking implementation. CI Docker job deferred unless requested later.
