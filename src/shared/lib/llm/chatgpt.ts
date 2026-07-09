// Optional ChatGPT adapter for the LLM provider port (design.md: "ChatGPT is a
// drop-in adapter"). Plain fetch against the OpenAI chat-completions API — no
// SDK dependency for an optional path. Must honor the same interface (and the
// same grounding-context withholding: it only ever sees the Prompt it is given).
import type { LlmCallOptions, LlmProvider } from "./provider";
import type { Prompt } from "./types";

export const DEFAULT_CHATGPT_MODEL = "gpt-4o";

const DEFAULT_MAX_TOKENS = 4096;
const API_URL = "https://api.openai.com/v1/chat/completions";

export interface ChatGptProviderConfig {
  readonly apiKey: string;
  readonly model?: string;
}

function toApiMessages(prompt: Prompt): Array<{ role: string; content: string }> {
  return prompt.messages.map((m) => ({ role: m.role, content: m.content }));
}

export function createChatGptProvider(config: ChatGptProviderConfig): LlmProvider {
  const model = config.model ?? DEFAULT_CHATGPT_MODEL;

  async function request(prompt: Prompt, options: LlmCallOptions | undefined, stream: boolean) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: toApiMessages(prompt),
        stream,
      }),
      signal: options?.signal ?? null,
    });
    if (!response.ok) {
      throw new Error(`chatgpt_http_${response.status}`);
    }
    return response;
  }

  return {
    async *stream(prompt, options) {
      const response = await request(prompt, options, true);
      if (response.body === null) throw new Error("chatgpt_empty_body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.startsWith("data: ") ? line.slice(6).trim() : "";
          if (data === "" || data === "[DONE]") continue;
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (typeof chunk === "string" && chunk !== "") yield chunk;
        }
      }
    },

    async complete(prompt, options) {
      const response = await request(prompt, options, false);
      const parsed = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return parsed.choices?.[0]?.message?.content ?? "";
    },
  };
}
