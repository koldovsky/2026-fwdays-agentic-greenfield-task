# EPUBTV — developer / demo Makefile.
# Mirrors the workflow gates in `.planning/phases/01-foundation-epub-upload/01-03-PLAN.md`
# (D-03 dual dev + D-08 docker-compose + D-05 quality gate).

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Phase 1 quality gate (Plan 01-03 Task 4 verify): backend tests + lint + frontend lint + build + Playwright.
.PHONY: help dev demo docker build-frontend test-backend test-frontend test lint clean

help: ## Show this help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# D-03: dual dev workflow — uvicorn on :8000 (API + StaticFiles for `frontend/out/`
# when EPUBTV_SERVE_STATIC=true) and `yarn dev` on :3000 (HMR during frontend work).
# The frontend's NEXT_PUBLIC_API_BASE points at http://localhost:8000/api/v1.
dev: ## Dual dev: uvicorn :8000 + `yarn dev` :3000 (HMR).
	@echo "Starting uvicorn (API + static SPA) on :8000 and yarn dev on :3000…"
	@( \
	  cd backend && uv run uvicorn epubtv.main:app --host 0.0.0.0 --port 8000 --workers 1 & \
	  cd frontend && yarn dev & \
	  wait \
	) | tee /tmp/epubtv-dev.log
	@echo "Both servers stopped."

# D-03: single-container demo run locally — mirrors what the Dockerfile produces.
# `yarn build` regenerates `frontend/out/`; uvicorn serves API + static SPA from one process.
demo: build-frontend ## Single uvicorn serving API + static SPA (the demo).
	@echo "Booting single-uvicorn demo on :8000…"
	@cd backend && \
	  EPUBTV_SERVE_STATIC=true \
	  EPUBTV_FRONTEND_OUT=../frontend/out \
	  uv run uvicorn epubtv.main:app --host 0.0.0.0 --port 8000 --workers 1

# D-08: the demo `docker compose up` flow lives at the repo root; this Makefile
# only builds the production-shaped single image (ADR-0003; uses the repo-root
# `Dockerfile`, NOT `backend/Dockerfile.backend`).
docker: ## Build the single-container image (ADR-0003; not the compose stack).
	docker build -t epubtv .

build-frontend: ## Build the frontend static export → frontend/out/index.html.
	cd frontend && yarn install --frozen-lockfile && yarn build

# Phase 1 quality gate split: backend first, then frontend, then both.
test-backend: ## Backend: pytest (BDD F1 + unit; defer_scaling filtered out).
	cd backend && uv run pytest -x -m 'not defer_scaling and not defer_combined'

test-frontend: build-frontend ## Frontend: Playwright @web (F1 + F2 + F3 + F4 + F5 web slice).
	cd frontend && yarn playwright test --project=chromium --reporter=line

test: test-backend test-frontend ## Full Phase 1 quality gate (backend + frontend).
	@echo "Quality gate: PASS."

lint: ## Lint + type-check both packages.
	@echo "→ backend (ruff + pyrefly)…"
	@cd backend && uv run ruff check . && uv run ruff format --check . && uv run pyrefly check
	@echo "→ frontend (biome + tsc)…"
	@cd frontend && yarn lint && yarn tsc --noEmit
	@echo "Lint: PASS."

clean: ## Remove generated artefacts (build outputs, caches, scratch).
	rm -rf frontend/out frontend/.next frontend/node_modules
	rm -rf backend/.venv backend/.pytest_cache backend/.ruff_cache
	rm -rf db scratch
	rm -rf playwright-report test-results
	find . -type d -name '__pycache__' -prune -exec rm -rf {} +
