#!/bin/sh
# Provision a fresh Komga instance for Edda's connector tests.
#
#   1. wait for Komga to answer
#   2. claim the server  -> creates the admin account (Komga's /api/v1/claim)
#   3. create a non-admin "reader" user (what the connector authenticates as)
#   4. create a library over the mounted ./test-epubs and let Komga scan it
#   5. wait until the expected number of books are indexed
#
# Every step checks current state first, so re-running against an already
# provisioned server is a no-op. POSIX sh (BusyBox) — no jq dependency.
set -eu

KOMGA_URL="${KOMGA_URL:-http://komga:25600}"
ADMIN_EMAIL="${KOMGA_ADMIN_EMAIL:-admin@edda.test}"
ADMIN_PASSWORD="${KOMGA_ADMIN_PASSWORD:-edda-admin-pw}"
USER_EMAIL="${KOMGA_USER_EMAIL:-reader@edda.test}"
USER_PASSWORD="${KOMGA_USER_PASSWORD:-edda-reader-pw}"
LIBRARY_NAME="${KOMGA_LIBRARY_NAME:-Test EPUBs}"
LIBRARY_ROOT="${KOMGA_LIBRARY_ROOT:-/data/books}"
EXPECTED_BOOKS="${KOMGA_EXPECTED_BOOKS:-2}"

log() { echo "[provision] $*"; }

# --- 1. wait for Komga to answer the (public) claim endpoint -----------------
log "waiting for Komga at $KOMGA_URL ..."
i=0
until curl -fsS -o /dev/null "$KOMGA_URL/api/v1/claim"; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    log "ERROR: Komga did not become ready within ~120s"
    exit 1
  fi
  sleep 2
done
log "Komga is up."

# --- 2. claim the server (creates the admin) ---------------------------------
if curl -fsS "$KOMGA_URL/api/v1/claim" | grep -q '"isClaimed":true'; then
  log "server already claimed; leaving admin account as-is."
else
  log "claiming server -> admin '$ADMIN_EMAIL'"
  curl -fsS -o /dev/null -X POST "$KOMGA_URL/api/v1/claim" \
    -H "X-Komga-Email: $ADMIN_EMAIL" \
    -H "X-Komga-Password: $ADMIN_PASSWORD"
  log "admin created."
fi

AUTH="$ADMIN_EMAIL:$ADMIN_PASSWORD"

# --- 3. create the non-admin reader test user -------------------------------
if curl -fsS -u "$AUTH" "$KOMGA_URL/api/v1/users" | grep -q "\"email\":\"$USER_EMAIL\""; then
  log "reader user '$USER_EMAIL' already exists."
else
  log "creating reader user '$USER_EMAIL' (roles: FILE_DOWNLOAD, PAGE_STREAMING)"
  curl -fsS -o /dev/null -X POST "$KOMGA_URL/api/v1/users" \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\",\"roles\":[\"FILE_DOWNLOAD\",\"PAGE_STREAMING\"]}"
  log "reader user created."
fi

# --- 4. create the library over the mounted EPUBs (creation triggers a scan) -
if curl -fsS -u "$AUTH" "$KOMGA_URL/api/v1/libraries" | grep -q "\"name\":\"$LIBRARY_NAME\""; then
  log "library '$LIBRARY_NAME' already exists; skipping create."
else
  log "creating library '$LIBRARY_NAME' at root '$LIBRARY_ROOT'"
  curl -fsS -o /dev/null -X POST "$KOMGA_URL/api/v1/libraries" \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$LIBRARY_NAME\",\"root\":\"$LIBRARY_ROOT\"}"
  log "library created; Komga is scanning it now."
fi

# --- 5. wait for the EPUBs to be indexed (best effort) -----------------------
log "waiting for $EXPECTED_BOOKS book(s) to be indexed ..."
count=0
i=0
while [ "$i" -lt 30 ]; do
  body=$(curl -fsS -u "$AUTH" "$KOMGA_URL/api/v1/books?size=1" || echo '')
  count=$(printf '%s' "$body" | sed -n 's/.*"totalElements":\([0-9][0-9]*\).*/\1/p')
  [ -n "$count" ] || count=0
  if [ "$count" -ge "$EXPECTED_BOOKS" ]; then
    break
  fi
  i=$((i + 1))
  sleep 2
done

if [ "$count" -ge "$EXPECTED_BOOKS" ]; then
  log "indexed $count book(s)."
else
  log "WARNING: expected $EXPECTED_BOOKS book(s), Komga reports $count so far (scan may still be running)."
fi

log "done. Komga is ready with $count book(s)."
log "  admin:  $ADMIN_EMAIL / $ADMIN_PASSWORD"
log "  reader: $USER_EMAIL / $USER_PASSWORD  <- use this in the connector"
log "  open the mapped host port (default http://localhost:25600)"
