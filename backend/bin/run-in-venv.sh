#!/usr/bin/env bash
# Quick 260708-x22: launcher for the venv-installed wheel.
#
# The Dockerfile final image installs the wheel into /app/.venv via
# `uv pip install --python /app/.venv/bin/python /tmp/dist/*.whl`,
# so the venv's python is at /app/.venv/bin/python and is NOT on
# the system PATH. This launcher wraps the venv's python so the
# compose `command:` can use the bare `python -m <module>` form
# without re-deriving the venv path.
#
# Usage (in compose `command:` arrays):
#   ["run-in-venv.sh", "-m", "uvicorn", "epubtv.main:app", ...]
#   ["run-in-venv.sh", "-m", "epubtv.tools.mock_openai_service"]
#   ["run-in-venv.sh", "-c", "import urllib.request; ..."]
#
# Deviation from the user's literal snippet (gray area G2 in the
# plan): the user's draft used `source activate` + `python "$@"`
# + `deactivate` — this script uses `exec "${VENV_DIR}/bin/python"
# "$@"` (no `source`, no `deactivate`, `exec` replaces the shell
# so signals propagate cleanly to uvicorn / mock-openai). The
# `exec` form is critical for long-lived services (uvicorn +
# the mock-openai tool): a shell-wrapper would forward SIGTERM
# to itself, not to the child, and the container's stop signal
# would race against the wrapper's exit.
#
# VENV_DIR override: the default is /app/.venv (matches the
# Dockerfile final image's `uv venv /app/.venv` invocation);
# tests can override via `VENV_DIR=/path/to/venv run-in-venv.sh ...`
# for local venv invocations.
set -euo pipefail
VENV_DIR="${VENV_DIR:-/app/.venv}"
exec "${VENV_DIR}/bin/python" "$@"
