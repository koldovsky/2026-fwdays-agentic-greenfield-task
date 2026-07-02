// LLM provider port (TC-STACK-03). Framework-free: no SDK imports here — the
// concrete adapters (claude.ts, chatgpt.ts) isolate vendor SDKs/HTTP behind this
// interface, so the agent loop runs unchanged against any provider.
//
// Privacy invariant (NFR-SEC-02): the port accepts ONLY a Prompt — there is no
// field for user ids, account metadata, or request context, so identifying data
// cannot structurally reach an LLM payload.

import type { Prompt } from "./types";

export interface LlmCallOptions {
  /** Per-request output-token budget (NFR-COST-01). Adapters apply a safe default. */
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
}

export interface LlmProvider {
  /** Stream the completion as text chunks (NFR-PERF-01). */
  stream(prompt: Prompt, options?: LlmCallOptions): AsyncIterable<string>;
  /** Convenience: the full completion text (internally streamed by adapters). */
  complete(prompt: Prompt, options?: LlmCallOptions): Promise<string>;
}
