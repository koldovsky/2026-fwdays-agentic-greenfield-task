// Claude adapter for the LLM provider port (TC-STACK-03). The only file that
// touches the Anthropic SDK. Streams via the Messages API; adaptive thinking on
// (thinking deltas are not yielded — only response text reaches callers).
import Anthropic from "@anthropic-ai/sdk";

import type { LlmCallOptions, LlmProvider } from "./provider";
import type { Prompt } from "./types";

/** Latest Claude model (design.md: "Claude (default, latest Claude model)"). */
export const DEFAULT_CLAUDE_MODEL = "claude-opus-4-8";

/** Default per-request output budget (NFR-COST-01); callers may lower it. */
const DEFAULT_MAX_TOKENS = 4096;

export interface ClaudeProviderConfig {
  readonly apiKey: string;
  readonly model?: string;
}

/** Map the provider-agnostic Prompt onto the Messages API shape. */
function toApiRequest(prompt: Prompt): {
  system: string | undefined;
  messages: Anthropic.MessageParam[];
} {
  const system = prompt.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const messages: Anthropic.MessageParam[] = prompt.messages
    .filter((m) => m.role === "user")
    .map((m) => ({ role: "user" as const, content: m.content }));
  return { system: system === "" ? undefined : system, messages };
}

export function createClaudeProvider(config: ClaudeProviderConfig): LlmProvider {
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model ?? DEFAULT_CLAUDE_MODEL;

  function open(prompt: Prompt, options?: LlmCallOptions) {
    const { system, messages } = toApiRequest(prompt);
    return client.messages.stream(
      {
        model,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        thinking: { type: "adaptive" },
        ...(system !== undefined ? { system } : {}),
        messages,
      },
      { signal: options?.signal },
    );
  }

  return {
    async *stream(prompt, options) {
      for await (const event of open(prompt, options)) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
    },

    async complete(prompt, options) {
      const message = await open(prompt, options).finalMessage();
      if (message.stop_reason === "refusal") {
        throw new Error("llm_refusal");
      }
      return message.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
    },
  };
}
