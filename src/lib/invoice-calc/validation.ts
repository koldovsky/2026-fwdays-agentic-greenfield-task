/**
 * Failed domain validation, returned as a value (never thrown) so callers
 * can surface the reason next to the offending form field.
 */
export interface ValidationError {
  readonly ok: false;
  readonly reason: string;
}

export function validationError(reason: string): ValidationError {
  return { ok: false, reason };
}

export function isValidationError<T>(
  value: T | ValidationError
): value is ValidationError {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === false
  );
}
