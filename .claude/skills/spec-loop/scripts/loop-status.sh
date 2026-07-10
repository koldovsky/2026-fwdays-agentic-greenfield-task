#!/usr/bin/env bash
# Step-0 assessment snapshot for the spec-loop.
#
# Prints what the loop must know before it starts: git state, the OpenSpec backlog, the
# project's binding (loop.config.sh — its deterministic gate + optional journey contract),
# whether the project AUTOMATES its checks as hooks/CI (the loop REUSES these, never installs
# them), and the current run + its STATE/manifest. Read-only — it changes nothing.
#
# Stack-agnostic: this script detects no package manager, framework, or test runner. What the
# project uses is declared in loop.config.sh, and the loop reuses it.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

echo "=== spec-loop assessment @ $(bash "$SCRIPT_DIR/loop-now.sh") ==="
echo "root: $ROOT"
echo

echo "## Git"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short --branch
else
  echo "  (not a git repo)"
fi
echo

echo "## OpenSpec backlog (active changes — the unit of work)"
if command -v openspec >/dev/null 2>&1; then
  openspec list --json 2>/dev/null || openspec list 2>/dev/null || echo "  (openspec list failed)"
else
  echo "  (openspec CLI not found on PATH)"
fi
echo

echo "## Project binding (loop.config.sh — the ONLY stack-specific piece; the loop reuses it)"
CONFIG="${LOOP_CONFIG:-$ROOT/loop.config.sh}"
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  ( . "$CONFIG"
    if declare -F loop_verify >/dev/null 2>&1; then
      echo "  loop_verify: declared → deterministic gate ready (reused at Gate 2 + mirrors the project's hooks)"
    else
      echo "  loop_verify: MISSING → declare the project's deterministic gate before running the loop"
    fi
    have=0
    for fn in loop_services_up loop_services_down loop_preview loop_journeys; do
      if declare -F "$fn" >/dev/null 2>&1; then echo "  $fn: declared"; have=1; else echo "  $fn: absent"; fi
    done
    if [ "$have" -eq 1 ]; then
      echo "  → real-stack journeys APPLY (this project declares a journey/service contract)"
    else
      echo "  → no journey contract declared → non-UI/library shape: rely on the deterministic gate + honest unit/integration tests"
    fi
  )
else
  echo "  loop.config.sh: ABSENT → the loop is stack-agnostic and needs the project to declare its gate."
  echo "    Create loop.config.sh at the repo root with loop_verify() (the command your hooks/CI run);"
  echo "    optionally set LOOP_TZ and declare loop_services_up/down + loop_preview + loop_journeys."
fi
echo

echo "## Deterministic-check automation (the loop REUSES this — it never installs/edits hooks)"
found=0
if [ -f .claude/settings.json ] && grep -q '"hooks"' .claude/settings.json 2>/dev/null; then
  echo "  Claude Code hooks: present (.claude/settings.json)"; found=1
fi
if [ -d .husky ] || [ -f .pre-commit-config.yaml ] || [ -f .git/hooks/pre-commit ]; then
  echo "  pre-commit hook: present"; found=1
fi
if [ -d .github/workflows ] || [ -f .gitlab-ci.yml ] || [ -d .circleci ]; then
  echo "  CI workflows: present"; found=1
fi
[ "$found" -eq 0 ] && echo "  none detected → the orchestrator runs verify-gate.sh (loop_verify) as a plain script at Gate 2 (still no model)."
echo

echo "## Loop run (spec-loop-preflight namespaces each run under loop/runs/<run-id>/)"
if [ -L loop/latest ] || [ -d loop/latest ]; then
  echo "  current run: loop/latest -> $(readlink loop/latest 2>/dev/null || echo '(dir)')"
  echo "  runs on disk: $(ls -d loop/runs/run-* 2>/dev/null | wc -l | tr -d ' ')"
else
  echo "  loop/latest: absent → no run yet. spec-loop-preflight will mint one (or the loop mints it standalone)."
fi
echo

echo "## Loop STATE (current run)"
if [ -f loop/latest/STATE.md ]; then
  echo "  loop/latest/STATE.md: present → RESUME from it (read the resolution column)"
else
  echo "  loop/latest/STATE.md: absent → first/fresh run, initialize from references/state-format.md"
fi
echo

echo "## Preflight manifest (spec-loop-preflight's validated plan — Gate 0)"
if [ -f loop/latest/manifest.md ]; then
  echo "  loop/latest/manifest.md: present → CONSUME it (skip re-planning; plan inline only for specs it misses)"
else
  echo "  loop/latest/manifest.md: absent → no pre-validated plan. Either run spec-loop-preflight first (recommended:"
  echo "    an up-front spec-quality + cross-spec traceability review), or the loop plans each spec inline."
fi
