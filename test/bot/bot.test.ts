import { describe, expect, it, vi } from 'vitest';
import type { Context } from 'grammy';
import type Anthropic from '@anthropic-ai/sdk';
import { handleStart, handleText } from '../../src/bot/bot.js';

describe('handleStart', () => {
  it('replies into the same chat (round-trip ack)', async () => {
    const reply = vi.fn<Context['reply']>().mockResolvedValue({} as never);

    await handleStart({ reply });

    expect(reply).toHaveBeenCalledTimes(1);
    expect(typeof reply.mock.calls[0]?.[0]).toBe('string');
  });
});

describe('handleText', () => {
  const makeDeps = (
    intent: string,
  ): { anthropic: Anthropic; userTz: string; create: ReturnType<typeof vi.fn> } => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ intent, date: 'today' }) }],
      usage: {},
    });
    const anthropic = { messages: { create } } as unknown as Anthropic;
    return { anthropic, userTz: 'Europe/Kyiv', create };
  };

  it('routes a non-command message through the classifier and replies', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const { anthropic, userTz, create } = makeDeps('query');

    await handleText({ message: { text: 'сколько белка?' }, reply }, { anthropic, userTz });

    expect(create).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(String(reply.mock.calls[0]?.[0])).toContain('query');
  });

  it('skips commands (no classifier call)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const { anthropic, userTz, create } = makeDeps('log');

    await handleText({ message: { text: '/start' }, reply }, { anthropic, userTz });

    expect(create).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });
});
