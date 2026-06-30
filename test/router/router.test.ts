import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { classifyMessage } from '../../src/router/router.js';

interface ParseParams {
  temperature?: number;
  messages: { role: string; content: unknown }[];
  system: { cache_control?: unknown }[];
}

const makeClient = (output: {
  intent: string;
  date: string;
}): { client: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(output) }],
    usage: { cache_read_input_tokens: 0 },
  });
  const client = { messages: { create } } as unknown as Anthropic;
  return { client, create };
};

const firstParams = (create: ReturnType<typeof vi.fn>): ParseParams =>
  create.mock.calls[0]?.[0] as ParseParams;

describe('classifyMessage', () => {
  const now = new Date('2026-06-30T09:00:00Z');

  it('issues exactly one request (no agent loop) and returns the intent + resolved date', async () => {
    const { client, create } = makeClient({ intent: 'log', date: 'today' });

    const routed = await classifyMessage(client, '200г куриного филе', {
      userTz: 'Europe/Kyiv',
      now,
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(routed.intent).toBe('log');
    expect(routed.date).toBe('2026-06-30');
  });

  it('sends no chat history beyond the current message, with no temperature param', async () => {
    const { client, create } = makeClient({ intent: 'query', date: 'today' });

    await classifyMessage(client, 'сколько белка?', { userTz: 'Europe/Kyiv', now });

    const params = firstParams(create);
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0]).toEqual({ role: 'user', content: 'сколько белка?' });
    expect(params.temperature).toBeUndefined();
  });

  it('marks the system prefix as a cacheable block', async () => {
    const { client, create } = makeClient({ intent: 'log', date: 'today' });

    await classifyMessage(client, 'x', { userTz: 'Europe/Kyiv', now });

    const params = firstParams(create);
    expect(params.system[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('back-dates via the resolved token', async () => {
    const { client } = makeClient({ intent: 'log', date: 'yesterday' });

    const routed = await classifyMessage(client, 'вчера пицца', { userTz: 'Europe/Kyiv', now });

    expect(routed.date).toBe('2026-06-29');
  });
});
