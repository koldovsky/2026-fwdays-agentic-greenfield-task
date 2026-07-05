#!/usr/bin/env bash
# PreToolUse (Agent|Workflow): advisory nudge for the model-routing rule
# (AGENTS.md "Model routing"). NON-BLOCKING — never denies the call.
#
# Fires only when an Agent/Workflow dispatch omits `model` AND is not a `fork`
# (fork ignores `model` by design; omitting to inherit the session is a valid
# default). The reminder just asks the maker to confirm it graded complexity
# and inheriting the session tier is the deliberate choice, not an oversight.

input=$(cat)

tool=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null)
case "$tool" in
  Agent|Workflow) ;;
  *) exit 0 ;;
esac

# `model` explicitly set -> deliberate choice already made, stay quiet.
model=$(printf '%s' "$input" | jq -r '.tool_input.model // empty' 2>/dev/null)
[ -n "$model" ] && exit 0

# fork inherits the parent model and ignores `model` -> nothing to decide.
subtype=$(printf '%s' "$input" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null)
[ "$subtype" = "fork" ] && exit 0

reason="Model-routing reminder (AGENTS.md): this ${tool} call omits \`model\`, so it inherits the session tier. Confirm you graded task complexity — low->haiku, medium->sonnet, high->opus — and inheriting is deliberate, not an oversight. Omitting is fine when the session tier already matches; set \`model\` otherwise. (Advisory only, proceeding.)"

jq -n --arg r "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: $r
  }
}'
exit 0
