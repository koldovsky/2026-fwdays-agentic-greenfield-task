// Pure helpers for the user entity. Deterministic, no IO.
import type { User } from "../model/types";

/** An anonymous visitor: no email and the anonymous provider (FR-ONBOARD-01). */
export function isAnonymous(user: User): boolean {
  return user.authProvider === "anonymous" || user.email === null;
}

/**
 * Human label for the account: name if present, else the email, else a calm
 * Ukrainian-neutral fallback (no PII invented). Used by the shell/account UI.
 */
export function displayLabel(user: User): string {
  return user.name ?? user.email ?? "Гість";
}
