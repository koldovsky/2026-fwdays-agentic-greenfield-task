import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { getAiEnv } from "@/lib/ai/env";

/**
 * The single Claude client for the whole app (AGENTS.md: all model calls go
 * through `lib/ai/`). Server-only and lazily constructed so the API key never
 * reaches a client bundle and `next build` stays green without it. Memoised
 * across requests in a server runtime.
 */
let cached: Anthropic | undefined;

export function getClaude(): Anthropic {
  if (cached === undefined) {
    cached = new Anthropic({ apiKey: getAiEnv().ANTHROPIC_API_KEY });
  }
  return cached;
}
