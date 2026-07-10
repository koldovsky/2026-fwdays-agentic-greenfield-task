import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import { ffmpegPath } from "./audio.mjs";

const STORAGE_KEY = "tinystart:v1";

const DEMO = {
  title: "Draft project README",
  motivation: "Ship the course assignment on time",
  steps: ["Open outline", "Write setup section", "Add demo video link"],
  focusMinutes: 2,
  reflectionTag: "Breakdown",
};

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function holdForSegment(segment, actionMs, action) {
  const targetMs = segment.durationMs + segment.pauseAfterMs;
  const started = Date.now();
  if (action) {
    await action();
  }
  const elapsed = Date.now() - started;
  const remaining = targetMs - elapsed;
  if (remaining > 0) {
    await pause(remaining);
  }
}

async function clearStorage(page, baseUrl) {
  await page.goto(baseUrl);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
}

async function addStep(page, title) {
  await page.getByLabel("New step").fill(title);
  await page.getByRole("button", { name: "Add step" }).click();
  await pause(300);
}

async function triggerCelebration(page, baseUrl, taskId) {
  await page.evaluate(
    ({ key, taskId: id }) => {
      const data = JSON.parse(localStorage.getItem(key) ?? "{}");
      const task = data.tasks?.find((item) => item.id === id);
      data.activeSession = {
        id: "demo_session",
        taskId: id,
        stepId: task?.steps?.[0]?.id,
        plannedMinutes: 2,
        startedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        pausedMs: 0,
        status: "active",
      };
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, taskId },
  );
  await page.goto(`${baseUrl}/focus/${taskId}`);
  await page.waitForSelector('[aria-label="Session complete"]', { timeout: 8000 });
}

function segmentById(timed, id) {
  const segment = timed.find((item) => item.id === id);
  if (!segment) {
    throw new Error(`Missing narration segment: ${id}`);
  }
  return segment;
}

export async function recordDemoVideo({
  baseUrl,
  timedSegments,
  outputDir,
  rawVideoPath,
}) {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 800 },
    },
  });
  const page = await context.newPage();
  let taskId = "";

  try {
    const s = (id) => segmentById(timedSegments, id);

    await holdForSegment(s("intro"), 0, async () => {
      await clearStorage(page, baseUrl);
      await page.goto(baseUrl);
    });

    await holdForSegment(s("capture"), 0, async () => {
      await page.getByRole("textbox", { name: "Task" }).fill(DEMO.title);
      await page.getByRole("button", { name: "Add task" }).click();
      await page.waitForURL(/\/tasks\/(?!new)[^/?#]+/);
      taskId = page.url().split("/tasks/")[1];
    });

    await holdForSegment(s("motivation"), 0, async () => {
      await page.getByLabel("Why does this matter to me?").fill(DEMO.motivation);
    });

    await holdForSegment(s("breakdown"), 0, async () => {
      for (const step of DEMO.steps) {
        await addStep(page, step);
      }
    });

    await holdForSegment(s("home-hero"), 0, async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('[aria-label="Recommended task"]');
    });

    await holdForSegment(s("focus-start"), 0, async () => {
      await page.getByRole("link", { name: "Start focus" }).click();
      await page.waitForURL(/\/focus\//);
      await page.getByRole("button", { name: `${DEMO.focusMinutes} min`, exact: true }).click();
      await page.waitForSelector(".font-mono");
    });

    await holdForSegment(s("focus-active"), 0, async () => {
      await page.getByRole("button", { name: "Done with this step" }).click();
    });

    await holdForSegment(s("focus-wait"), 0, async () => {
      await pause(2500);
    });

    await holdForSegment(s("celebration"), 0, async () => {
      await triggerCelebration(page, baseUrl, taskId);
    });

    await holdForSegment(s("micro-recap"), 0, async () => {
      await page.getByRole("button", { name: "Take a break" }).click();
      await page.waitForURL(baseUrl);
      await page.waitForSelector('[aria-label="Today recap"]');
    });

    await holdForSegment(s("recap"), 0, async () => {
      await page.getByRole("link", { name: "Recap" }).click();
      await page.waitForURL(/\/recap/);
      await page.getByRole("button", { name: DEMO.reflectionTag, exact: true }).click();
    });

    // Agentic B-roll — hold on recap while narration plays
    for (const id of [
      "agentic-sdd",
      "agentic-scope",
      "agentic-loops",
      "agentic-checker",
    ]) {
      await holdForSegment(s(id), 0, async () => {
        await page.waitForSelector('[aria-label="Daily summary"]');
      });
    }
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const recordedPath = await video.path();
      await rename(recordedPath, rawVideoPath);
    }
  }

  return rawVideoPath;
}

export async function mergeVideoAudio({
  videoPath,
  audioPath,
  outputPath,
}) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  await execFileAsync(ffmpegPath, [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-shortest",
    outputPath,
  ]);
}
