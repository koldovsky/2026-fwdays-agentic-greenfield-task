// Credentials repository (FR-AUTH-01). Stores salted password-hash envelopes,
// separate from the user row so a hash never rides along with user reads (NFR-SEC).
import type { Queryable } from "./port";

export interface EmailCredential {
  readonly userId: string;
  readonly passwordHash: string;
}

export function createCredentialsRepo(db: Queryable) {
  return {
    /** Set (or replace) the password hash for a user. */
    async set(userId: string, passwordHash: string): Promise<void> {
      await db.query(
        `INSERT INTO credentials (user_id, password_hash) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [userId, passwordHash],
      );
    },

    /** Look up a user's id + password hash by email; null if no credentialed account. */
    async getByEmail(email: string): Promise<EmailCredential | null> {
      const { rows } = await db.query<{ user_id: string; password_hash: string }>(
        `SELECT c.user_id, c.password_hash
         FROM credentials c JOIN users u ON u.id = c.user_id
         WHERE lower(u.email) = lower($1)`,
        [email],
      );
      return rows.length > 0
        ? { userId: rows[0].user_id, passwordHash: rows[0].password_hash }
        : null;
    },
  };
}

export type CredentialsRepo = ReturnType<typeof createCredentialsRepo>;
