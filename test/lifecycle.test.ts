import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFatalHandler, buildShutdown, type ShutdownTargets } from '../src/lifecycle.js';

afterEach(() => vi.restoreAllMocks());

const makeTargets = (): { targets: ShutdownTargets; calls: string[] } => {
  const calls: string[] = [];
  const targets: ShutdownTargets = {
    reviewTask: { stop: () => void calls.push('reviewTask.stop') },
    bot: { stop: () => Promise.resolve(void calls.push('bot.stop')) },
    worker: { stop: () => Promise.resolve(void calls.push('worker.stop')) },
    health: { close: () => void calls.push('health.close') },
    disconnect: () => Promise.resolve(void calls.push('disconnect')),
  };
  return { targets, calls };
};

describe('buildShutdown', () => {
  it('stops the review cron FIRST, then drains bot, worker, health, and the DB', async () => {
    const { targets, calls } = makeTargets();

    await buildShutdown(targets)('SIGTERM');

    expect(calls).toEqual([
      'reviewTask.stop',
      'bot.stop',
      'worker.stop',
      'health.close',
      'disconnect',
    ]);
  });

  it('tolerates a null worker (Notion mirror off)', async () => {
    const { targets, calls } = makeTargets();
    targets.worker = null;

    await buildShutdown(targets)('SIGINT');

    expect(calls).toEqual(['reviewTask.stop', 'bot.stop', 'health.close', 'disconnect']);
  });
});

describe('buildFatalHandler', () => {
  it('logs the reason message-only and exits non-zero', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    buildFatalHandler('unhandled rejection')(new Error('boom secret 82kg'));

    expect(exit).toHaveBeenCalledWith(1);
    const line = error.mock.calls[0]?.[0] as string;
    expect(line).toContain('unhandled rejection');
    expect(line).toContain('boom secret 82kg'); // the Error MESSAGE is the payload, not raw values
  });

  it('never throws on a non-Error rejection value', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    expect(() => buildFatalHandler('uncaught exception')({ weird: true })).not.toThrow();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
