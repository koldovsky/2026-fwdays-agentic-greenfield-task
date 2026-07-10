import { AuthError } from './auth-errors';
import { MAX_NAME_LENGTH, normalizeProfileName } from './profile';

describe('normalizeProfileName', () => {
  it('passes a normal name through trimmed', () => {
    expect(normalizeProfileName('  Василь  ')).toBe('Василь');
  });

  it('collapses null/undefined/blank to null (name is optional)', () => {
    expect(normalizeProfileName(null)).toBeNull();
    expect(normalizeProfileName(undefined)).toBeNull();
    expect(normalizeProfileName('   ')).toBeNull();
  });

  it('rejects non-strings and oversized names', () => {
    expect(() => normalizeProfileName(42)).toThrow(AuthError);
    expect(() => normalizeProfileName('x'.repeat(MAX_NAME_LENGTH + 1))).toThrow(
      AuthError,
    );
  });
});
