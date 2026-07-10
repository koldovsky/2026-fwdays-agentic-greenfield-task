#!/usr/bin/env bash
# End-to-end verification loop (Linux/macOS/CI/Git-Bash).
# Proves the whole stack works: Postgres up -> backend deps+tests (incl. DB) -> frontend build.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> [1/4] Starting PostgreSQL (docker compose up -d db)"
docker compose -f "$root/docker-compose.yml" up -d db

echo "==> Waiting for PostgreSQL to become healthy"
for _ in $(seq 1 30); do
  cid="$(docker compose -f "$root/docker-compose.yml" ps -q db)"
  health="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo starting)"
  echo "    db health: $health"
  [ "$health" = "healthy" ] && break
  sleep 2
done
[ "${health:-}" = "healthy" ] || { echo "PostgreSQL did not become healthy"; exit 1; }

echo "==> [2/4] Backend: create venv + install deps"
cd "$root/backend"
python -m venv .venv
py="./.venv/bin/python"
"$py" -m pip install --quiet --upgrade pip
"$py" -m pip install --quiet -e ".[dev]"

echo "==> [3/4] Backend: lint + types + migrations + tests (with DB)"
"$py" -m ruff check .
"$py" -m mypy app
"$py" -m alembic upgrade head
RUN_DB_TESTS=1 "$py" -m pytest -q

echo "==> [4/4] Frontend: install + typecheck + build + unit tests"
cd "$root/frontend"
npm install
npm run build
npm test

echo "==> Verification complete. The stack is wired end-to-end. ✅"
