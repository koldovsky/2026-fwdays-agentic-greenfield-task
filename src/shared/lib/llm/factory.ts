// Provider factory: resolves the configured LLM adapter at the app edge
// (LLM_PROVIDER env, Claude by default — TC-STACK-03). Mirrors db/pg.ts:
// config comes from shared/config, adapters stay behind the port.
import {
  getAnthropicApiKey,
  getLlmModel,
  getLlmProviderName,
  getOpenAiApiKey,
} from "@/shared/config";

import { createChatGptProvider } from "./chatgpt";
import { createClaudeProvider } from "./claude";
import type { LlmProvider } from "./provider";

export function resolveLlmProvider(): LlmProvider {
  const model = getLlmModel();
  if (getLlmProviderName() === "chatgpt") {
    return createChatGptProvider({ apiKey: getOpenAiApiKey(), model });
  }
  return createClaudeProvider({ apiKey: getAnthropicApiKey(), model });
}
