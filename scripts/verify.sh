#!/usr/bin/env bash
# End-to-end verification loop (Linux/macOS/CI/Git-Bash).
# Proves the whole stack works: Postgres up -> backend deps+tests (incl. DB) -> frontend build.
#
# Env knobs (no check is ever weakened; these only remove REPEATED work):
#   VERIFY_FRESH=1        force venv/pip/npm reinstall even if dep manifests are unchanged
#   VERIFY_SKIP_PYTEST=1  skip the plain pytest step - ONLY for callers that run the exact
#                         same suite themselves immediately after (gate-slice's coverage run)
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

hash_file() { (sha256sum "$1" 2>/dev/null || shasum -a 256 "$1") | awk '{print $1}'; }

deps_fresh() { # $1 = stamp file, $2 = manifest; true when deps are unchanged
  [ "${VERIFY_FRESH:-}" = "1" ] && return 1
  [ -f "$1" ] && [ -f "$2" ] && [ "$(cat "$1")" = "$(hash_file "$2")" ]
}

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
py="./.venv/bin/python"
[ -x "$py" ] || python -m venv .venv
if deps_fresh .venv/.deps-stamp pyproject.toml; then
  echo "    deps unchanged (pyproject.toml stamp) - skipping pip install (VERIFY_FRESH=1 forces)"
else
  "$py" -m pip install --quiet --upgrade pip
  "$py" -m pip install --quiet -e ".[dev]"
  hash_file pyproject.toml > .venv/.deps-stamp
fi

echo "==> [3/4] Backend: lint + types + migrations + tests (with DB)"
"$py" -m ruff check .
"$py" -m mypy app
"$py" -m alembic upgrade head
if [ "${VERIFY_SKIP_PYTEST:-}" = "1" ]; then
  echo "    pytest skipped (VERIFY_SKIP_PYTEST=1: the caller runs this exact suite under coverage next)"
else
  RUN_DB_TESTS=1 "$py" -m pytest -q
fi

echo "==> [4/4] Frontend: install + typecheck + build + unit tests"
cd "$root/frontend"
if deps_fresh node_modules/.deps-stamp package-lock.json; then
  echo "    deps unchanged (package-lock.json stamp) - skipping npm install (VERIFY_FRESH=1 forces)"
else
  npm install
  hash_file package-lock.json > node_modules/.deps-stamp
fi
npm run build
npm test

echo "==> Verification complete. The stack is wired end-to-end. ✅"
