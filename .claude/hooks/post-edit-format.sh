#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): format the edited file with prettier,
# then lint-fix it with eslint. Unfixable eslint errors are fed back to
# the agent via exit code 2 so they get fixed immediately.
set -u

f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)
[ -n "$f" ] && [ -f "$f" ] || exit 0

npx prettier --write --ignore-unknown --log-level warn "$f" >/dev/null 2>&1

case "$f" in
  *.ts | *.mts | *.cts | *.js | *.mjs | *.cjs)
    if ! out=$(npx eslint --fix --no-warn-ignored "$f" 2>&1); then
      printf '%s\n' "$out" >&2
      exit 2
    fi
    ;;
esac

exit 0
