import { describe, expect, it } from 'vitest';
import { fmt, round1 } from '../../src/util/num.js';

// One home for numeric-prose formatting: trim a trailing `.0` so whole grams/units read cleanly.
// This pins the table that was previously copy-pasted across the food/metrics/query surfaces.

describe('fmt', () => {
  it('renders an integer without a decimal', () => {
    expect(fmt(200)).toBe('200');
  });

  it('renders a fractional value fixed to one decimal, rounding as needed', () => {
    expect(fmt(89.25)).toBe('89.3');
  });

  it('renders a whole-valued float as a plain integer', () => {
    expect(fmt(90.0)).toBe('90');
  });

  it('renders negatives correctly for both integer and fractional cases', () => {
    expect(fmt(-5)).toBe('-5');
    expect(fmt(-5.25)).toBe('-5.3');
  });
});

describe('round1', () => {
  it('rounds to one decimal', () => {
    expect(round1(12.34)).toBe(12.3);
    expect(round1(12.35)).toBe(12.4);
    expect(round1(200)).toBe(200);
    expect(round1(-1.25)).toBe(-1.2); // Math.round half-up on the scaled value
  });
});
