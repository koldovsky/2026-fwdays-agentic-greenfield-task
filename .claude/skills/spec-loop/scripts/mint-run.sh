#!/usr/bin/env bash
# Mint (or resolve) the current loop run — the ONE deterministic run-lifecycle step, NO model.
#
# Runs are namespaced under loop/runs/<run-id>/ so a new run never clobbers a finished one's evidence
# (a prior run's manifest + security report are process evidence worth preserving). `loop/latest` is the
# symlink every `loop/latest/…` path resolves through. Both spec-loop-preflight and spec-loop call this,
# so they never disagree about which run is current or how a run id is spelled.
#
# This owns only the MECHANICAL mint (deterministic: a monotonic counter + the configured date). The
# sync-vs-new-vs-clear DECISION stays with the orchestrator — it needs judgment (is loop/latest still
# mid-flight? did the user ask to clear?) that a script shouldn't make silently. See
# spec-loop-preflight → "Run lifecycle — sync, new, or clear".
#
# Usage:
#   mint-run.sh              mint a fresh run-<n>-<date>, repoint loop/latest, print the run id
#   mint-run.sh --if-absent  if loop/latest already exists, print the current run id and mint NOTHING;
#                            else mint one. Lets spec-loop resolve the run standalone without ever
#                            clobbering an in-flight run.
#
# Prints the run id (e.g. run-2-2026-07-01) to stdout.
set -uo pipefail

# Resolve this script's dir (to reach loop-now.sh) BEFORE any cd, then run from the repo root so
# loop/runs and loop/latest resolve there regardless of the caller's cwd (same idiom as loop-status.sh).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

# --if-absent: resolve (don't mint) when a run already exists — never re-mint over an in-flight pointer.
if [ "${1:-}" = --if-absent ] && { [ -L loop/latest ] || [ -d loop/latest ]; }; then
  basename "$(readlink loop/latest 2>/dev/null || echo loop/latest)"
  exit 0
fi

# Deterministic run id: a monotonic counter over existing runs + the canonical date (loop-now.sh).
N=$(( $(ls -d loop/runs/run-* 2>/dev/null | wc -l) + 1 ))
RUN="run-$N-$(bash "$SCRIPT_DIR/loop-now.sh" | cut -d' ' -f1)"   # e.g. run-2-2026-07-01
mkdir -p "loop/runs/$RUN/artifacts"
ln -sfn "runs/$RUN" loop/latest                                 # the current-run pointer loop/latest/… resolves through
echo "$RUN"
