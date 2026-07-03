/**
 * Pure password-strength validation (FR-AUTH-01, NFR-SEC-01). Framework-free and shared
 * by the mobile sign-up form and the API DTO so client and server agree on the policy.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordValidationResult {
  valid: boolean;
  /** Human-readable "requires …" fragments for each failed rule; empty when valid. */
  errors: string[];
}

/** Validate a password against the minimum-strength policy. */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`at most ${PASSWORD_MAX_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('a number');
  }

  return { valid: errors.length === 0, errors };
}
