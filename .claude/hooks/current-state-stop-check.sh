#!/usr/bin/env bash
# Stop hook: if the working tree changed but docs/current-state.md was not
# updated, block the stop once and ask for a handoff update (AGENTS.md rule).

input=$(cat)

# Already continued from a stop-hook block once — don't loop.
if printf '%s' "$input" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

changes=$(git status --porcelain 2>/dev/null)
[ -z "$changes" ] && exit 0

# Blocking lint gate: if any changed file is code, lint must pass before Stop
# is allowed to proceed to the handoff-staleness check below.
if printf '%s' "$changes" | grep -qE '\.(ts|tsx|js|mjs)$'; then
  lint_output=$(yarn lint 2>&1)
  lint_status=$?
  if [ "$lint_status" -ne 0 ]; then
    tail_output=$(printf '%s' "$lint_output" | tail -n 15)
    reason=$(printf 'yarn lint failed (exit %s) — fix lint errors before finishing.\n\nLast ~15 lines of eslint output:\n%s' "$lint_status" "$tail_output" | jq -Rs .)
    printf '{"decision":"block","reason":%s}\n' "$reason"
    exit 0
  fi
fi

# Handoff itself touched (unstaged, staged, or untracked) — fine.
printf '%s' "$changes" | grep -q "docs/current-state.md" && exit 0

cat <<'EOF'
{"decision": "block", "reason": "Working tree has changes but docs/current-state.md was not updated. Per AGENTS.md plan-first rule: update the handoff now — Last action (ISO date), Working on (FR/NFR/TC/BC ids), Next steps (revise the plan if it changed), Blockers. If this turn was trivial and changed nothing meaningful, add one Last-action line and stop."}
EOF
