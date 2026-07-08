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

/**
 * Whether the LLM coverage judge runs (`COVERAGE_JUDGE`, improve-tailoring-quality
 * T5 §2.1). DEFAULT ON as of 2026-07-08 (live-verified honest): the judge only
 * UPGRADES a requirement off `gap` when it has surviving verbatim CV evidence —
 * it never inflates a score from thin air (FR-CHECKLIST-01, BC-HONESTY-01). The
 * pure heuristic scorer still runs first; the judge is a strict-honest overlay.
 *
 * Because the judge is an LLM call it REQUIRES `ANTHROPIC_API_KEY`; without it
 * (or with an explicit opt-out) this degrades to OFF rather than crashing —
 * the loop calls this on the hot path and an honest tailoring must never fail
 * over configuration (NFR-OBS-01). NON-THROWING by contract.
 *
 * Default ON (live-verified honest 2026-07-08). Explicit opt-out is respected:
 * `0` / `false` / `off` (case-insensitive) → OFF. Unset, empty, `1`/`true`/`on`,
 * or any other value → ON, subject to the key requirement below.
 */
export function isCoverageJudgeEnabled(): boolean {
  const raw = process.env.COVERAGE_JUDGE?.trim().toLowerCase();
  // Explicit opt-out wins over the default.
  if (raw === "0" || raw === "false" || raw === "off") return false;
  // Default ON, but the judge is an LLM call — degrade to OFF when the key is
  // absent so an honest tailoring never fails over a misconfig (NFR-OBS-01).
  const key = process.env.ANTHROPIC_API_KEY;
  return key !== undefined && key !== "";
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

/**
 * Shared secret for the maintenance API (`MAINTENANCE_SECRET`). Required by
 * `POST /api/maintenance/tailoring-cleanup` to gate the abandoned-pending
 * sweep (NFR-COST-02, FR-ONBOARD-01). Supplied as a `Bearer` token in the
 * `Authorization` header — callers are cron jobs or one-off curl invocations
 * (ops step). Throws when unset or empty so the route can respond 503 cleanly
 * rather than treating an empty string as a valid credential.
 */
export function getMaintenanceSecret(): string {
  const secret = process.env.MAINTENANCE_SECRET;
  if (secret === undefined || secret === "") {
    throw new Error("MAINTENANCE_SECRET is not set");
  }
  return secret;
}
