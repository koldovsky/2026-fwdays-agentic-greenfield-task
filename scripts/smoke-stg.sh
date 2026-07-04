#!/usr/bin/env bash
# Post-deploy smoke tests for Colibri Book STG.
# Validates public + authenticated read APIs (and live availability when not --quick).
#
# Usage:
#   ./scripts/smoke-stg.sh
#   ./scripts/smoke-stg.sh --quick          # skip slow Playwright availability scrape
#   COLIBRI_STG_URL=http://localhost:3000 ./scripts/smoke-stg.sh
#
# Requires: curl, python3, credentials in .secret (or COLIBRI_SECRET_FILE).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRET_FILE="${COLIBRI_SECRET_FILE:-$ROOT/.secret}"
BASE_URL="${COLIBRI_STG_URL:-http://colibri.64.225.115.88.nip.io}"
QUICK=false
COOKIE_JAR="$(mktemp /tmp/colibri-smoke-cookies.XXXXXX)"
trap 'rm -f "$COOKIE_JAR"' EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick) QUICK=true; shift ;;
    --base-url)
      BASE_URL="${2:?--base-url requires a URL}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

BASE_URL="${BASE_URL%/}"

if [[ ! -f "$SECRET_FILE" ]]; then
  echo "Missing secret file: $SECRET_FILE" >&2
  exit 1
fi

read_secret() {
  grep "^${1}=" "$SECRET_FILE" | head -1 | cut -d= -f2- || true
}

USER_NAME="$(read_secret user.username)"
USER_PASS="$(read_secret user.password)"
ADMIN_NAME="$(read_secret admin.username)"
ADMIN_PASS="$(read_secret admin.password)"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "  PASS  $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "  FAIL  $1" >&2
  [[ -n "${2:-}" ]] && echo "        $2" >&2
}

# check <label> <method> <path> <expected_status> [curl_extra...]
check() {
  local label="$1" method="$2" path="$3" expected="$4"
  shift 4
  local url="${BASE_URL}${path}"
  local body_file status

  body_file="$(mktemp)"
  if [[ "$method" == "GET" ]]; then
    status=$(curl -sS -o "$body_file" -w '%{http_code}' "$url" "$@")
  else
    status=$(curl -sS -o "$body_file" -w '%{http_code}' -X "$method" "$url" "$@")
  fi

  if [[ "$status" != "$expected" ]]; then
    fail "$label" "HTTP $status (expected $expected): $(head -c 200 "$body_file")"
    rm -f "$body_file"
    return 1
  fi

  echo "$body_file"
}

assert_json() {
  local label="$1" body_file="$2" python_expr="$3"
  if python3 -c "
import json, sys
data = json.load(open('$body_file'))
if not ($python_expr):
    print(json.dumps(data)[:300], file=sys.stderr)
    sys.exit(1)
" 2>/dev/null; then
    pass "$label"
    return 0
  else
    fail "$label" "$(python3 -c "import json; print(json.dumps(json.load(open('$body_file')))[:300])" 2>/dev/null || cat "$body_file")"
    return 1
  fi
}

echo "==> Smoke tests against ${BASE_URL}"
echo ""

# --- Public read APIs ---
body=$(check "GET /api/health" GET /api/health 200) || true
[[ -n "${body:-}" ]] && assert_json "health payload" "$body" "data.get('status') == 'ok' and data.get('app') == 'colibri-book'" || true
[[ -n "${body:-}" ]] && assert_json "health submitMode live" "$body" "data.get('submitMode') == 'live'" || true
rm -f "${body:-}"

body=$(check "GET /api/auth/me (anonymous)" GET /api/auth/me 401) || true
[[ -n "${body:-}" ]] && assert_json "me anonymous null user" "$body" "data.get('user') is None" || true
rm -f "${body:-}"

# --- Auth (write, required for read tests) ---
bad_login=$(mktemp)
status=$(curl -sS -o "$bad_login" -w '%{http_code}' -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"invalid","password":"invalid"}')
if [[ "$status" == "401" ]]; then
  pass "POST /api/auth/login rejects bad credentials"
else
  fail "POST /api/auth/login rejects bad credentials" "HTTP $status"
fi
rm -f "$bad_login"

login_body=$(mktemp)
status=$(curl -sS -o "$login_body" -w '%{http_code}' -c "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${USER_NAME}\",\"password\":\"${USER_PASS}\"}")
if [[ "$status" == "200" ]]; then
  if python3 -c "import json; d=json.load(open('$login_body')); exit(0 if d.get('user',{}).get('username')=='$USER_NAME' else 1)" 2>/dev/null; then
    pass "POST /api/auth/login (user)"
  else
    fail "POST /api/auth/login (user)" "unexpected body: $(head -c 200 "$login_body")"
  fi
else
  fail "POST /api/auth/login (user)" "HTTP $status: $(head -c 200 "$login_body")"
fi
rm -f "$login_body"

# --- Authenticated read APIs ---
body=$(check "GET /api/auth/me (user)" GET /api/auth/me 200 -b "$COOKIE_JAR") || true
[[ -n "${body:-}" ]] && assert_json "me returns logged-in user" "$body" "data.get('user', {}).get('username') == '$USER_NAME'" || true
rm -f "${body:-}"

body=$(check "GET /api/booking/schedule" GET /api/booking/schedule 200 -b "$COOKIE_JAR") || true
[[ -n "${body:-}" ]] && assert_json "schedule list is array" "$body" "isinstance(data.get('jobs'), list)" || true
if [[ -n "${body:-}" && -f "$ROOT/data/scheduled-bookings.json" ]]; then
  if python3 -c "
import json
local = json.load(open('$ROOT/data/scheduled-bookings.json'))
remote = json.load(open('$body'))
ids = {j['id'] for j in remote.get('jobs', [])}
missing = [j['id'] for j in local if j['id'] not in ids]
if missing:
    print('missing job ids:', missing[:3], file=__import__('sys').stderr)
    raise SystemExit(1)
" 2>/dev/null; then
    pass "scheduled jobs synced from local data"
  else
    fail "scheduled jobs synced from local data" "local jobs not found on server"
  fi
fi
rm -f "${body:-}"

body=$(check "GET /api/booking/confirmed" GET /api/booking/confirmed 200 -b "$COOKIE_JAR") || true
[[ -n "${body:-}" ]] && assert_json "confirmed bookings list" "$body" "isinstance(data.get('bookings'), list)" || true
rm -f "${body:-}"

body=$(check "GET /book page" GET /book 200 -b "$COOKIE_JAR") || true
if [[ -n "${body:-}" ]] && grep -q "Book outdoor activity" "$body" 2>/dev/null; then
  pass "book page renders"
else
  fail "book page renders" "missing expected heading"
fi
rm -f "${body:-}"

body=$(check "GET /bookings page" GET /bookings 200 -b "$COOKIE_JAR") || true
if [[ -n "${body:-}" ]] && grep -q "My bookings" "$body" 2>/dev/null; then
  pass "bookings page renders"
else
  fail "bookings page renders" "missing expected heading"
fi
rm -f "${body:-}"

body=$(check "GET /scheduled page" GET /scheduled 200 -b "$COOKIE_JAR") || true
if [[ -n "${body:-}" ]] && grep -q "Scheduled bookings" "$body" 2>/dev/null; then
  pass "scheduled page renders"
else
  fail "scheduled page renders" "missing expected heading"
fi
rm -f "${body:-}"

# --- Admin read API ---
admin_jar="$(mktemp /tmp/colibri-smoke-admin.XXXXXX)"
admin_login=$(mktemp)
status=$(curl -sS -o "$admin_login" -w '%{http_code}' -c "$admin_jar" -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_NAME}\",\"password\":\"${ADMIN_PASS}\"}")
if [[ "$status" == "200" ]]; then
  pass "POST /api/auth/login (admin)"
  body=$(check "GET /api/admin/users" GET /api/admin/users 200 -b "$admin_jar") || true
  [[ -n "${body:-}" ]] && assert_json "admin users list" "$body" "isinstance(data.get('users'), list) and len(data.get('users', [])) >= 1" || true
  rm -f "${body:-}"
else
  fail "POST /api/auth/login (admin)" "HTTP $status"
fi
rm -f "$admin_login" "$admin_jar"

# --- Live availability (Playwright + MHOA scrape) ---
if [[ "$QUICK" == "true" ]]; then
  echo ""
  echo "  SKIP  POST /api/booking/availability (--quick)"
else
  AVAIL_DATE="$(python3 -c "from datetime import date, timedelta; print((date.today() + timedelta(days=3)).isoformat())")"
  avail_body="$(mktemp)"
  echo ""
  echo "  ... POST /api/booking/availability (${AVAIL_DATE}, up to 120s) ..."
  status=$(curl -sS -o "$avail_body" -w '%{http_code}' --max-time 120 \
    -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/booking/availability" \
    -H 'Content-Type: application/json' \
    -d "{\"date\":\"${AVAIL_DATE}\"}")

  if [[ "$status" == "200" ]]; then
    if python3 -c "
import json, sys
d = json.load(open('$avail_body'))
ok = d.get('status') == 'ok' and isinstance(d.get('courts'), list) and len(d['courts']) >= 1
if not ok:
    print(json.dumps(d)[:400], file=sys.stderr)
sys.exit(0 if ok else 1)
" 2>/dev/null; then
      pass "POST /api/booking/availability (live scrape)"
    else
      fail "POST /api/booking/availability (live scrape)" "$(head -c 400 "$avail_body")"
    fi
  else
    fail "POST /api/booking/availability (live scrape)" "HTTP $status: $(head -c 400 "$avail_body")"
  fi
  rm -f "$avail_body"
fi

echo ""
echo "==> Results: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "Deploy smoke FAILED — fix before relying on STG." >&2
  exit 1
fi
echo "All smoke tests passed."
