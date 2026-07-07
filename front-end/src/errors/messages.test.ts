import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client.ts';
import { messageFor } from './messages.ts';

function err(code: string): ApiError {
  return new ApiError(code, 'raw message from server', 'corr-1');
}

describe('messageFor', () => {
  it('TvNotReachable → error + friendly copy', () => {
    const { tone, message } = messageFor(err('TvNotReachable'));
    expect(tone).toBe('error');
    expect(message).toContain("Can't reach the TV");
    // Never leak the raw wire message.
    expect(message).not.toContain('raw message from server');
  });

  it('TvNotSupported → warning', () => {
    const { tone, message } = messageFor(err('TvNotSupported'));
    expect(tone).toBe('warning');
    expect(message).toContain("doesn't support");
  });

  it('TvFailed → error', () => {
    const { tone } = messageFor(err('TvFailed'));
    expect(tone).toBe('error');
  });

  it('TvInvalidOp → error', () => {
    const { tone } = messageFor(err('TvInvalidOp'));
    expect(tone).toBe('error');
  });

  it('TvUnknown → warning', () => {
    const { tone } = messageFor(err('TvUnknown'));
    expect(tone).toBe('warning');
  });

  it('SessionNotConnected → warning + tap Connect copy', () => {
    const { tone, message } = messageFor(err('SessionNotConnected'));
    expect(tone).toBe('warning');
    expect(message).toContain('Tap Connect');
  });

  it('validation → error', () => {
    const { tone } = messageFor(err('validation'));
    expect(tone).toBe('error');
  });

  it('unknown code → generic fallback', () => {
    const { tone, message } = messageFor(err('made-up-code'));
    expect(tone).toBe('error');
    expect(message).toContain('hiccup');
  });

  it('no toast body contains raw `-32xxx` codes or `code:` substrings', () => {
    for (const code of [
      'TvNotReachable',
      'TvNotSupported',
      'TvFailed',
      'TvInvalidOp',
      'TvUnknown',
      'SessionNotConnected',
      'validation',
      'unknown',
    ]) {
      const { message } = messageFor(err(code));
      expect(message).not.toMatch(/-32\d{3}/);
      expect(message).not.toMatch(/\bcode:/i);
    }
  });
});
