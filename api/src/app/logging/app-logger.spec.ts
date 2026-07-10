import { ConsoleLogger } from '@nestjs/common';
import { createAppLogger } from './app-logger';

describe('createAppLogger', () => {
  it('returns undefined outside production so Nest keeps the pretty default', () => {
    expect(createAppLogger({})).toBeUndefined();
    expect(createAppLogger({ NODE_ENV: 'development' })).toBeUndefined();
    expect(createAppLogger({ NODE_ENV: 'test' })).toBeUndefined();
  });

  it('emits single-line JSON entries in production', () => {
    const logger = createAppLogger({ NODE_ENV: 'production' });
    expect(logger).toBeInstanceOf(ConsoleLogger);

    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      logger?.log('hello', 'Ctx');
      expect(write).toHaveBeenCalledTimes(1);
      const line = write.mock.calls[0][0] as string;
      expect(line.trimEnd()).not.toContain('\n');
      expect(JSON.parse(line)).toMatchObject({
        level: 'log',
        message: 'hello',
        context: 'Ctx',
      });
    } finally {
      write.mockRestore();
    }
  });

  it('spreads plain-object messages into top-level envelope fields', () => {
    // Railway drops object-valued `message` — fields must live at the top
    // level of the JSON line to survive as queryable attributes.
    const logger = createAppLogger({ NODE_ENV: 'production' });
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      logger?.log({ message: 'GET /x 200 1ms', statusCode: 200 }, 'http');
      const entry = JSON.parse(write.mock.calls[0][0] as string);
      expect(entry).toMatchObject({
        level: 'log',
        context: 'http',
        message: 'GET /x 200 1ms',
        statusCode: 200,
      });
      expect(typeof entry.message).toBe('string');
    } finally {
      write.mockRestore();
    }
  });

  it('never lets payload keys forge envelope fields (review S-08 #1)', () => {
    const logger = createAppLogger({ NODE_ENV: 'production' });
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      logger?.log(
        { level: 'fatal', pid: 0, timestamp: 1, context: 'X', ok: true },
        'http',
      );
      const entry = JSON.parse(write.mock.calls[0][0] as string);
      expect(entry.level).toBe('log');
      expect(entry.context).toBe('http');
      expect(entry.pid).not.toBe(0);
      expect(entry.timestamp).not.toBe(1);
      expect(entry.ok).toBe(true);
      // No message key in the payload → empty string, not undefined
      expect(entry.message).toBe('');
    } finally {
      write.mockRestore();
    }
  });
});
