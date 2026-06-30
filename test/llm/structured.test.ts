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
  it('makes exactly one call with temperature 0 and a cached system prefix', async () => {
    const { client, create } = clientReturning([
      { type: 'text', text: JSON.stringify({ intent: 'log' }) },
    ]);

    const result = await parseStructured(client, schema, 'hello');

    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0]?.[0] as {
      temperature: number;
      system: { cache_control?: unknown }[];
    };
    expect(params.temperature).toBe(0);
    expect(params.system[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(result.data.intent).toBe('log');
  });

  it('throws (rather than JSON.parse an empty string) when there is no text output', async () => {
    const { client } = clientReturning([]);
    await expect(parseStructured(client, schema, 'hello')).rejects.toThrow(/no text output/);
  });
});
