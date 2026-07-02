// Server-only environment accessors. Read lazily (never at import) so build and
// prerender don't require secrets; throw a clear error at first use if missing.

/** Postgres connection string (`DATABASE_URL`). Required by the pg adapter. */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

/** Anthropic API key (`ANTHROPIC_API_KEY`). Required by the Claude adapter. */
export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key === undefined || key === "") {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return key;
}

/** OpenAI API key (`OPENAI_API_KEY`). Required only when `LLM_PROVIDER=chatgpt`. */
export function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (key === undefined || key === "") {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return key;
}

export type LlmProviderName = "claude" | "chatgpt";

/** LLM provider selector (`LLM_PROVIDER`); Claude is the default (TC-STACK-03). */
export function getLlmProviderName(): LlmProviderName {
  const name = process.env.LLM_PROVIDER;
  if (name === undefined || name === "" || name === "claude") return "claude";
  if (name === "chatgpt") return "chatgpt";
  throw new Error(`Unknown LLM_PROVIDER "${name}" (expected "claude" or "chatgpt")`);
}

/** Optional model override (`LLM_MODEL`); each adapter has its own default. */
export function getLlmModel(): string | undefined {
  const model = process.env.LLM_MODEL;
  return model === undefined || model === "" ? undefined : model;
}
