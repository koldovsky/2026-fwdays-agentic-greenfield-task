// Claude adapter for the LLM provider port (TC-STACK-03). The only file that
// touches the Anthropic SDK. Streams via the Messages API; adaptive thinking on
// (thinking deltas are not yielded — only response text reaches callers).
import Anthropic from "@anthropic-ai/sdk";

import type { LlmCallOptions, LlmEffort, LlmProvider } from "./provider";
import type { Prompt, PromptMessage } from "./types";

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

/**
 * Map one user message onto the Messages API content. Plain text stays a bare
 * string (byte-identical to pre-T5 requests); a message carrying attachments
 * becomes a content array with each PDF as a `document` block followed by the
 * text (add-premium-pdf-attach, T5). Only the paid generation pass ever sets
 * attachments — grounding messages have none, so they always take the string
 * path (BC-HONESTY-01/02).
 */
function toUserContent(m: PromptMessage): string | Anthropic.ContentBlockParam[] {
  if (!m.attachments || m.attachments.length === 0) return m.content;
  const documents: Anthropic.ContentBlockParam[] = m.attachments.map((a) => ({
    type: "document",
    source: { type: "base64", media_type: a.mediaType, data: a.dataBase64 },
  }));
  return [...documents, { type: "text", text: m.content }];
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
    .map((m) => ({ role: "user" as const, content: toUserContent(m) }));
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
