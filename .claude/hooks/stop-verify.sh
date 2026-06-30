#!/usr/bin/env bash
# Stop hook — runs the CLAUDE.md verification trio when any Dart file was
# modified in this session. Blocks stop (feeding issues back to Claude) until
# dart format is idempotent and flutter analyze is zero-issue.
#
# Outputs JSON on stdout with {"decision":"block","reason":"..."} to block.
# Plain exit 0 allows stop.
# Kill switch: CHORD_DICE_HOOKS_OFF=1.

set -uo pipefail
[[ "${CHORD_DICE_HOOKS_OFF:-}" == "1" ]] && exit 0

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
session_dir="$project_dir/.claude/.session"
edit_log="$session_dir/edited-dart-files.txt"

# Nothing to verify if no Dart edits happened this session.
[[ ! -s "$edit_log" ]] && exit 0

# Read payload — if stop_hook_active, allow to avoid loops.
payload=$(cat)
if python3 - "$payload" <<'PY' 2>/dev/null
import json, sys
try: d = json.loads(sys.argv[1])
except Exception: sys.exit(1)
sys.exit(0 if d.get("stop_hook_active") else 1)
PY
then
  rm -f "$edit_log"
  exit 0
fi

# Skip if flutter is not on PATH (e.g., running in a constrained env).
if ! command -v flutter >/dev/null 2>&1; then
  exit 0
fi

cd "$project_dir"

issues=""

# Check 1 — dart format (read-only, --set-exit-if-changed).
if ! dart format --set-exit-if-changed --output=none lib test >/dev/null 2>&1; then
  issues+="• Dart files need formatting. Run: dart format lib test"$'\n'
fi

# Check 2 — flutter analyze.
analyze_out=$(flutter analyze 2>&1 || true)
if ! printf '%s' "$analyze_out" | grep -q "No issues found"; then
  # Trim the output to keep the feedback compact.
  trimmed=$(printf '%s' "$analyze_out" | tail -60)
  issues+="• flutter analyze reported issues:"$'\n'"$trimmed"$'\n'
fi

if [[ -n "$issues" ]]; then
  python3 - "$issues" <<'PY'
import json, sys
print(json.dumps({
    "decision": "block",
    "reason": (
        "Stop blocked by .claude/hooks/stop-verify.sh — CLAUDE.md requires a clean "
        "verification trio before a task is called done.\n\n"
        f"{sys.argv[1]}\n"
        "Fix these and try again. Kill switch (for emergencies): CHORD_DICE_HOOKS_OFF=1."
    ),
}))
PY
  exit 0
fi

# All clean — reset the session log.
rm -f "$edit_log"
exit 0
