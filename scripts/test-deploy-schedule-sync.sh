#!/usr/bin/env bash
# deploy-do.sh must not rsync an empty local scheduled-bookings.json (logic mirror).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data/scheduled-bookings.json"

should_sync() {
  python3 -c "
import json, sys
with open('$1', encoding='utf-8') as f:
    jobs = json.load(f)
sys.exit(0 if isinstance(jobs, list) and jobs else 1)
"
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

echo '[]' > "$tmpdir/empty.json"
echo '[{"id":"x","status":"ready"}]' > "$tmpdir/one.json"

if should_sync "$tmpdir/empty.json"; then
  echo "FAIL empty queue should not sync" >&2
  exit 1
fi
echo "PASS empty local queue — skip sync"

if ! should_sync "$tmpdir/one.json"; then
  echo "FAIL non-empty queue should sync" >&2
  exit 1
fi
echo "PASS non-empty local queue — sync allowed"

echo "All deploy schedule sync checks passed."
