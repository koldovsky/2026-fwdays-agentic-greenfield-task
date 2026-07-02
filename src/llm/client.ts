import Anthropic from '@anthropic-ai/sdk';

// The single Anthropic model id, shared by every call site (the structured-output seam and the
// local eval harness) so a model bump is one edit. Sonnet 5 — near-Opus quality on the bot's
// classify/extract/short-prose calls at Sonnet cost (intro $2/$10 per MTok through 2026-08-31),
// stronger instruction-following than 4.6 for the language-mirror + honest-voice prompts. NOT Opus:
// these are single structured calls (invariant #5), not long-horizon reasoning — Opus buys nothing
// here at 1.6× the cost. NOTE (Sonnet 5): thinking is adaptive-by-default when unset, so the seam
// disables it (src/llm/structured.ts) — deterministic classify/extract wants no thinking; and the
// new tokenizer emits ~30% more tokens than 4.6, so re-seed the eval baseline on the next live run.
export const MODEL = 'claude-sonnet-5';

// The single Anthropic client. Constructing it makes no network call — the key is read from the
// validated config (env only, invariant #9). Model calls go through src/llm/structured.ts so the
// "no agent loop" rule (invariant #5) is enforced in exactly one place.
//
// The retry/timeout posture is explicit (ADR-0023), not left to shifting SDK defaults: `maxRetries`
// re-sends the SAME single deterministic call on 429/5xx/connection errors with SDK-native
// exponential backoff honoring `retry-after` — transport resilience, never an agent loop
// (invariant #5). `timeout` is a hard 60s ceiling on a hung request (the SDK default 10min is
// absurd against M7's 3s/8s p90 targets), generous over the vision-call tail.
export const createAnthropicClient = (apiKey: string): Anthropic =>
  new Anthropic({ apiKey, maxRetries: 3, timeout: 60_000 });
