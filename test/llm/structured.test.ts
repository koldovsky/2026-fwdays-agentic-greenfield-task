import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { parseStructured } from '../../src/llm/structured.js';

const schema = z.object({ intent: z.string() });

const clientReturning = (
  content: unknown,
): { client: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi
    .fn()
    .mockResolvedValue({ content, usage: { cache_read_input_tokens: 0 }, stop_reason: 'end_turn' });
  const client = { messages: { create } } as unknown as Anthropic;
  return { client, create };
};

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

    await parseStructured(client, schema, 'what is on the plate', [
      { data: 'BASE64BYTES', mediaType: 'image/jpeg' },
    ]);

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
});
