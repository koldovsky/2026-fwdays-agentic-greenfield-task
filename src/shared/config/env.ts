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

/**
 * SSL setting for the pg Pool (`DATABASE_SSL`). Managed / serverless Postgres
 * (Neon, Vercel Postgres, Render, Supabase) requires TLS; local dev (plain
 * Postgres or the pglite socket) does not. Precedence: an explicit `DATABASE_SSL`
 * wins, otherwise TLS is on in production and off elsewhere.
 *   `require` | `true` | `on`  -> TLS, verify the server cert against its CA (secure default)
 *   `no-verify`                 -> TLS without cert verification (self-signed hosts only)
 *   `disable` | `false` | `off` -> no TLS
 * Returning the value node-postgres expects for `ssl` (boolean or an options object).
 */
export function getDatabaseSsl(): boolean | { rejectUnauthorized: false } {
  const raw = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (raw === "disable" || raw === "false" || raw === "off") return false;
  if (raw === "no-verify") return { rejectUnauthorized: false };
  if (raw === "require" || raw === "true" || raw === "on") return true;
  return process.env.NODE_ENV === "production";
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

export type PaymentsProviderName = "emulator";

/**
 * Payments provider selector (`PAYMENTS_PROVIDER`, TC-STACK-06). The emulator
 * is the only adapter today and the default outside production. It is
 * HARD-disabled in production (add-payments-emulator design "never in
 * production"; asserted by task 4.2): selecting it — explicitly or by default —
 * with NODE_ENV=production throws. A real MoR adapter later extends the union
 * and becomes the only valid production value.
 */
export function getPaymentsProviderName(): PaymentsProviderName {
  const name = process.env.PAYMENTS_PROVIDER;
  if (name !== undefined && name !== "" && name !== "emulator") {
    throw new Error(`Unknown PAYMENTS_PROVIDER "${name}" (expected "emulator")`);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "The payments emulator is disabled in production. Configure a real merchant-of-record adapter (TC-STACK-06).",
    );
  }
  return "emulator";
}

/**
 * Whether the payments emulator surfaces (/checkout screen, emulator sign
 * endpoint) may run: never in production, and only when the emulator is the
 * selected provider. Non-throwing so route handlers can 404 calmly (NFR-OBS-01).
 */
export function isPaymentsEmulatorEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const name = process.env.PAYMENTS_PROVIDER;
  return name === undefined || name === "" || name === "emulator";
}

/**
 * HMAC secret for payments webhook signatures (`PAYMENTS_WEBHOOK_SECRET`).
 * Shared by the event signer (emulator today, real MoR config later) and the
 * webhook verifier — the signature seam a real MoR drops into.
 */
export function getPaymentsWebhookSecret(): string {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (secret === undefined || secret === "") {
    throw new Error("PAYMENTS_WEBHOOK_SECRET is not set");
  }
  return secret;
}
