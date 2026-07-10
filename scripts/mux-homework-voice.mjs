// Add Ukrainian voiceover to an existing homework-demo.webm (no browser re-record).
// Run: node scripts/mux-homework-voice.mjs
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  OUT_DIR,
  VOICE_SEGMENTS,
  muxVideoAudio,
  synthesizeVoice,
} from "./homework-demo-media.mjs";

const webmPath = join(OUT_DIR, "homework-demo.webm");
const audioPath = join(OUT_DIR, "homework-demo-voice.mp3");
const finalPath = join(OUT_DIR, "homework-demo-final.mp4");

if (!existsSync(webmPath)) {
  console.error(`missing ${webmPath} — run npm run qa:record-homework first`);
  process.exit(1);
}

await synthesizeVoice(VOICE_SEGMENTS, audioPath);
await muxVideoAudio(webmPath, audioPath, finalPath);
console.log(`wrote ${finalPath}`);
