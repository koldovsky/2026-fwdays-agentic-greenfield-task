#!/usr/bin/env bash
# Build Colibri Book standalone bundle and deploy to DigitalOcean STG droplet.
# Usage: ./scripts/deploy-do.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_HOST="${DO_HOST:-64.225.115.88}"
DO_USER="${DO_USER:-root}"
DO_PASS="${DO_PASS:?Set DO_PASS for deploy (not stored in repo)}"
REMOTE_APP="/opt/colibri-book"
REMOTE_DATA="/var/lib/colibri-book"
STG_URL="http://colibri.${DO_HOST}.nip.io"
SSH="sshpass -p ${DO_PASS} ssh -o StrictHostKeyChecking=accept-new"
RSYNC="sshpass -p ${DO_PASS} rsync -az --delete -e \"ssh -o StrictHostKeyChecking=accept-new\""

if [[ ! -f .secret ]]; then
  echo "Missing .secret — copy .secret.example and set credentials." >&2
  exit 1
fi

echo "==> Building standalone bundle…"
npm ci --no-audit --no-fund
npm run build

STAGING="$ROOT/.deploy-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"

cp -R .next/standalone/. "$STAGING/"
mkdir -p "$STAGING/.next"
cp -R .next/static "$STAGING/.next/static"
cp -R public "$STAGING/public"
cp .secret "$STAGING/.secret"
chmod 600 "$STAGING/.secret"

# Standalone bundle omits playwright-core/browsers.json — required for live availability.
mkdir -p "$STAGING/node_modules/playwright-core"
cp node_modules/playwright-core/browsers.json "$STAGING/node_modules/playwright-core/browsers.json"

# Captcha OCR script + Python deps (not included in Next standalone output).
mkdir -p "$STAGING/scripts"
cp scripts/solve-captcha.py "$STAGING/scripts/solve-captcha.py"
cp requirements.txt "$STAGING/requirements.txt"

echo "==> Rsync app to ${DO_HOST}…"
sshpass -p "$DO_PASS" rsync -az --delete \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  "$STAGING/" "${DO_USER}@${DO_HOST}:${REMOTE_APP}/"

sshpass -p "$DO_PASS" rsync -az \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  "$ROOT/deploy/" "${DO_USER}@${DO_HOST}:${REMOTE_APP}/deploy/"

# Sync local scheduled jobs to STG data dir (app code deploy does not include data/).
if [[ -f "$ROOT/data/scheduled-bookings.json" ]]; then
  echo "==> Sync scheduled-bookings.json to ${DO_HOST}:${REMOTE_DATA}…"
  sshpass -p "$DO_PASS" rsync -az \
    -e "ssh -o StrictHostKeyChecking=accept-new" \
    "$ROOT/data/scheduled-bookings.json" "${DO_USER}@${DO_HOST}:${REMOTE_DATA}/scheduled-bookings.json"
  sshpass -p "$DO_PASS" ssh -o StrictHostKeyChecking=accept-new "${DO_USER}@${DO_HOST}" \
    "chown deploy:deploy ${REMOTE_DATA}/scheduled-bookings.json && chmod 644 ${REMOTE_DATA}/scheduled-bookings.json"
fi

CRON_SECRET="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
SESSION_SECRET="$(openssl rand -base64 32)"

echo "==> Remote configure…"
sshpass -p "$DO_PASS" ssh -o StrictHostKeyChecking=accept-new "${DO_USER}@${DO_HOST}" \
  "CRON_SECRET='${CRON_SECRET}' SESSION_SECRET='${SESSION_SECRET}' REMOTE_APP='${REMOTE_APP}' REMOTE_DATA='${REMOTE_DATA}' bash -s" <<'REMOTE'
set -euo pipefail

mkdir -p "$REMOTE_DATA" "$REMOTE_APP"
chown -R deploy:deploy "$REMOTE_APP" "$REMOTE_DATA"
chmod 600 "$REMOTE_APP/.secret"

if [[ -f /etc/colibri-book.env ]]; then
  EXISTING=$(grep '^COLIBRI_CRON_SECRET=' /etc/colibri-book.env | cut -d= -f2- || true)
  [[ -n "$EXISTING" ]] && CRON_SECRET="$EXISTING"
  EXISTING_SESSION=$(grep '^COLIBRI_SESSION_SECRET=' /etc/colibri-book.env | cut -d= -f2- || true)
  [[ -n "$EXISTING_SESSION" ]] && SESSION_SECRET="$EXISTING_SESSION"
fi

cat > /etc/colibri-book.env <<ENV
NODE_ENV=production
PORT=3002
HOSTNAME=127.0.0.1
COLIBRI_SUBMIT_MODE=live
COLIBRI_COOKIE_SECURE=false
COLIBRI_PUBLIC_URL=http://colibri.64.225.115.88.nip.io
COLIBRI_SESSION_SECRET=${SESSION_SECRET}
COLIBRI_CRON_SECRET=${CRON_SECRET}
COLIBRI_DATA_DIR=${REMOTE_DATA}
COLIBRI_SECRET_FILE=${REMOTE_APP}/.secret
PLAYWRIGHT_BROWSERS_PATH=${REMOTE_DATA}/browsers
ENV
chmod 640 /etc/colibri-book.env
chgrp deploy /etc/colibri-book.env

# Playwright Chromium for live MHOA availability + submit
BROWSER_DIR="${REMOTE_DATA}/browsers"
if [[ ! -d "${BROWSER_DIR}/chromium_headless_shell-1228" ]]; then
  cd /tmp && rm -rf pw-install && mkdir pw-install && cd pw-install
  npm init -y >/dev/null
  npm install playwright@1.61.1 --no-audit --no-fund
  npx playwright install-deps chromium
  PLAYWRIGHT_BROWSERS_PATH="${BROWSER_DIR}" npx playwright install chromium
  chown -R deploy:deploy "${BROWSER_DIR}"
fi
# browsers.json is shipped in rsync; backfill if missing (older deploys).
if [[ ! -f "$REMOTE_APP/node_modules/playwright-core/browsers.json" ]]; then
  cd /tmp && rm -rf pw-install && mkdir pw-install && cd pw-install
  npm init -y >/dev/null
  npm install playwright@1.61.1 --no-audit --no-fund
  cp node_modules/playwright-core/browsers.json "$REMOTE_APP/node_modules/playwright-core/browsers.json"
fi
# Fail deploy early if Chromium cannot launch (missing deps or browsers).
sudo -u deploy env PLAYWRIGHT_BROWSERS_PATH="${BROWSER_DIR}" \
  "${BROWSER_DIR}/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell" --version >/dev/null

# Python captcha OCR (ddddocr) for live MHOA submit
if ! python3 -c "import ddddocr" 2>/dev/null; then
  pip3 install -r "$REMOTE_APP/requirements.txt" --break-system-packages
fi
python3 -c "import ddddocr"

cp "$REMOTE_APP/deploy/colibri-book.service" /etc/systemd/system/colibri-book.service
systemctl daemon-reload
systemctl enable colibri-book
systemctl restart colibri-book
sleep 4
systemctl is-active colibri-book

cp "$REMOTE_APP/deploy/nginx-colibri-book.conf" /etc/nginx/sites-available/colibri-book
ln -sf /etc/nginx/sites-available/colibri-book /etc/nginx/sites-enabled/colibri-book
nginx -t
systemctl reload nginx

chmod +x "$REMOTE_APP/deploy/cron-schedule-run.sh"
sed "s|@CRON_SECRET@|${CRON_SECRET}|g" "$REMOTE_APP/deploy/colibri-schedule.cron" > /etc/cron.d/colibri-book
chmod 644 /etc/cron.d/colibri-book

touch /var/log/colibri-schedule.log
chown deploy:deploy /var/log/colibri-schedule.log

echo "CRON_SECRET=${CRON_SECRET}"
REMOTE

echo "==> Post-deploy smoke tests…"
chmod +x "$ROOT/scripts/smoke-stg.sh"
"$ROOT/scripts/smoke-stg.sh" --base-url "$STG_URL"
echo ""
echo "Done: ${STG_URL}"
