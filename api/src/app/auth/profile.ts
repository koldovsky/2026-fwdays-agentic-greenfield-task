import { AuthError } from './auth-errors';

export const MAX_NAME_LENGTH = 120;

// PRD §4: name is an optional profile field. Whitespace-only collapses to
// null (no name); anything non-string or oversized is a client error.
export function normalizeProfileName(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input !== 'string' || input.length > MAX_NAME_LENGTH) {
    throw new AuthError('PROFILE_INVALID', 'Invalid profile payload');
  }
  return input.trim() || null;
}
