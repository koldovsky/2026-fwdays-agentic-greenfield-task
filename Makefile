# Convenience targets for Unix/CI. On Windows, use scripts/verify.ps1 or the raw
# commands in AGENTS.md (this repo does not require `make`).
.PHONY: help db-up db-down backend-install backend-lint backend-typecheck backend-test frontend-install frontend-build verify

help:
	@echo "Targets: db-up db-down backend-install backend-lint backend-typecheck backend-test frontend-install frontend-build verify"

db-up:
	docker compose up -d db

db-down:
	docker compose down

backend-install:
	cd backend && python -m venv .venv && ./.venv/bin/python -m pip install -e ".[dev]"

backend-lint:
	cd backend && ./.venv/bin/python -m ruff check .

backend-typecheck:
	cd backend && ./.venv/bin/python -m mypy app

backend-test:
	cd backend && RUN_DB_TESTS=1 ./.venv/bin/python -m pytest -q

frontend-install:
	cd frontend && npm install

frontend-build:
	cd frontend && npm run build

verify:
	bash scripts/verify.sh
