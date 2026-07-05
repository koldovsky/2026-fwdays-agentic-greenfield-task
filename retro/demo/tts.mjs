// Phase 3 (PLAN.md): script.md → one narration clip per beat + out/audio/timings.json.
// Voice: macOS `say -v "Evan (Enhanced)"`. Respellings from the script.md TTS table are
// applied to narration text ONLY. Usage: node tts.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const VOICE = 'Evan (Enhanced)';
const RESPELL = [
  ['diff it', 'dihf it'],       // phrase-level first
  [/\bJSON\b/g, 'Jaysawn'],
];

const script = readFileSync(new URL('script.md', import.meta.url), 'utf8');
const AUDIO_DIR = new URL('out/audio/', import.meta.url).pathname;
mkdirSync(AUDIO_DIR, { recursive: true });

// parse beats: "## Beat <id> — title" … "- **Caption:** …" … "**Narration:**" + "> …" lines
const beats = [];
const sections = script.split(/^## Beat /m).slice(1);
for (const sec of sections) {
  const id = sec.match(/^(\S+)/)[1];
  const caption = sec.match(/\*\*Caption:\*\*\s*(.+)/)?.[1].trim();
  const narrMatch = sec.match(/\*\*Narration:\*\*\s*\n((?:>.*\n?)+)/);
  if (!narrMatch) { console.error(`beat ${id}: no narration — skipped`); continue; }
  const narration = narrMatch[1]
    .split('\n').map((l) => l.replace(/^>\s?/, '').trim()).filter(Boolean).join(' ')
    .replace(/[*_`]/g, ''); // strip markdown emphasis from spoken text
  beats.push({ id, caption, narration });
}

const timings = [];
let start = 0;
for (const b of beats) {
  let spoken = b.narration;
  for (const [from, to] of RESPELL) spoken = spoken.replaceAll(from, to);
  const aiff = `${AUDIO_DIR}${b.id}.aiff`;
  const mp3 = `${AUDIO_DIR}${b.id}.mp3`;
  execFileSync('say', ['-v', VOICE, '-o', aiff, spoken]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', aiff, '-b:a', '192k', mp3]);
  rmSync(aiff);
  const duration = parseFloat(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', mp3]).toString(),
  );
  timings.push({ id: b.id, caption: b.caption, start: +start.toFixed(3), duration: +duration.toFixed(3) });
  start += duration;
  console.log(`${b.id}\t${duration.toFixed(1)}s\t${b.narration.split(' ').length} words`);
}

writeFileSync(`${AUDIO_DIR}timings.json`, JSON.stringify(timings, null, 2));
console.log(`total: ${(start / 60).toFixed(1)} min across ${timings.length} beats → ${AUDIO_DIR}timings.json`);
