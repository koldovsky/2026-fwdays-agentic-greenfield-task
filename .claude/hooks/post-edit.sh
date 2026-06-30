#!/usr/bin/env bash
# PostToolUse observer for Edit|Write|MultiEdit.
# (a) Records edited Dart files to a session log so Stop can verify them.
# (b) Emits reminders when edits touch Riverpod annotations (codegen contract).
# Never blocks — always exit 0.

set -uo pipefail
[[ "${CHORD_DICE_HOOKS_OFF:-}" == "1" ]] && exit 0

payload=$(cat)

file_path=$(python3 - "$payload" <<'PY' 2>/dev/null || true
import json, sys
try: d = json.loads(sys.argv[1])
except Exception: sys.exit(0)
ti = d.get("tool_input", {}) or {}
print(ti.get("file_path", "") or "")
PY
)

new_text=$(python3 - "$payload" <<'PY' 2>/dev/null || true
import json, sys
try: d = json.loads(sys.argv[1])
except Exception: sys.exit(0)
t = d.get("tool_name")
ti = d.get("tool_input", {}) or {}
if t == "Write":
    print(ti.get("content", "") or "")
elif t == "Edit":
    print(ti.get("new_string", "") or "")
elif t == "MultiEdit":
    print("\n".join(e.get("new_string","") for e in ti.get("edits",[]) if isinstance(e,dict)))
PY
)

# Record Dart-file touches for Stop verification.
if [[ "$file_path" == *.dart && "$file_path" != *.g.dart ]]; then
  session_dir="${CLAUDE_PROJECT_DIR:-.}/.claude/.session"
  mkdir -p "$session_dir"
  echo "$file_path" >> "$session_dir/edited-dart-files.txt"
fi

# R7 — Riverpod annotation touched → remind to rebuild.
if [[ "$file_path" == *.dart ]] && printf '%s' "$new_text" | grep -Eq '@Riverpod\(|@riverpod\b'; then
  # Emit to stderr so Claude sees it as a post-tool notification.
  cat >&2 <<'EOF'
[post-edit · R7] Riverpod annotation touched in this edit.
Before calling the task done, run:
  dart run build_runner build --delete-conflicting-outputs
Otherwise the .g.dart part files drift out of sync and flutter analyze will fail.
EOF
fi

exit 0
