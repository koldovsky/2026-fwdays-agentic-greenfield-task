# «Неділя на вагах» — Telegram bot

Private Ukrainian-language bot for tracking body-composition weigh-ins.
Product context: [`../docs/product-overview.md`](../docs/product-overview.md).
Requirements: [`../docs/prd.md`](../docs/prd.md).

## Requirements

- Python **3.11+** (`TC-STACK-01`) — `.python-version` pins `3.11` for pyenv
- Telegram bot token and allowlisted user IDs in `.env` (copy from `.env.example`)

Install Python 3.11 if needed:

```bash
brew install python@3.11    # Homebrew
# or: pyenv install 3.11 && pyenv local 3.11
```

## Setup

One command creates a Python 3.11 virtualenv, installs dependencies, and registers git hooks:

```bash
make dev-install
source .venv/bin/activate
```

Manual venv (equivalent):

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
```

## Run the bot

```bash
source .venv/bin/activate
cp .env.example .env   # fill in BOT_TOKEN and ALLOWED_USER_IDS
python -m bot
```

## Run with Docker

For always-on deployment (VPS, home router, etc.) when a local Python process is not
running (`TC-DEPLOY-02`). Long polling needs **outbound** internet only — no published
ports.

### Prerequisites

- Docker and Docker Compose
- `.env` with `BOT_TOKEN` and `ALLOWED_USER_IDS` (copy from `.env.example`)

### Build and run

```bash
cd nedilya-na-vagakh
cp .env.example .env   # fill in secrets
docker compose build
docker compose up -d
docker compose logs -f bot
```

SQLite is stored on the host at `./data/bot.db` (mounted to `/app/data` in the
container). Back up that directory before image rebuilds or host maintenance
(`NFR-REL-01`).

Stop the bot:

```bash
docker compose down
```

### ARM64 home-router hosts

Build for ARM targets (e.g. Xiaomi BE7000) on your dev machine:

```bash
docker build --platform linux/arm64 -t nedilya-bot .
```

On the router, mount persistent USB storage for the database, for example:

```text
Host:  /mnt/usb-xxxx/nedilya/data
Container: /app/data
```

Example `docker run` (paths illustrative):

```bash
docker run -d \
  --name nedilya-bot \
  --restart unless-stopped \
  --env-file .env \
  -e DATABASE_PATH=/app/data/bot.db \
  -v /mnt/usb-xxxx/nedilya/data:/app/data \
  nedilya-bot
```

Secrets are supplied via environment at run time — never baked into the image
(`NFR-OPS-01`).

## Development

| When | What runs |
|------|-----------|
| `git commit` | Ruff lint/format, mypy, file hygiene |
| `git push` | Full `pytest` suite |
| Manual | `make check` — lint + mypy + pytest (same as CI) |

### Commands

```bash
make lint       # ruff check
make format     # auto-fix lint + format
make typecheck  # mypy bot
make test       # pytest
make check      # all of the above (use before /opsx:archive)
```

All `make` targets use `.venv/bin/python` when present, otherwise `python3.11`.

### CI

GitHub Actions (`.github/workflows/ci.yml`) runs the same checks on Python 3.11 and
3.12 for every push and pull request.

## License

MIT — see [LICENSE](LICENSE).
