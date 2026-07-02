// user entity — the account behind a session. Pure model, framework-free
// (TC-PURE-01): no next/*, no DOM, no IO. Serves FR-AUTH-*, FR-ONBOARD-01.

/** How the account authenticates. Anonymous accounts have no credential yet. */
export type AuthProvider = "anonymous" | "password" | "google";

export interface User {
  readonly id: string;
  /** Null for an anonymous visitor who hasn't signed up yet (FR-ONBOARD-01). */
  readonly email: string | null;
  /** Optional display name (e.g. from the OAuth profile). */
  readonly name: string | null;
  readonly authProvider: AuthProvider;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
}
