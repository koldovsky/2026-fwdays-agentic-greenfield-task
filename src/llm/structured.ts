import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { systemPrefixBlocks } from './systemPrefix.js';

// Sonnet 4.6 — chosen for cost; still accepts temperature (unlike Opus 4.7+/Fable), so temperature 0
// gives reproducible, code-gradeable classification.
const MODEL = 'claude-sonnet-4-6';

export interface StructuredResult<T> {
  data: T;
  cacheReadTokens: number;
}

/**
 * THE seam for model calls (invariant #5): exactly one `messages.create` request, structured output
 * (a JSON schema derived from the caller's zod schema), temperature 0, cached system prefix, and
 * ONLY the current message in `messages` (invariant #1 — no chat history). No tool-call loop. Every
 * LLM feature parses through here. The output is validated client-side with the same zod schema.
 */
export const parseStructured = async <T>(
  client: Anthropic,
  schema: z.ZodType<T>,
  userText: string,
): Promise<StructuredResult<T>> => {
  // zod-to-json-schema emits `additionalProperties: false` + `required` (what structured outputs
  // needs) plus a top-level `$schema` key the API doesn't accept — strip it.
  const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none' }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0,
    system: systemPrefixBlocks(),
    output_config: { format: { type: 'json_schema', schema: jsonSchema } },
    messages: [{ role: 'user', content: userText }],
  });

  const block = message.content.find((b) => b.type === 'text');
  if (block?.type !== 'text' || block.text.trim() === '') {
    // No usable text — e.g. stop_reason "refusal" or "max_tokens". Fail loud instead of JSON.parse('').
    throw new Error(
      `LLM returned no text output (stop_reason: ${message.stop_reason ?? 'unknown'})`,
    );
  }

  const data = schema.parse(JSON.parse(block.text) as unknown);

  return { data, cacheReadTokens: message.usage.cache_read_input_tokens ?? 0 };
};
