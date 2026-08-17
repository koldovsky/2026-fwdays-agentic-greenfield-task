import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;

/** Lazy-launch Chromium once per process; reuse for subsequent PDF renders. */
export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((error) => {
      browserPromise = null;
      const hint =
        error instanceof Error ? error.message : "Failed to launch Chromium";
      throw new Error(
        `${hint}. Run \`npx playwright install chromium\` if the browser is missing.`,
      );
    });
  }
  return browserPromise;
}

/** Close the shared browser (tests / shutdown). */
export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const pending = browserPromise;
  browserPromise = null;
  const browser = await pending.catch(() => null);
  if (browser) {
    await browser.close();
  }
}
