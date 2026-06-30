import { describe, expect, it } from 'vitest';
import { formatDurationClock, formatDurationCompact } from './duration';

describe('formatDurationClock', () => {
  it('shows M:SS under an hour', () => {
    expect(formatDurationClock(0)).toBe('0:00');
    expect(formatDurationClock(8)).toBe('0:08');
    expect(formatDurationClock(32 * 60)).toBe('32:00');
    expect(formatDurationClock(135)).toBe('2:15');
  });

  it('shows H:MM:SS at an hour or more', () => {
    expect(formatDurationClock(3600)).toBe('1:00:00');
    expect(formatDurationClock(5048)).toBe('1:24:08');
    expect(formatDurationClock(8100)).toBe('2:15:00');
  });

  it('floors fractional and clamps invalid input', () => {
    expect(formatDurationClock(59.9)).toBe('0:59');
    expect(formatDurationClock(-5)).toBe('0:00');
    expect(formatDurationClock(NaN)).toBe('0:00');
  });
});

describe('formatDurationCompact', () => {
  it('drops zero units and omits seconds past a minute', () => {
    expect(formatDurationCompact(45)).toBe('45s');
    expect(formatDurationCompact(32 * 60)).toBe('32m');
    expect(formatDurationCompact(3600)).toBe('1h');
    expect(formatDurationCompact(6 * 3600 + 12 * 60)).toBe('6h 12m');
    expect(formatDurationCompact(6 * 3600 + 12 * 60 + 30)).toBe('6h 12m');
  });

  it('clamps invalid input to 0s', () => {
    expect(formatDurationCompact(-1)).toBe('0s');
    expect(formatDurationCompact(NaN)).toBe('0s');
  });
});
