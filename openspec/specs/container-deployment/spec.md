# container-deployment

## Purpose

Docker packaging for long-polling deployment on always-on hosts: image build,
compose orchestration, build-context hygiene, and operator documentation.

## Requirements

### Requirement: Dockerfile for long-polling bot

The `nedilya-na-vagakh/` project SHALL ship a `Dockerfile` that builds a runnable
image using Python 3.11+, installs runtime dependencies (`python-telegram-bot`,
`python-dotenv`), copies the `bot/` package, sets `DATABASE_PATH` default to
`/app/data/bot.db`, and starts the bot via `python -m bot`. (TC-DEPLOY-02,
TC-STACK-01)

#### Scenario: Image builds from bot root

- **WHEN** the operator runs `docker build` from `nedilya-na-vagakh/`
- **THEN** the build completes without error and produces an image that can start
  the bot entrypoint

#### Scenario: Runtime deps only in image

- **WHEN** the Dockerfile installs Python packages
- **THEN** it does not install `pytest` or other dev-only test dependencies

### Requirement: Docker Compose for local and always-on deployment

The project SHALL provide a `docker-compose.yml` (or equivalent documented compose
file) that builds the image, loads secrets from `env_file` (`.env`), mounts a host
directory to `/app/data` for SQLite persistence, sets `restart: unless-stopped`,
and does not publish inbound ports. (TC-DEPLOY-02, NFR-REL-01, NFR-OPS-01)

#### Scenario: Compose starts with env and volume

- **WHEN** the operator runs `docker compose up` with a valid `.env` and `./data`
  volume configured
- **THEN** the bot container starts and `DATABASE_PATH` resolves under the mounted
  `/app/data` path

#### Scenario: No inbound ports required

- **WHEN** the compose file is inspected
- **THEN** no `ports` mapping is defined for the bot service

### Requirement: Docker build context hygiene

The project SHALL include a `.dockerignore` that excludes `.venv`, local SQLite
files, `.env`, and test artifacts from the build context. Secrets MUST NOT be
copied into the image. (NFR-OPS-01)

#### Scenario: Build context excludes secrets and local DB

- **WHEN** `.dockerignore` is present
- **THEN** it excludes at least `.env`, `data/`, and `.venv`

### Requirement: Container deployment documentation

`nedilya-na-vagakh/README.md` SHALL document how to build and run the bot in
Docker, including ARM64 (`linux/arm64`) build notes for home-router hosts and
guidance to back up the mounted data directory. (TC-DEPLOY-02)

#### Scenario: README documents docker workflow

- **WHEN** a developer reads the README Docker section
- **THEN** it describes build, run with compose, required env vars, and persistent
  volume for `bot.db`

#### Scenario: ARM64 build documented

- **WHEN** the README covers deployment targets
- **THEN** it includes `docker build --platform linux/arm64` (or equivalent) for
  ARM hosts such as home routers
