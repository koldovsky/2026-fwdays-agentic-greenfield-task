// Email/password auth end-to-end over pglite (in-process Postgres): applies the
// real migrations, then drives the service through the actual user + credentials
// repos. Proves register/authenticate work, errors don't enumerate accounts, and
// the stored credential is a hash, not plaintext (FR-AUTH-01, task 2.1 / 4.2).
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { createCredentialsRepo } from "@/shared/lib/db/credentials-repo";
import { runMigrations } from "@/shared/lib/db/migrate";
import type { Queryable } from "@/shared/lib/db/port";
import { createUserRepo } from "@/shared/lib/db/user-repo";
import { authenticateWithPassword, registerWithPassword, type AuthDeps } from "./service";

function adapter(pg: PGlite): Queryable {
  return {
    async query<Row>(sql: string, params?: readonly unknown[]) {
      const res = await pg.query<Row>(sql, params ? [...params] : undefined);
      return { rows: res.rows };
    },
  };
}

const email = "ada@example.com";
const password = "correct horse battery staple";
let db: Queryable;
let deps: AuthDeps;

beforeAll(async () => {
  db = adapter(new PGlite());
  await runMigrations(db);
  deps = { users: createUserRepo(db), credentials: createCredentialsRepo(db) };
}, 30_000);

describe("registerWithPassword", () => {
  it("creates an account and stores a hash, not the plaintext", async () => {
    const res = await registerWithPassword(deps, { email, password, name: "Ada" });
    expect(res.ok).toBe(true);

    const stored = await db.query<{ password_hash: string }>(
      `SELECT password_hash FROM credentials`,
    );
    expect(stored.rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(stored.rows[0].password_hash).not.toContain(password);
  }, 30_000);

  it("rejects a duplicate email", async () => {
    const res = await registerWithPassword(deps, { email, password, name: null });
    expect(res).toEqual({ ok: false, error: "email_taken" });
  }, 30_000);
});

describe("authenticateWithPassword", () => {
  it("accepts the correct password", async () => {
    const res = await authenticateWithPassword(deps, { email, password });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.email).toBe(email);
  }, 30_000);

  it("uses a uniform error for wrong password and unknown email", async () => {
    const wrongPw = await authenticateWithPassword(deps, { email, password: "nope" });
    const unknown = await authenticateWithPassword(deps, {
      email: "nobody@example.com",
      password,
    });
    expect(wrongPw).toEqual({ ok: false, error: "invalid_credentials" });
    expect(unknown).toEqual({ ok: false, error: "invalid_credentials" });
  }, 30_000);
});
