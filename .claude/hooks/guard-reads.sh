#!/usr/bin/env bash
# PreToolUse guard for Read.
# Denies reading into build artifact directories — saves context and enforces
# the gitignore policy at the tool layer.
# Kill switch: CHORD_DICE_HOOKS_OFF=1.

set -uo pipefail
[[ "${CHORD_DICE_HOOKS_OFF:-}" == "1" ]] && exit 0

payload=$(cat)

file_path=$(python3 - "$payload" <<'PY' 2>/dev/null || true
import json, sys
try:
    d = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)
ti = d.get("tool_input", {}) or {}
print(ti.get("file_path", "") or "")
PY
)

[[ -z "$file_path" ]] && exit 0

case "$file_path" in
  */.dart_tool/*|*/build/*|*/.pub-cache/*|*/.worktrees/*|*/ios/Pods/*|*/ios/.symlinks/*|*/android/.gradle/*)
    echo "BLOCKED (R12): $file_path is inside a build artifact / worktree / platform cache directory. These are gitignored and produce noisy tool results. Read under lib/, test/, docs/, ios/Runner/, or android/app/src/ instead. Kill switch: CHORD_DICE_HOOKS_OFF=1." >&2
    exit 2
    ;;
esac

exit 0
