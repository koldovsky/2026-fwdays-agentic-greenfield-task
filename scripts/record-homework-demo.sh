#!/usr/bin/env bash
# Record demo walkthrough + TTS narration → docs/demo-video/colibri-homework-demo.mp4
# Default: local stub server (fast, full booking flow). Set COLIBRI_STG_URL for STG.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/demo-video"
PORT="${COLIBRI_DEMO_PORT:-3001}"
BASE="${COLIBRI_STG_URL:-http://localhost:${PORT}}"
DEV_PID=""

cleanup() {
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

mkdir -p "$OUT" "$ROOT/data"
rm -f "$OUT"/*.webm "$OUT"/*.aiff "$OUT"/*.m4a "$OUT"/*.mp4 2>/dev/null || true

if [[ "$BASE" == http://127.0.0.1:* || "$BASE" == http://localhost:* ]]; then
  echo "==> Seeding local confirmed bookings…"
  "$ROOT/scripts/merge-confirmed-seed.sh" "$ROOT/data/confirmed-bookings.json" >/dev/null

  echo "==> Starting local dev server (stub mode) on :${PORT}…"
  (
    cd "$ROOT"
    export COLIBRI_SUBMIT_MODE=stub
    export COLIBRI_DATA_DIR="$ROOT/data"
    exec npm run dev -- -p "$PORT"
  ) &
  DEV_PID=$!

  for _ in $(seq 1 60); do
    if curl -sf "${BASE}/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  if ! curl -sf "${BASE}/api/health" >/dev/null 2>&1; then
    echo "Dev server did not become ready at ${BASE}" >&2
    exit 1
  fi
  echo "    Health OK ($(curl -s "${BASE}/api/health" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("submitMode","?"))'))"
fi

echo "==> Generating narration (macOS say)…"
NARRATION="$OUT/narration.txt"
cat > "$NARRATION" <<'TEXT'
Hi, I'm Max Bugaiov. This is Colibri Book for fwdays Agentic Engineering Greenfield.
It's a Mahogany HOA tennis concierge: pick players, choose a slot, and Colibri handles MHOA forms and captcha.
I'll log in, open Book, and schedule Nataliia for next Saturday — outside MHOA's seven-day window, so it goes to the queue.
On Scheduled, you see the job and when cron will retry in Calgary time.
My bookings shows confirmed reservations; back-to-back slots on the same court collapse into one time range.
Now I'll book Max for an open slot this week in demo mode — full wizard through to confirmation.
That's the full flow: Book, Scheduled, and My bookings. Built with OpenSpec, tests, and deploy-smoke loops. Thanks for watching.
TEXT

say -v Daniel -r 175 -o "$OUT/narration.aiff" -f "$NARRATION"
ffmpeg -y -i "$OUT/narration.aiff" -c:a aac -b:a 192k "$OUT/narration.m4a" 2>/dev/null
AUDIO_SEC="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/narration.m4a")"
echo "    Narration: ${AUDIO_SEC}s"

echo "==> Recording walkthrough (${BASE})…"
COLIBRI_STG_URL="$BASE" COLIBRI_DEMO_OUT="$OUT" \
  node --import tsx "$ROOT/scripts/record-homework-demo.ts"

VIDEO="$OUT/walkthrough.webm"
if [[ ! -f "$VIDEO" ]]; then
  VIDEO="$(ls -t "$OUT"/*.webm 2>/dev/null | head -1 || true)"
fi
if [[ -z "$VIDEO" || ! -f "$VIDEO" ]]; then
  echo "No video recorded." >&2
  exit 1
fi
VIDEO_SEC="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")"
echo "    Video: ${VIDEO_SEC}s"

echo "==> Muxing video + audio…"
ffmpeg -y \
  -i "$VIDEO" \
  -i "$OUT/narration.m4a" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -t "$AUDIO_SEC" \
  -movflags +faststart \
  "$OUT/colibri-homework-demo.mp4" 2>/dev/null

echo "==> Done: $OUT/colibri-homework-demo.mp4"
ls -lh "$OUT/colibri-homework-demo.mp4"
