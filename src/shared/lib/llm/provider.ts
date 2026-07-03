// LLM provider port (TC-STACK-03). Framework-free: no SDK imports here — the
// concrete adapters (claude.ts, chatgpt.ts) isolate vendor SDKs/HTTP behind this
// interface, so the agent loop runs unchanged against any provider.
//
// Privacy invariant (NFR-SEC-02): the port accepts ONLY a Prompt — there is no
// field for user ids, account metadata, or request context, so identifying data
// cannot structurally reach an LLM payload.

import type { Prompt } from "./types";

/**
 * Reasoning-depth dial for models with adaptive thinking (Opus 4.6+ / Sonnet
 * 4.6). Framework-free duplicate of the Anthropic SDK's effort union so this
 * port stays SDK-free (TC-PURE-01); adapters map it onto their own request
 * shape. Lower effort = fewer thinking tokens and faster turns.
 */
export type LlmEffort = "low" | "medium" | "high" | "xhigh" | "max";

export interface LlmCallOptions {
  /** Per-request output-token budget (NFR-COST-01). Adapters apply a safe default. */
  readonly maxTokens?: number;
  /**
   * Reasoning depth (NFR-PERF-01/02). Adaptive-thinking models spend thinking
   * tokens against the same output budget as the answer, and default to `high`
   * effort — which on Opus 4.8 makes a single turn run minutes and can exhaust
   * a small `maxTokens` on thinking before any answer is emitted. The tailoring
   * skills are mechanical structured-JSON tasks, so adapters default this to
   * `"low"`; callers may raise it per request.
   */
  readonly effort?: LlmEffort;
  readonly signal?: AbortSignal;
}

export interface LlmProvider {
  /** Stream the completion as text chunks (NFR-PERF-01). */
  stream(prompt: Prompt, options?: LlmCallOptions): AsyncIterable<string>;
  /** Convenience: the full completion text (internally streamed by adapters). */
  complete(prompt: Prompt, options?: LlmCallOptions): Promise<string>;
}
