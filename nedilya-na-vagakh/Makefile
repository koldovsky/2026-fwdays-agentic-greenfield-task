.PHONY: help venv check-python install dev-install lint format typecheck test check ci

VENV := .venv
PYTHON := $(if $(wildcard $(VENV)/bin/python),$(abspath $(VENV)/bin/python),$(shell command -v python3.11 2>/dev/null || echo python3))

help:
	@echo "Targets:"
	@echo "  venv         create .venv with Python 3.11 and install dependencies"
	@echo "  dev-install  venv + pre-commit hooks (one-time setup)"
	@echo "  lint         ruff check"
	@echo "  format       ruff check --fix + ruff format"
	@echo "  typecheck    mypy bot"
	@echo "  test         pytest"
	@echo "  check        lint + typecheck + test (full local verification)"
	@echo "  ci           same as check (mirrors GitHub Actions job)"
	@echo ""
	@echo "Python: $(PYTHON)"

check-python:
	@$(PYTHON) -c 'import sys; assert sys.version_info >= (3, 11), f"need Python 3.11+, got {sys.version}"' \
		|| (echo "Python 3.11+ required. Install with: brew install python@3.11" && \
		    echo "Then run: make venv" && exit 1)

venv: check-python
	@test -x $(VENV)/bin/python || $(PYTHON) -m venv $(VENV)
	$(VENV)/bin/python -m pip install --upgrade pip
	$(VENV)/bin/pip install -r requirements.txt -r requirements-dev.txt
	@echo "Activate with: source .venv/bin/activate"

install: check-python
	$(PYTHON) -m pip install -r requirements.txt

dev-install: venv
	$(VENV)/bin/pre-commit install --install-hooks
	$(VENV)/bin/pre-commit install --hook-type pre-push

lint: check-python
	$(PYTHON) -m ruff check .

format: check-python
	$(PYTHON) -m ruff check --fix .
	$(PYTHON) -m ruff format .

typecheck: check-python
	$(PYTHON) -m mypy bot

test: check-python
	$(PYTHON) -m pytest -q

check: lint typecheck test

ci: check
