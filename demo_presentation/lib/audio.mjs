import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export async function generateSpeech({
  text,
  outputPath,
  voice = "Samantha",
  rate = 172,
}) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await execFileAsync("say", ["-v", voice, "-r", String(rate), "-o", outputPath, text]);
}

export async function getAudioDurationMs(filePath) {
  const { stdout } = await execFileAsync("afinfo", [filePath]);
  const match = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
  if (!match) {
    throw new Error(`Could not read duration for ${filePath}`);
  }
  return Math.ceil(parseFloat(match[1]) * 1000);
}

async function createSilence(outputPath, durationMs) {
  const seconds = Math.max(durationMs / 1000, 0.05);
  await execFileAsync(ffmpegPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=22050:cl=mono",
    "-t",
    String(seconds),
    outputPath,
  ]);
}

export async function buildNarrationTrack({ segments, voice, rate, workDir }) {
  await mkdir(workDir, { recursive: true });

  const timed = [];
  let cursorMs = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const audioPath = path.join(workDir, `${String(index).padStart(2, "0")}-${segment.id}.aiff`);

    await generateSpeech({ text: segment.text, outputPath: audioPath, voice, rate });
    const durationMs = await getAudioDurationMs(audioPath);

    timed.push({
      ...segment,
      audioPath,
      durationMs,
      startMs: cursorMs,
    });

    cursorMs += durationMs + segment.pauseAfterMs;
  }

  const concatListPath = path.join(workDir, "concat.txt");
  const lines = [];

  for (let index = 0; index < timed.length; index += 1) {
    const segment = timed[index];
    lines.push(`file '${segment.audioPath.replace(/'/g, "'\\''")}'`);

    if (segment.pauseAfterMs > 0) {
      const silencePath = path.join(workDir, `silence-${index}.aiff`);
      await createSilence(silencePath, segment.pauseAfterMs);
      lines.push(`file '${silencePath.replace(/'/g, "'\\''")}'`);
    }
  }

  await writeFile(concatListPath, lines.join("\n"));

  const outputPath = path.join(workDir, "narration.m4a");
  await execFileAsync(ffmpegPath, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ]);

  const totalDurationMs = cursorMs;
  return { timed, outputPath, totalDurationMs };
}

export async function getMediaDurationMs(filePath) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  let stderr = "";
  try {
    await execFileAsync(ffmpegPath, ["-i", filePath]);
  } catch (error) {
    stderr = String(error.stderr ?? "");
    if (!stderr.includes("Duration:")) {
      throw error;
    }
  }

  const match = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!match) {
    throw new Error(`Could not read media duration for ${filePath}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = parseFloat(match[3]);
  return Math.ceil((hours * 3600 + minutes * 60 + seconds) * 1000);
}

export { ffmpegPath };
