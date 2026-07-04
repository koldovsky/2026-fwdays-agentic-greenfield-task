#!/usr/bin/env bash
# Merge deploy/seed-confirmed-bookings.json into a target store (upsert by runId).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$ROOT/data/confirmed-bookings.json}"
SEED="$ROOT/deploy/seed-confirmed-bookings.json"
LOCAL="$ROOT/data/confirmed-bookings.json"

args=("$TARGET" "$SEED")
if [[ -f "$LOCAL" && "$LOCAL" != "$TARGET" ]] && python3 -c "
import json, sys
with open('$LOCAL', encoding='utf-8') as f:
    d = json.load(f)
sys.exit(0 if isinstance(d, list) and d else 1)
" 2>/dev/null; then
  args+=("$LOCAL")
fi

python3 "$ROOT/scripts/merge-confirmed-bookings.py" "${args[@]}"
