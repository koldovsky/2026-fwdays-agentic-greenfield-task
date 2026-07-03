#!/usr/bin/env bash
# UserPromptSubmit hook: inject the plan-first rule so every turn treats
# docs/current-state.md as the persistent plan + cross-session memory.

cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"PLAN-FIRST (docs/current-state.md): that file is the persistent plan and cross-session memory. For any non-trivial task: (1) read it first; (2) write the plan there BEFORE implementing — concrete numbered steps under '## Next steps' (or a '## Plan' subsection), with requirement IDs; (3) implement following that plan, updating steps as they complete; (4) before finishing, refresh Last action (ISO date), Working on, Next steps, Blockers. Trivial Q&A turns are exempt."}}
EOF
