import { describe, expect, it, vi } from 'vitest';
import type { Context } from 'grammy';
import { handleStart } from '../../src/bot/bot.js';

describe('handleStart', () => {
  it('replies into the same chat (round-trip ack)', async () => {
    const reply = vi.fn<Context['reply']>().mockResolvedValue({} as never);

    await handleStart({ reply });

    expect(reply).toHaveBeenCalledTimes(1);
    expect(typeof reply.mock.calls[0]?.[0]).toBe('string');
  });
});
