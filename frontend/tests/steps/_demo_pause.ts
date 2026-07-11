/**
 * Recording-aware demo-pause helper.
 *
 * Source-of-truth contract: `.agents/skills/write-bdd-tests/agents/bdd-test-writer.md`
 * §"Recording-aware demo-pause snippet" (lines 100-110). Mirrors the activation
 * pattern used by `MOCK_TRANSLATOR_BEHAVIOUR` / `MOCK_TTS_BEHAVIOUR` per D-04 +
 * D-08 (strict-equality `!== '1'` check, so an empty `ENABLE_DEMO_PAUSE=` does
 * NOT activate).
 *
 * Usage from a spec:
 *
 *   import { demoPause } from "./_demo_pause";
 *   ...
 *   await demoPause(page, 800, "after metadata preview renders");
 *
 * Without `ENABLE_DEMO_PAUSE=1` in the caller's environment, the helper is a
 * no-op — the call sites are byte-equivalent in the default CI runner. Set the
 * env var ONLY in the recording command (e.g.
 * `ENABLE_DEMO_PAUSE=1 npx playwright test --config=<...> --grep=<scenario>`),
 * never export it globally; never add it to shell rc / .envrc /
 * docker-compose / .env.
 */
import type { Page } from "@playwright/test";

export async function demoPause(page: Page, ms: number, reason: string): Promise<void> {
  if (process.env.ENABLE_DEMO_PAUSE !== "1") {
    return;
  }
  console.log(`[demo-pause] ${ms}ms — ${reason}`);
  await page.waitForTimeout(ms);
}
