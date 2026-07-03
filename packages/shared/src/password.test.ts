import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePassword,
} from './password';

describe('validatePassword', () => {
  it('accepts a password meeting all rules', () => {
    const result = validatePassword('Honeydo1');
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('accepts at the minimum length boundary', () => {
    expect(validatePassword('Abcdef12').valid).toBe(true); // exactly 8
  });

  it('rejects a password shorter than the minimum', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`at least ${PASSWORD_MIN_LENGTH} characters`);
  });

  it('rejects a password longer than the maximum', () => {
    const tooLong = 'Aa1' + 'a'.repeat(PASSWORD_MAX_LENGTH);
    const result = validatePassword(tooLong);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`at most ${PASSWORD_MAX_LENGTH} characters`);
  });

  it('requires a lowercase letter', () => {
    expect(validatePassword('ABCDEF12').errors).toContain('a lowercase letter');
  });

  it('requires an uppercase letter', () => {
    expect(validatePassword('abcdef12').errors).toContain('an uppercase letter');
  });

  it('requires a number', () => {
    expect(validatePassword('Abcdefgh').errors).toContain('a number');
  });

  it('collects every failing rule at once', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      `at least ${PASSWORD_MIN_LENGTH} characters`,
      'an uppercase letter',
      'a number',
    ]);
  });
});
