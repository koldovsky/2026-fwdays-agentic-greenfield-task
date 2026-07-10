#!/usr/bin/env bash
# Gate 2 deterministic suite — a PLAIN SCRIPT (no model).
#
# The deterministic checks belong to the PROJECT, not the harness. The project declares its
# full gate once as `loop_verify` in loop.config.sh (the SAME command its hooks / pre-commit
# / CI already run). This script just REUSES it: it runs loop_verify for the Gate-2 evidence
# record, tees the output, and exits non-zero if it fails. No model ever reasons over the
# logs — a red check means the spec goes BACK TO GATE 1 to fix the root cause, never a
# suppression (a lint-disable / ignore-pragma / skipped test); the checker is a different
# agent who will notice.
#
# Stack-agnostic: loop_verify can be `make check`, `cargo test && cargo clippy`, `tox`, a
# monorepo task runner, anything. This script names no package manager, runner, or language.
# During Gate 1 the project's hooks run the same checks on every edit, so the implementer
# fixes failures immediately; this run is the durable artifact of the same suite.
#
# Usage: verify-gate.sh <artifacts_dir>
# Env:   LOOP_CONFIG  override the binding path (default: <repo-root>/loop.config.sh)
set -uo pipefail

# Resolve this script's own dir (to reach loop-now.sh) BEFORE any cd, then run from the repo
# root so loop.config.sh and the git tree resolve no matter the caller's cwd — the
# orchestrator invokes this with a `loop/latest/artifacts/…` arg, so callers vary.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

OUT="${1:?usage: verify-gate.sh <artifacts_dir>}"
mkdir -p "$OUT"

# The ONE canonical timestamp (project TZ via loop.config.sh, else UTC) — no format drift.
stamp() { bash "$SCRIPT_DIR/loop-now.sh"; }

# Source the project's binding. Without it we cannot know the project's checks, and silently
# "passing" would be a lie — so print the contract and fail.
CONFIG="${LOOP_CONFIG:-$ROOT/loop.config.sh}"
if [ ! -f "$CONFIG" ]; then
  cat >&2 <<'EOF'
verify-gate.sh: no loop.config.sh found at the repo root.
The loop is stack-agnostic — the PROJECT declares its checks. Create loop.config.sh:

    # loop.config.sh  (repo root)
    loop_verify() { <the command your hooks / CI already run>; }   # exit non-zero on failure

Optionally set LOOP_TZ and declare the journey contract (loop_services_up/down,
loop_preview, loop_journeys). See references/journeys.md.
EOF
  exit 1
fi
# shellcheck disable=SC1090
. "$CONFIG"

if ! declare -F loop_verify >/dev/null 2>&1; then
  echo "verify-gate.sh: loop.config.sh defines no loop_verify() — declare the project's deterministic gate there." >&2
  exit 1
fi

echo "=== Gate 2 deterministic suite @ $(stamp) → $OUT ==="
echo "── running the project's loop_verify (from ${CONFIG#$ROOT/})"
if loop_verify >"$OUT/verify.log" 2>&1; then
  echo "GATE 2 deterministic suite passed @ $(stamp) — log in $OUT/verify.log"
  exit 0
else
  echo "GATE 2 DETERMINISTIC SUITE FAILED @ $(stamp) — fix root cause, do not suppress. Log in $OUT/verify.log" >&2
  exit 1
fi
