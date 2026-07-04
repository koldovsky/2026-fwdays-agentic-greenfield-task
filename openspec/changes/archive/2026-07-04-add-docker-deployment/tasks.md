## 1. Dockerfile (TC-DEPLOY-02, TC-STACK-01)

- [x] 1.1 Add `nedilya-na-vagakh/Dockerfile` based on `python:3.11-slim` with `WORKDIR /app`
- [x] 1.2 Install runtime deps only: `python-dotenv==1.1.0`, `python-telegram-bot[job-queue]==21.10` (match `requirements.txt` pins)
- [x] 1.3 `COPY bot/` package; set `ENV DATABASE_PATH=/app/data/bot.db`; `CMD ["python", "-m", "bot"]`

## 2. Compose and ignore rules (TC-DEPLOY-02, NFR-OPS-01, NFR-REL-01)

- [x] 2.1 Add `nedilya-na-vagakh/docker-compose.yml`: `build: .`, `env_file: .env`, volume `./data:/app/data`, `restart: unless-stopped`, no `ports`
- [x] 2.2 Add `nedilya-na-vagakh/.dockerignore` excluding `.venv`, `data/`, `.env`, `tests/`, `__pycache__/`, `*.db`, `.pytest_cache/`

## 3. Documentation (TC-DEPLOY-02)

- [x] 3.1 Add "Run with Docker" section to `nedilya-na-vagakh/README.md`: prerequisites, `docker compose build/up`, env vars, volume backup
- [x] 3.2 Document ARM64 build (`docker build --platform linux/arm64`) and example USB volume path for home-router hosts

## 4. Verification and PRD traceability

- [x] 4.1 Run `make check` from `nedilya-na-vagakh/` — all existing tests still green
- [x] 4.2 Manual smoke: `docker compose build && docker compose up` with valid `.env`; bot responds on Telegram
- [x] 4.3 Manual smoke: restart container; weigh-in data persists on host `./data/bot.db`
- [x] 4.4 Map implemented artifacts to PRD IDs: `TC-DEPLOY-02`, `NFR-OPS-01`, `NFR-REL-01`
