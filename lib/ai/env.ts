import "server-only";

import { aiEnvSchema, type AiEnv } from "@/lib/schemas/ai-env";

/**
 * Server-side AI env, parsed once against `aiEnvSchema` (TC-VALID-01) and
 * memoised. Lazy on purpose: reading happens on the first AI call, not at
 * import time, so `next build` stays green without the key present and the
 * value is never pulled into a client bundle (NFR-SEC-02).
 *
 * `server-only` makes importing this from a client component a build error,
 * so the Claude API key can never reach the browser.
 */
let cached: AiEnv | undefined;

export function getAiEnv(): AiEnv {
  if (cached === undefined) {
    cached = aiEnvSchema.parse({
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      AI_INTERVIEW_MODEL: process.env.AI_INTERVIEW_MODEL,
      AI_JUDGE_MODEL: process.env.AI_JUDGE_MODEL,
      AI_SUMMARY_MODEL: process.env.AI_SUMMARY_MODEL,
    });
  }
  return cached;
}
