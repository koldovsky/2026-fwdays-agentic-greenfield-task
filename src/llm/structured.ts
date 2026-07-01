import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MODEL } from './client.js';
import { systemPrefixBlocks } from './systemPrefix.js';

// We omit `temperature` (ADR-0017): it's being deprecated for sampling control (already removed / 400
// on Opus 4.7+ and Fable), and reproducibility here doesn't rest on it — the constrained structured
// output + small schema do (temperature=0 never guaranteed identical outputs even where accepted).
// This amends ADR-0013's "evals at temperature 0"; revisit there if eval reproducibility regresses.

export interface StructuredResult<T> {
  data: T;
  cacheReadTokens: number;
}

/** An image to stream to a vision call: base64-encoded bytes + its media type (never persisted). */
export interface StructuredImage {
  data: string;
  mediaType: Anthropic.Base64ImageSource['media_type'];
}

/** Build the user message content: image block(s) BEFORE the text (invariant #5, still one call). */
const userContent = (
  userText: string,
  images: StructuredImage[] | undefined,
): string | Anthropic.ContentBlockParam[] => {
  if (!images || images.length === 0) {
    return userText;
  }

  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((image) => ({
    type: 'image',
    source: { type: 'base64', media_type: image.mediaType, data: image.data },
  }));

  return [...imageBlocks, { type: 'text', text: userText }];
};

/**
 * THE seam for model calls (invariant #5): exactly one `messages.create` request, structured output
 * (a JSON schema derived from the caller's zod schema), a cached system prefix, and
 * ONLY the current message in `messages` (invariant #1 — no chat history). No tool-call loop. Every
 * LLM feature parses through here. The output is validated client-side with the same zod schema.
 *
 * `images` is optional: when supplied, they become image content block(s) placed BEFORE the text in
 * the SAME single user message, so a vision operation is one more call through the same seam — not a
 * new model-call pattern. When absent the request is a plain text message (text callers unchanged).
 */
export const parseStructured = async <T>(
  client: Anthropic,
  schema: z.ZodType<T>,
  userText: string,
  images?: StructuredImage[],
): Promise<StructuredResult<T>> => {
  // zod-to-json-schema emits `additionalProperties: false` + `required` (what structured outputs
  // needs) plus a top-level `$schema` key the API doesn't accept — strip it.
  const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none' }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrefixBlocks(),
    output_config: { format: { type: 'json_schema', schema: jsonSchema } },
    messages: [{ role: 'user', content: userContent(userText, images) }],
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
