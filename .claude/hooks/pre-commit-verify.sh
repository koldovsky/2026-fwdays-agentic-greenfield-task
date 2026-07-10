#!/usr/bin/env bash
# PreToolUse hook (Bash): quality gate — when the command contains
# `git commit`, run the full verify ritual first (format:check, lint,
# typecheck, fallow audit, test, build; see package.json). On failure
# the commit is blocked (exit 2) and the tail of the output is fed
# back to the agent.
set -u

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)

case "$cmd" in
  *"git commit"*)
    echo "verify gate: git commit detected — running 'npm run verify'" >&2
    if ! out=$(npm run verify 2>&1); then
      printf '%s\n' "$out" | tail -60 >&2
      echo "" >&2
      echo "BLOCKED: 'npm run verify' failed — fix the issues above, then retry the commit." >&2
      exit 2
    fi
    ;;
esac

exit 0
