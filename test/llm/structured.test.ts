import { afterEach, describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { parseStructured } from '../../src/llm/structured.js';

const schema = z.object({ intent: z.string() });

const clientReturning = (
  content: unknown,
  usage: Partial<Anthropic.Usage> = {},
): { client: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const fullUsage = {
    input_tokens: 40,
    output_tokens: 12,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    ...usage,
  };
  const create = vi.fn().mockResolvedValue({ content, usage: fullUsage, stop_reason: 'end_turn' });
  const client = { messages: { create } } as unknown as Anthropic;
  return { client, create };
};

afterEach(() => vi.restoreAllMocks());

describe('parseStructured', () => {
  it('makes exactly one call with a cached prefix and no deprecated temperature param', async () => {
    const { client, create } = clientReturning([
      { type: 'text', text: JSON.stringify({ intent: 'log' }) },
    ]);

    const result = await parseStructured(client, schema, 'hello');

    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0]?.[0] as {
      temperature?: number;
      system: { cache_control?: unknown }[];
    };
    expect(params.temperature).toBeUndefined();
    expect(params.system[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(result.data.intent).toBe('log');
  });

  it('throws (rather than JSON.parse an empty string) when there is no text output', async () => {
    const { client } = clientReturning([]);
    await expect(parseStructured(client, schema, 'hello')).rejects.toThrow(/no text output/);
  });

  it('sends one request with the image block BEFORE the text when an image is supplied', async () => {
    const { client, create } = clientReturning([
      { type: 'text', text: JSON.stringify({ intent: 'photo' }) },
    ]);

    await parseStructured(client, schema, 'what is on the plate', {
      images: [{ data: 'BASE64BYTES', mediaType: 'image/jpeg' }],
    });

    expect(create).toHaveBeenCalledTimes(1); // one call, no loop (invariant #5)
    const params = create.mock.calls[0]?.[0] as {
      messages: { role: string; content: unknown[] }[];
    };
    const content = params.messages[0]?.content as {
      type: string;
      source?: { type: string; media_type: string; data: string };
      text?: string;
    }[];
    expect(content[0]?.type).toBe('image');
    expect(content[0]?.source).toEqual({
      type: 'base64',
      media_type: 'image/jpeg',
      data: 'BASE64BYTES',
    });
    expect(content[1]).toEqual({ type: 'text', text: 'what is on the plate' });
  });

  it('sends a plain text user message (unchanged) when no image is supplied', async () => {
    const { client, create } = clientReturning([
      { type: 'text', text: JSON.stringify({ intent: 'log' }) },
    ]);

    await parseStructured(client, schema, 'hello');

    const params = create.mock.calls[0]?.[0] as { messages: { content: unknown }[] };
    expect(params.messages[0]?.content).toBe('hello');
  });

  it('emits exactly one [llm] usage line with the label and a positive cache-read count', async () => {
    const { client } = clientReturning(
      [{ type: 'text', text: JSON.stringify({ intent: 'log' }) }],
      { input_tokens: 128, output_tokens: 30, cache_read_input_tokens: 900 },
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await parseStructured(client, schema, 'hello', { label: 'router-intent' });

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0]?.[0] as string;
    expect(line).toContain('[llm] label=router-intent');
    expect(line).toContain('in=128');
    expect(line).toContain('out=30');
    expect(line).toContain('cacheRead=900');
    expect(line).toMatch(/ms=\d+/);
  });

  it('never logs prompt or user content — numbers and label only (invariant #9)', async () => {
    const { client } = clientReturning([{ type: 'text', text: JSON.stringify({ intent: 'log' }) }]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const secret = 'весил 82 кг, съел борщ';

    await parseStructured(client, schema, secret, { label: 'food-estimate' });

    const line = log.mock.calls[0]?.[0] as string;
    expect(line).not.toContain(secret);
    expect(line).not.toContain('борщ');
    expect(line).toContain('[llm] label=food-estimate');
  });
});
