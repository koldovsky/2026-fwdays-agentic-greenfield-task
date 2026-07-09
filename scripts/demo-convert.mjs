// Transcode the newest Playwright capture (test-results/**/video.webm) to
// public/demo.mp4 so Remotion's staticFile("demo.mp4") can embed it.
// Requires ffmpeg on PATH (brew install ffmpeg). Run via `yarn demo:convert`.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RESULTS = "test-results";
const OUT_DIR = "public";
const OUT = join(OUT_DIR, "demo.mp4");

/** Recursively collect every *.webm under a directory. */
function findWebm(dir) {
  const hits = [];
  if (!existsSync(dir)) return hits;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) hits.push(...findWebm(p));
    else if (entry.name.endsWith(".webm")) hits.push(p);
  }
  return hits;
}

const clips = findWebm(RESULTS);
if (clips.length === 0) {
  console.error(
    `No .webm under ${RESULTS}/. Run \`yarn demo:capture\` first (it records the demo).`,
  );
  process.exit(1);
}

// Newest capture wins.
const latest = clips.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
mkdirSync(OUT_DIR, { recursive: true });

console.log(`Transcoding ${latest} -> ${OUT}`);
try {
  execFileSync(
    "ffmpeg",
    ["-y", "-i", latest, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT],
    { stdio: "inherit" },
  );
} catch {
  console.error("ffmpeg failed or is not installed. Install it (e.g. `brew install ffmpeg`).");
  process.exit(1);
}
console.log(`Wrote ${OUT}. Now run \`yarn demo:render\` (or \`yarn demo:studio\` to preview).`);
