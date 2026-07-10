// Pure error-code mapping for the sign-in feature (FR-AUTH-01). The register
// endpoint and Auth.js return machine codes; UI copy comes from i18n. The
// sign-in failure message is uniform for wrong-password vs unknown-email —
// no account enumeration.
import type { Dictionary } from "@/shared/lib/i18n";

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "invalid_email"
  | "weak_password"
  | "generic";

/** Narrow an unknown server error code to a known auth error (unknown → generic). */
export function toAuthErrorCode(code: unknown): AuthErrorCode {
  switch (code) {
    case "email_taken":
    case "invalid_email":
    case "weak_password":
    case "invalid_credentials":
      return code;
    default:
      return "generic";
  }
}

/** Resolve the calm, localized message for an auth error. */
export function authErrorMessage(dictionary: Dictionary, code: AuthErrorCode): string {
  const messages: Readonly<Record<AuthErrorCode, string>> = {
    invalid_credentials: dictionary.auth.error.invalidCredentials,
    email_taken: dictionary.auth.error.emailTaken,
    invalid_email: dictionary.auth.error.invalidEmail,
    weak_password: dictionary.auth.error.weakPassword,
    generic: dictionary.auth.error.generic,
  };
  return messages[code];
}
