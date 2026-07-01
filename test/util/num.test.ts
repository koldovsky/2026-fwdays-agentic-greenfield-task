import { describe, expect, it } from 'vitest';
import { fmt } from '../../src/util/num.js';

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
