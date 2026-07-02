// User repository over the Queryable port. Returns a persistence-facing shape
// (no password hash — credentials live in credentials-repo, NFR-SEC). Mirrors the
// entities/user model without importing it (FSD: shared cannot import entities).
import type { Queryable } from "./port";

export type AuthProvider = "anonymous" | "password" | "google";

export interface PersistedUser {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
  readonly authProvider: AuthProvider;
  readonly createdAt: string;
}

export interface CreateUserInput {
  readonly email: string | null;
  readonly name: string | null;
  readonly authProvider: AuthProvider;
}

interface UserRow {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
  readonly auth_provider: AuthProvider;
  readonly created_at: string | Date;
}

function toUser(row: UserRow): PersistedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    authProvider: row.auth_provider,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

const COLS = `id, email, name, auth_provider, created_at`;

export function createUserRepo(db: Queryable) {
  return {
    async create(input: CreateUserInput): Promise<PersistedUser> {
      const { rows } = await db.query<UserRow>(
        `INSERT INTO users (email, name, auth_provider) VALUES ($1, $2, $3)
         RETURNING ${COLS}`,
        [input.email, input.name, input.authProvider],
      );
      return toUser(rows[0]);
    },

    /** Case-insensitive email lookup; null if no such account. */
    async findByEmail(email: string): Promise<PersistedUser | null> {
      const { rows } = await db.query<UserRow>(
        `SELECT ${COLS} FROM users WHERE lower(email) = lower($1)`,
        [email],
      );
      return rows.length > 0 ? toUser(rows[0]) : null;
    },

    async findById(id: string): Promise<PersistedUser | null> {
      const { rows } = await db.query<UserRow>(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
      return rows.length > 0 ? toUser(rows[0]) : null;
    },

    /** Hard delete; children (cv_profiles, tailorings, credentials, …) go via ON DELETE CASCADE (NFR-GDPR-02). */
    async deleteById(id: string): Promise<void> {
      await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    },
  };
}

export type UserRepo = ReturnType<typeof createUserRepo>;
