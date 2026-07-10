// Integration coverage for the subscriptions repo (FR-BILLING-01, TC-STACK-06)
// against a real migrated schema. Proves `upsert` both creates the user's
// single subscription row and, on a second call, replaces it in place via
// `ON CONFLICT (user_id) DO UPDATE` — one row survives, with the new values.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { runMigrations } from "./migrate";
import type { Queryable } from "./port";
import { createSubscriptionRepo } from "./subscription-repo";
import { makeTestDb, type TestDb } from "./test-db";

let db: Queryable;
let t: TestDb;

beforeAll(async () => {
  t = await makeTestDb();
  db = t.db;
  await runMigrations(db);
}, 30_000);

afterAll(() => t.close());

async function insertUser(email: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (email, auth_provider) VALUES ($1, $2) RETURNING id`,
    [email, "password"],
  );
  return rows[0].id;
}

describe("subscription-repo upsert/get (FR-BILLING-01)", () => {
  it("creates the subscription row on first upsert and reads it back via get", async () => {
    const userId = await insertUser("sub-create@example.com");
    const repo = createSubscriptionRepo(db);

    await repo.upsert({
      userId,
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    });

    const record = await repo.get(userId);
    expect(record).not.toBeNull();
    expect(record).toMatchObject({
      userId,
      plan: "pro",
      status: "active",
    });
    expect(record?.currentPeriodEnd).toBe("2026-08-01T00:00:00.000Z");
  }, 30_000);

  it("ON CONFLICT (user_id) DO UPDATE: a second upsert replaces the row in place — one row, new values", async () => {
    const userId = await insertUser("sub-replace@example.com");
    const repo = createSubscriptionRepo(db);

    await repo.upsert({
      userId,
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    });
    await repo.upsert({
      userId,
      plan: "ultra",
      status: "canceled",
      currentPeriodEnd: "2026-12-31T00:00:00.000Z",
    });

    const record = await repo.get(userId);
    expect(record).toMatchObject({
      userId,
      plan: "ultra",
      status: "canceled",
    });
    expect(record?.currentPeriodEnd).toBe("2026-12-31T00:00:00.000Z");

    // Exactly one row for this user — the conflict path updated in place, it
    // did not insert a duplicate.
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM subscriptions WHERE user_id = $1`,
      [userId],
    );
    expect(rows[0].n).toBe(1);
  }, 30_000);

  it("get returns null for a user with no subscription (never paid — Free)", async () => {
    const userId = await insertUser("sub-none@example.com");
    const repo = createSubscriptionRepo(db);

    expect(await repo.get(userId)).toBeNull();
  }, 30_000);
});
