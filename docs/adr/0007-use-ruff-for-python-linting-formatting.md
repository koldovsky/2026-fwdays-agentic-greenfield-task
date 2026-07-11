# Use Ruff for Python linting, formatting, and import sorting

## Context and Problem Statement

The backend Python codebase needs a single, fast tool that handles linting, code formatting, and import sorting. Historically this required combining three tools (Flake8 for lint rules, Black for formatting, isort for import order), each with its own config file and pre-commit hook. We need to pick one tool that covers all three responsibilities without sacrificing rule coverage.

## Considered Options

* Flake8 + Black + isort (the historical default)
* Ruff (single Rust-based tool covering all three)
* Pylint + Black + isort

## Decision Outcome

Chosen option: "Ruff", because it is significantly faster and combines the functionalities of Flake8, Black, and isort into a single tool, making it easier to manage and use for Python development. It can perform linting, formatting, and import sorting all at once, which streamlines the development workflow.

### Consequences

* Good, because a single `tool.ruff` config block replaces three separate config files (`setup.cfg`, `pyproject.toml [tool.black]`, `pyproject.toml [tool.isort]`).
* Good, because the dev loop and CI runs are materially faster (Rust implementation, parallelised by default).
* Good, because rule coverage is broad: pycodestyle, pyflakes, pyupgrade, flake8-bugbear, comprehensions, simplify, isort, and ruff-specific checks (E/F/I/UP/B/C4/SIM/TID/RUF).
* Bad, because some niche plugins (e.g. `flake8-django`, `flake8-pydantic`) still have no Ruff equivalent, so projects that depend on them cannot fully migrate.
