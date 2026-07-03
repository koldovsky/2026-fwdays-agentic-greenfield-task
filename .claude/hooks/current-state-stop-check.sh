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

# Handoff itself touched (unstaged, staged, or untracked) — fine.
printf '%s' "$changes" | grep -q "docs/current-state.md" && exit 0

cat <<'EOF'
{"decision": "block", "reason": "Working tree has changes but docs/current-state.md was not updated. Per AGENTS.md plan-first rule: update the handoff now — Last action (ISO date), Working on (FR/NFR/TC/BC ids), Next steps (revise the plan if it changed), Blockers. If this turn was trivial and changed nothing meaningful, add one Last-action line and stop."}
EOF
