#!/usr/bin/env bash
# Mirror canonical skills (.agents/skills) into each agent's skills directory.
# Edit skills in .agents/skills/, then run this to propagate.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$root/.agents/skills"

# Add more agent skill directories here as you adopt other tools.
targets=("$root/.claude/skills")

for dest in "${targets[@]}"; do
  rm -rf "$dest"
  mkdir -p "$dest"
  cp -r "$src"/. "$dest"/
  echo "synced .agents/skills -> $dest"
done
