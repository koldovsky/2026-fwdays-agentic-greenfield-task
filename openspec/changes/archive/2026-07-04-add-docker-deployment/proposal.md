## Why

The shipped bot runs only while a local Python process is active. The operator's Mac
is off on weekends, so long polling and Sunday reminders stop. `TC-DEPLOY-02` adds
container packaging so the bot can run 24/7 on an always-on host (home router, VPS)
without changing product behavior.

## What Changes

- Add `Dockerfile` under `nedilya-na-vagakh/` (Python 3.11 slim, `python -m bot`
  entrypoint) (TC-DEPLOY-02, TC-STACK-01).
- Add optional `docker-compose.yml` with `env_file`, persistent `./data` volume, and
  `restart: unless-stopped` (TC-DEPLOY-02, NFR-REL-01).
- Add `.dockerignore` excluding `.venv`, local SQLite, and dev artifacts.
- Document build, run, ARM64 (`linux/arm64`) builds for home-router hosts, and volume
  backup in `nedilya-na-vagakh/README.md` (TC-DEPLOY-02, NFR-OPS-01).
- No changes to bot handlers, SQLite schema, or Telegram command surface.

## Capabilities

### New Capabilities

- `container-deployment`: Dockerfile, compose file, ignore rules, and documented
  container run workflow for long-polling deployment with env-based secrets and
  mounted SQLite storage (TC-DEPLOY-02, NFR-OPS-01, NFR-REL-01).

### Modified Capabilities

<!-- No existing capability requirements change — packaging only. -->

## Impact

- **New files**: `nedilya-na-vagakh/Dockerfile`, `docker-compose.yml`, `.dockerignore`.
- **Docs**: `nedilya-na-vagakh/README.md` — new "Run with Docker" section.
- **Dependencies**: none added to `requirements.txt` (runtime image uses prod deps only).
- **Operations**: operator supplies `.env` (or env vars) at run time; mounts host
  directory for `DATABASE_PATH`; no inbound ports required for long polling.
- **CI**: unchanged — existing `make check` remains the quality gate; container
  smoke test is manual before archive.
