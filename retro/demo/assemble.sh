#!/usr/bin/env bash
# Phase 4 (PLAN.md): per-beat segments → concat → two committed deliverables:
#   out/video.mp4       — captions burned in (muted-playback / distribution cut)
#   out/video-nocap.mp4 — caption-free (live-presentation cut)
# Inputs: out/audio (tts.mjs), out/slides (capture.mjs), out/video (autopilot.mjs).
# No libass/drawtext in this ffmpeg build → captions are Playwright-rendered PNGs
# (gen-captions.mjs) applied as one overlay per segment (a single 16-overlay pass
# over the full video was prohibitively slow).
set -euo pipefail
cd "$(dirname "$0")"

AUD=out/audio SL=out/slides VID=out/video CAP=out/captions SEG=out/segments
mkdir -p "$SEG"
ENC=(-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 44100)

dur() { node -p "JSON.parse(require('fs').readFileSync('$AUD/timings.json','utf8')).find(t=>t.id==='$1').duration"; }

node gen-srt.mjs
node gen-captions.mjs

echo "— still segments"
for id in I.1 I.2 I.3 I.4 III.1 III.2 C.1; do
  D=$(dur "$id")
  ffmpeg -v error -y -loop 1 -framerate 30 -t "$D" -i "$SL/$id.png" -i "$AUD/$id.mp3" \
    "${ENC[@]}" -t "$D" "$SEG/nocap-$id.mp4"
  ffmpeg -v error -y -loop 1 -framerate 30 -t "$D" -i "$SL/$id.png" \
    -loop 1 -framerate 30 -t "$D" -i "$CAP/$id.png" -i "$AUD/$id.mp3" \
    -filter_complex "[0:v][1:v]overlay[v]" -map '[v]' -map 2:a \
    "${ENC[@]}" -t "$D" "$SEG/$id.mp4"
done

echo "— animated segments (Act IV)"
for id in IV.1 IV.2 IV.3 IV.4; do
  D=$(dur "$id")
  ffmpeg -v error -y -i "$SL/$id.webm" -i "$AUD/$id.mp3" -map 0:v -map 1:a \
    "${ENC[@]}" -t "$D" "$SEG/nocap-$id.mp4"
  ffmpeg -v error -y -i "$SL/$id.webm" \
    -loop 1 -framerate 30 -t "$D" -i "$CAP/$id.png" -i "$AUD/$id.mp3" \
    -filter_complex "[0:v][1:v]overlay[v]" -map '[v]' -map 2:a \
    "${ENC[@]}" -t "$D" "$SEG/$id.mp4"
done

echo "— Act II (live take)"
OFF2=$(node -p "JSON.parse(require('fs').readFileSync('$VID/act2-meta.json','utf8')).offset")
DUR2=$(node -p "['II.1','II.2','II.3','II.4'].reduce((a,id)=>a+JSON.parse(require('fs').readFileSync('$AUD/timings.json','utf8')).find(t=>t.id===id).duration,0)")
FILTER2=$(node -p "
const t=JSON.parse(require('fs').readFileSync('$AUD/timings.json','utf8'));
const ids=['II.1','II.2','II.3','II.4']; let cum=0, prev='0:v', g=[];
ids.forEach((id,i)=>{ const d=t.find(x=>x.id===id).duration;
  const out=i===ids.length-1?'v':'v'+i;
  g.push(\`[\${prev}][\${i+1}:v]overlay=enable='between(t,\${(cum+0.15).toFixed(2)},\${(cum+d-0.15).toFixed(2)})'[\${out}]\`);
  prev=out; cum+=d; });
g.join(';')")
cat > "$SEG/act2-audio.txt" <<EOF
file '../audio/II.1.mp3'
file '../audio/II.2.mp3'
file '../audio/II.3.mp3'
file '../audio/II.4.mp3'
EOF
ffmpeg -v error -y -f concat -safe 0 -i "$SEG/act2-audio.txt" -c:a aac -b:a 192k "$SEG/act2-audio.m4a"
ffmpeg -v error -y -ss "$OFF2" -i "$VID/act2.webm" -i "$SEG/act2-audio.m4a" \
  -map 0:v -map 1:a "${ENC[@]}" -t "$DUR2" "$SEG/nocap-II.mp4"
ffmpeg -v error -y -ss "$OFF2" -i "$VID/act2.webm" \
  -loop 1 -framerate 30 -t "$DUR2" -i "$CAP/II.1.png" \
  -loop 1 -framerate 30 -t "$DUR2" -i "$CAP/II.2.png" \
  -loop 1 -framerate 30 -t "$DUR2" -i "$CAP/II.3.png" \
  -loop 1 -framerate 30 -t "$DUR2" -i "$CAP/II.4.png" \
  -i "$SEG/act2-audio.m4a" \
  -filter_complex "$FILTER2" -map '[v]' -map 5:a "${ENC[@]}" -t "$DUR2" "$SEG/II.mp4"

echo "— Act III.3 (live take)"
OFF3=$(node -p "JSON.parse(require('fs').readFileSync('$VID/act3-meta.json','utf8')).offset")
D3=$(dur III.3)
ffmpeg -v error -y -ss "$OFF3" -i "$VID/act3.webm" -i "$AUD/III.3.mp3" \
  -map 0:v -map 1:a "${ENC[@]}" -t "$D3" "$SEG/nocap-III.3.mp4"
ffmpeg -v error -y -ss "$OFF3" -i "$VID/act3.webm" \
  -loop 1 -framerate 30 -t "$D3" -i "$CAP/III.3.png" -i "$AUD/III.3.mp3" \
  -filter_complex "[0:v][1:v]overlay[v]" -map '[v]' -map 2:a \
  "${ENC[@]}" -t "$D3" "$SEG/III.3.mp4"

echo "— concat"
ORDER=(I.1 I.2 I.3 I.4 II III.1 III.2 III.3 IV.1 IV.2 IV.3 IV.4 C.1)
: > "$SEG/list.txt"; : > "$SEG/list-nocap.txt"
for id in "${ORDER[@]}"; do
  echo "file '$id.mp4'" >> "$SEG/list.txt"
  echo "file 'nocap-$id.mp4'" >> "$SEG/list-nocap.txt"
done
ffmpeg -v error -y -f concat -safe 0 -i "$SEG/list.txt" -c copy out/video.mp4
ffmpeg -v error -y -f concat -safe 0 -i "$SEG/list-nocap.txt" -c copy out/video-nocap.mp4

for f in out/video.mp4 out/video-nocap.mp4; do
  ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f" |
    xargs printf "DONE → %s (%ss)\n" "$f"
done
