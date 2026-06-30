import Anthropic from '@anthropic-ai/sdk';

// The single Anthropic client. Constructing it makes no network call — the key is read from the
// validated config (env only, invariant #9). Model calls go through src/llm/structured.ts so the
// "no agent loop" rule (invariant #5) is enforced in exactly one place.
export const createAnthropicClient = (apiKey: string): Anthropic => new Anthropic({ apiKey });
