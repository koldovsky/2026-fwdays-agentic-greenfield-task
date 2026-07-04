import { spawn } from "node:child_process";
import path from "node:path";

import type { Page } from "playwright-core";

const SOLVER_SCRIPT = path.join(process.cwd(), "scripts/solve-captcha.py");

export async function fetchCaptchaPng(page: Page): Promise<Buffer> {
  const captchaImg = page
    .locator("#captchaimg_1, img[id*='captchaimg'], img[src*='cp_appbooking_captcha']")
    .first();
  await captchaImg.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector(
        "#captchaimg_1, img[id*='captchaimg'], img[src*='cp_appbooking_captcha']",
      ) as HTMLImageElement | null;
      return el && el.complete && el.naturalWidth > 0;
    },
    { timeout: 15_000 },
  );

  let src = await captchaImg.getAttribute("src");
  if (!src) {
    throw new Error("Captcha image URL missing on MHOA form.");
  }
  if (!src.startsWith("http")) {
    src = `https://mahoganyhoa.com${src.startsWith("/") ? "" : "/"}${src}`;
  }

  const response = await page.request.get(src);
  if (!response.ok()) {
    throw new Error(`Failed to fetch captcha image (${response.status()}).`);
  }
  return response.body();
}

export async function solveCaptchaPng(pngBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [SOLVER_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      reject(
        new Error(
          `Captcha solver unavailable (${err.message}). Install Python deps: pip install -r requirements.txt`,
        ),
      );
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              "Captcha OCR failed. Ensure python3 and ddddocr are installed (pip install -r requirements.txt).",
          ),
        );
        return;
      }
      const solved = stdout.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (solved.length < 4) {
        reject(new Error("Captcha OCR returned an unreadable code."));
        return;
      }
      resolve(solved);
    });

    proc.stdin.write(pngBuffer);
    proc.stdin.end();
  });
}

export async function refreshCaptcha(page: Page): Promise<void> {
  const captchaImg = page.locator("#captchaimg_1").first();
  await captchaImg.click();
  await page.waitForTimeout(1200);
}
