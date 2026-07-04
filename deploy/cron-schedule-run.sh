#!/usr/bin/env bash
# Run scheduled MHOA bookings only when the queue has non-terminal jobs.
# Installed by deploy-do.sh; invoked from /etc/cron.d/colibri-book.

set -euo pipefail

ENV_FILE="${COLIBRI_ENV_FILE:-/etc/colibri-book.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DATA_FILE="${COLIBRI_DATA_DIR:-/var/lib/colibri-book}/scheduled-bookings.json"
BASE_URL="${COLIBRI_PUBLIC_URL:-http://127.0.0.1:3002}"
CRON_SECRET="${COLIBRI_CRON_SECRET:-}"

if [[ -z "$CRON_SECRET" ]]; then
  echo "cron-schedule-run: COLIBRI_CRON_SECRET not set" >&2
  exit 1
fi

if [[ ! -f "$DATA_FILE" ]]; then
  exit 0
fi

needs_run="$(python3 - "$DATA_FILE" <<'PY'
import json
import sys
from datetime import datetime, timezone

path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as f:
        jobs = json.load(f)
except (OSError, json.JSONDecodeError):
    sys.exit(0)

if not isinstance(jobs, list) or not jobs:
    sys.exit(0)

now = datetime.now(timezone.utc)
active = {"waiting", "ready", "running"}

for job in jobs:
    if not isinstance(job, dict):
        continue
    status = job.get("status")
    if status not in active:
        continue
    if status in ("ready", "running"):
        print("1")
        sys.exit(0)
    opens_at = job.get("opensAt")
    if not opens_at:
        print("1")
        sys.exit(0)
    try:
        opens = datetime.fromisoformat(str(opens_at).replace("Z", "+00:00"))
    except ValueError:
        print("1")
        sys.exit(0)
    if opens <= now:
        print("1")
        sys.exit(0)

sys.exit(0)
PY
)" || true

if [[ "$needs_run" != "1" ]]; then
  exit 0
fi

curl -fsS -X POST \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "${BASE_URL}/api/booking/schedule/run"
