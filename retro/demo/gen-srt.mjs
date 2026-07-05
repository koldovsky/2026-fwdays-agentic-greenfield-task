// Captions from out/audio/timings.json — same source as narration → no desync.
// Emits out/captions.srt (distribution sidecar; burned captions are PNG overlays,
// see gen-captions.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
const timings = JSON.parse(readFileSync(new URL('out/audio/timings.json', import.meta.url), 'utf8'));

const pad = (n, w = 2) => String(n).padStart(w, '0');
const srtTime = (s) =>
  `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(Math.floor(s % 60))},${pad(Math.round((s % 1) * 1000), 3)}`;

let srt = '';
timings.forEach((t, i) => {
  srt += `${i + 1}\n${srtTime(t.start + 0.15)} --> ${srtTime(t.start + t.duration - 0.15)}\n${t.caption}\n\n`;
});
writeFileSync(new URL('out/captions.srt', import.meta.url), srt);
console.log(`captions.srt — ${timings.length} cues`);
