// Shared media helpers for homework demo recording (voice + mux).
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export const OUT_DIR = join("docs", "homework-demo");

export const VOICE_SEGMENTS = [
  "Віталій Юрков представляє Weather Explorer — застосунок, який допомагає вирішити, чи варто їхати на вихідні за погодою.",
  "Оберіть місто. З'являється сімденний прогноз і comfort score на кожен день — без акаунтів і cookies.",
  "Вихідні виділені окремо. Зелений badge означає, що поїздка має сенс.",
  "Інтерактивна карта OpenStreetMap. Клік на мапі змінює активне місто.",
  "Закріпіть до трьох міст і порівняйте вихідні — субота та неділя в одній таблиці.",
  "Проєкт зібраний агентно через Project Factory: дев'ять слайсів за OpenSpec, п'ятдесят unit-тестів, окреме рев'ю maker не дорівнює checker, і Memory Bank для handoff між сесіями. Vitalii Yurkov, fwdays Agentic Engineering Greenfield.",
];

const PYTHON_CANDIDATES = [
  process.env.PYTHON,
  "D:\\Legion\\Code\\Tools\\Miniconda3\\python.exe",
  "C:\\Users\\arabu\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
].filter(Boolean);

async function probePython(command, argsPrefix = []) {
  await exec(command, [...argsPrefix, "-m", "edge_tts", "--version"], { timeout: 15000 });
  return { command, argsPrefix };
}

/** Resolve a Python that has edge_tts installed. */
export async function findPython() {
  if (process.env.PYTHON && existsSync(process.env.PYTHON)) {
    return probePython(process.env.PYTHON);
  }

  for (const candidate of PYTHON_CANDIDATES) {
    if (!existsSync(candidate)) continue;
    try {
      return await probePython(candidate);
    } catch {
      // try next
    }
  }

  for (const argsPrefix of [[], ["-3"]]) {
    try {
      return await probePython("py", argsPrefix);
    } catch {
      // try next
    }
  }

  try {
    return await probePython("python");
  } catch {
    throw new Error(
      "Python with edge-tts not found. Install: pip install edge-tts — or set PYTHON=/path/to/python.exe",
    );
  }
}

export async function synthesizeVoice(segments, outPath) {
  const python = await findPython();
  const voiceDir = join(OUT_DIR, "voice-parts");
  await mkdir(voiceDir, { recursive: true });

  const partFiles = [];
  for (let i = 0; i < segments.length; i += 1) {
    const part = join(voiceDir, `part-${i}.mp3`);
    await exec(
      python.command,
      [
        ...python.argsPrefix,
        "-m",
        "edge_tts",
        "--voice",
        "uk-UA-OstapNeural",
        "--text",
        segments[i],
        "--write-media",
        part,
      ],
      { timeout: 120000 },
    );
    partFiles.push(part);
    console.log(`voice ${i + 1}/${segments.length}`);
  }

  const listFile = join(voiceDir, "concat.txt");
  await writeFile(
    listFile,
    partFiles.map((p) => `file '${resolve(p).replace(/\\/g, "/")}'`).join("\n"),
  );

  await exec("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath], {
    timeout: 120000,
  });
}

export async function muxVideoAudio(videoPath, audioPath, outPath) {
  await exec(
    "ffmpeg",
    [
      "-y",
      "-i",
      videoPath,
      "-i",
      audioPath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      outPath,
    ],
    { timeout: 180000 },
  );
}

export async function webmToMp4(videoPath, outPath) {
  await exec(
    "ffmpeg",
    ["-y", "-i", videoPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", outPath],
    { timeout: 120000 },
  );
}
