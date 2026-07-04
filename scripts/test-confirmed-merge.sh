#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/partial.json" <<'JSON'
[
  {
    "id": "90be6224-0e93-443b-8abe-4e5e3d6b9e34",
    "residentId": "max",
    "fullName": "Max Bugaiov",
    "email": "maxbugaiov@gmail.com",
    "facility": "Tennis Courts",
    "date": "2026-07-11",
    "court": "East Court",
    "slot": "09:00 AM-09:45 AM",
    "confirmedAt": "2026-07-04T02:03:11.516Z",
    "expiresAt": "2026-07-11T15:45:00.000Z",
    "runId": "live-1783130560932",
    "source": "scheduled",
    "mhoaApproved": true
  }
]
JSON

cp "$TMP/partial.json" "$TMP/merged.json"
python3 "$ROOT/scripts/merge-confirmed-bookings.py" "$TMP/merged.json" "$ROOT/deploy/seed-confirmed-bookings.json"

count="$(python3 -c "import json; print(len(json.load(open('$TMP/merged.json'))))")"
if [[ "$count" -ne 3 ]]; then
  echo "FAIL expected 3 bookings after seed merge, got $count" >&2
  exit 1
fi
python3 -c "
import json
runs = {b['runId'] for b in json.load(open('$TMP/merged.json'))}
assert 'live-1783129928043' in runs, 'Nataliia missing after merge'
"
echo "PASS confirmed seed merge restores missing bookings"
echo "All confirmed merge checks passed."
