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

/**
 * Capability tag for the per-call usage log line — the enum-like label is the ONLY non-numeric
 * value that may appear in the log (invariant #9: never prompt/output/user content). One string per
 * LLM call site (design D4); a union so a typo can't slip a raw value into the log.
 */
export type LlmLabel =
  | 'router-intent'
  | 'food-estimate'
  | 'plate-vision'
  | 'plate-refine'
  | 'progress-analyze'
  | 'review-daily'
  | 'review-rollup';

/** An image to stream to a vision call: base64-encoded bytes + its media type (never persisted). */
export interface StructuredImage {
  data: string;
  mediaType: Anthropic.Base64ImageSource['media_type'];
}

/** Telegram delivers photos as JPEG — one home for every vision caller's media type (rule #12). */
export const TELEGRAM_PHOTO_MEDIA_TYPE: Anthropic.Base64ImageSource['media_type'] = 'image/jpeg';

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
 * One structured usage line per LLM call (design D4, ADR-0023): capability label + token counts +
 * wall-clock ms. Numbers and the enum label ONLY — never prompt, model output, or user content
 * (invariant #9). This single line is simultaneously the M5 spend evidence, the rule-#5 prompt-cache
 * hit verification (cacheRead > 0 on a warm prefix), and the M7 LLM-leg latency sample.
 */
const logUsage = (label: LlmLabel | undefined, usage: Anthropic.Usage, ms: number): void => {
  console.log(
    `[llm] label=${label ?? 'unknown'} in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cacheRead=${usage.cache_read_input_tokens ?? 0} ` +
      `cacheWrite=${usage.cache_creation_input_tokens ?? 0} ms=${ms}`,
  );
};

/** Optional knobs for a structured call: vision image block(s) + the usage-log capability label. */
export interface StructuredOptions {
  images?: StructuredImage[];
  label?: LlmLabel;
}

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
  { images, label }: StructuredOptions = {},
): Promise<StructuredResult<T>> => {
  // zod-to-json-schema emits `additionalProperties: false` + `required` (what structured outputs
  // needs) plus a top-level `$schema` key the API doesn't accept — strip it.
  const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none' }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  const startedAt = Date.now();
  const message = await client.messages.create({
    model: MODEL,
    // 1536, not 1024: Sonnet 5's tokenizer emits ~30% more tokens for the same text than 4.6, so a
    // review-prose reply that fit under 1024 could now truncate (stop_reason "max_tokens"). Output is
    // a hard cap, billed only on tokens used — the headroom is free for the short classify/extract calls.
    max_tokens: 1536,
    // Sonnet 5 runs adaptive thinking when `thinking` is unset (4.6 ran thinking-off by omission).
    // These are deterministic single structured calls (invariant #5) — thinking would only add
    // latency + thinking-token spend for no quality gain, so disable it explicitly.
    thinking: { type: 'disabled' },
    system: systemPrefixBlocks(),
    output_config: { format: { type: 'json_schema', schema: jsonSchema } },
    messages: [{ role: 'user', content: userContent(userText, images) }],
  });
  logUsage(label, message.usage, Date.now() - startedAt);

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
