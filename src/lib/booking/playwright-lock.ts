/** Serialize Playwright on the server — one Chromium at a time (512 MB droplet). */

let chain: Promise<void> = Promise.resolve();

export function withPlaywrightLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
