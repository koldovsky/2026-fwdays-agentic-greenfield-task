#!/usr/bin/env bash
# SessionStart hook — emits project context and resets session state.

set -uo pipefail

# Reset per-session state (so a stale edit log from a crashed session does not
# trigger a spurious Stop block).
session_dir="${CLAUDE_PROJECT_DIR:-.}/.claude/.session"
rm -rf "$session_dir"

# Only emit context on full session starts, not resumes (best-effort; the
# payload contains a "source" field: "startup" | "resume" | "clear").
payload=$(cat 2>/dev/null || echo "{}")
source=$(python3 - "$payload" <<'PY' 2>/dev/null || echo "startup"
import json, sys
try: d = json.loads(sys.argv[1])
except Exception: sys.exit(0)
print(d.get("source", "startup"))
PY
)

if [[ "$source" == "resume" ]]; then
  exit 0
fi

cat <<'EOF'
[chord-dice project context]
  • CLAUDE.md is the source of truth for architecture & invariants — read before non-trivial work.
  • Symbol-aware code nav via Serena MCP (.serena/memories/ is populated — activate with skill serena:activate).
  • Design specs: docs/superpowers/specs/ — named in CLAUDE.md per subsystem.
  • Architectural audits: /deep-review.
  • Project agent: flutter-expert (.claude/agents/flutter-expert.md).
  • Verification trio (enforced by Stop hook): dart format lib test && flutter analyze && flutter test
  • Hook kill switch (emergency): export CHORD_DICE_HOOKS_OFF=1
EOF
