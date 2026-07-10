/**
 * Fully automated TinyStart demo video with synced TTS narration.
 * Usage: node demo_presentation/build-demo-video.mjs [baseUrl]
 *
 * Requires: macOS `say`, running app at baseUrl, ffmpeg-static (npm).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildNarrationTrack, getMediaDurationMs } from "./lib/audio.mjs";
import { mergeVideoAudio, recordDemoVideo } from "./lib/video.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const WORK_DIR = path.join(__dirname, "work");
const OUTPUT_DIR = path.join(__dirname, "recordings");
const RAW_VIDEO = path.join(WORK_DIR, "screen.webm");
const FINAL_MP4 = path.join(__dirname, "tinystart-demo.mp4");
const FINAL_WEBM = path.join(__dirname, "tinystart-demo.webm");

async function main() {
  console.log("1/4 Loading narration script…");
  const config = JSON.parse(
    await readFile(path.join(__dirname, "narration.json"), "utf8"),
  );

  console.log("2/4 Generating TTS narration (macOS say)…");
  const { timed, outputPath: audioPath, totalDurationMs } = await buildNarrationTrack({
    segments: config.segments,
    voice: config.voice,
    rate: config.rate,
    workDir: path.join(WORK_DIR, "audio"),
  });
  console.log(`   Narration: ${(totalDurationMs / 1000).toFixed(1)}s → ${audioPath}`);

  console.log("3/4 Recording browser walkthrough (Playwright)…");
  await recordDemoVideo({
    baseUrl: BASE_URL,
    timedSegments: timed,
    outputDir: OUTPUT_DIR,
    rawVideoPath: RAW_VIDEO,
  });

  console.log("4/4 Merging video + audio (ffmpeg)…");
  await mergeVideoAudio({
    videoPath: RAW_VIDEO,
    audioPath,
    outputPath: FINAL_MP4,
  });

  const videoMs = await getMediaDurationMs(FINAL_MP4);
  console.log("");
  console.log("Done.");
  console.log(`  Final video: ${FINAL_MP4}`);
  console.log(`  Duration:    ${(videoMs / 1000).toFixed(1)}s (limit 120s)`);
  console.log(`  Narration:   ${path.join(WORK_DIR, "audio", "narration.m4a")}`);
  console.log(`  Raw screen:  ${RAW_VIDEO}`);

  if (videoMs > 120_000) {
    console.warn("Warning: video exceeds 2:00 course limit — trim narration.json");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
