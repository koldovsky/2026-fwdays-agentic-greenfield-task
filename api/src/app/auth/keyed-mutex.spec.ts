import { KeyedMutex } from './keyed-mutex';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('KeyedMutex', () => {
  it('serializes tasks for the same key', async () => {
    const mutex = new KeyedMutex();
    const events: string[] = [];
    const gate = deferred();

    const first = mutex.run('a', async () => {
      events.push('first:start');
      await gate.promise;
      events.push('first:end');
    });
    const second = mutex.run('a', async () => {
      events.push('second:start');
    });

    // second must not start while first holds the key
    await new Promise((r) => setTimeout(r, 10));
    expect(events).toEqual(['first:start']);

    gate.resolve();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('runs different keys in parallel', async () => {
    const mutex = new KeyedMutex();
    const events: string[] = [];
    const gate = deferred();

    const slow = mutex.run('a', async () => {
      await gate.promise;
      events.push('a');
    });
    await mutex.run('b', async () => {
      events.push('b');
    });

    expect(events).toEqual(['b']);
    gate.resolve();
    await slow;
    expect(events).toEqual(['b', 'a']);
  });

  it('keeps the queue alive after a failing task', async () => {
    const mutex = new KeyedMutex();
    await expect(
      mutex.run('a', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(mutex.run('a', async () => 'ok')).resolves.toBe('ok');
  });

  it('propagates task results and errors to the caller only', async () => {
    const mutex = new KeyedMutex();
    await expect(mutex.run('a', async () => 42)).resolves.toBe(42);
  });
});
