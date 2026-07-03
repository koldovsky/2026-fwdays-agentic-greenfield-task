// Claude adapter for the LLM provider port (TC-STACK-03). The only file that
// touches the Anthropic SDK. Streams via the Messages API; adaptive thinking on
// (thinking deltas are not yielded — only response text reaches callers).
import Anthropic from "@anthropic-ai/sdk";

import type { LlmCallOptions, LlmEffort, LlmProvider } from "./provider";
import type { Prompt } from "./types";

/** Latest Claude model (design.md: "Claude (default, latest Claude model)"). */
export const DEFAULT_CLAUDE_MODEL = "claude-opus-4-8";

/** Default per-request output budget (NFR-COST-01); callers may lower it. */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Default reasoning depth for the tailoring skills (NFR-PERF-01/02). Opus 4.8
 * uses adaptive thinking whose thinking tokens count against `max_tokens`, and
 * defaults to `high` effort — a single high-effort turn on this model can run
 * minutes and, on a tight budget like grounding's 1024, spend the whole budget
 * thinking before emitting any answer (empty text → parse failure → retries →
 * the run eventually exceeds the route's serverless window and dies mid-stream
 * with no terminal event). These skills are mechanical structured-JSON
 * extraction/grounding, so `low` is both correct and far faster; callers can
 * raise it per request via LlmCallOptions.effort.
 */
const DEFAULT_EFFORT: LlmEffort = "low";

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
        output_config: { effort: options?.effort ?? DEFAULT_EFFORT },
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
