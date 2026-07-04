#!/usr/bin/env bash
# Assert deploy/cron-schedule-run.sh skips curl when the queue has no actionable jobs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WRAPPER="$ROOT/deploy/cron-schedule-run.sh"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

export COLIBRI_CRON_SECRET=test-secret
export COLIBRI_DATA_DIR="$TMPDIR"
export COLIBRI_PUBLIC_URL=http://127.0.0.1:9

assert_no_curl() {
  local name="$1" json="$2"
  echo "$json" > "$TMPDIR/scheduled-bookings.json"
  if "$WRAPPER" 2>/dev/null; then
    echo "PASS  $name — exited 0 without curl"
  else
    echo "FAIL  $name — expected exit 0, got $?" >&2
    exit 1
  fi
}

assert_curl_attempted() {
  local name="$1" json="$2"
  echo "$json" > "$TMPDIR/scheduled-bookings.json"
  if "$WRAPPER" 2>/dev/null; then
    echo "FAIL  $name — expected curl failure (non-zero), got 0" >&2
    exit 1
  else
    echo "PASS  $name — curl attempted (connection refused)"
  fi
}

assert_no_curl "empty queue" '[]'
assert_no_curl "all completed" \
  '[{"status":"completed","opensAt":"2026-07-04T00:00:00Z"},{"status":"completed","opensAt":"2026-07-04T00:00:00Z"}]'
assert_no_curl "all failed" '[{"status":"failed","opensAt":"2026-07-04T00:00:00Z"}]'
assert_no_curl "future waiting only" '[{"status":"waiting","opensAt":"2099-01-01T00:00:00Z"}]'
assert_no_curl "completed + future waiting" \
  '[{"status":"completed","opensAt":"2026-07-04T00:00:00Z"},{"status":"waiting","opensAt":"2099-01-01T00:00:00Z"}]'

rm -f "$TMPDIR/scheduled-bookings.json"
assert_no_curl "missing data file" ''

assert_curl_attempted "ready job" '[{"status":"ready","opensAt":"2026-07-04T00:00:00Z"}]'
assert_curl_attempted "waiting job due" '[{"status":"waiting","opensAt":"2020-01-01T00:00:00Z"}]'

echo "All cron wrapper checks passed."
