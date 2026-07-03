// Usage-counter repo over a fake Queryable — proves row->model mapping and the
// upsert shape without a live Postgres (NFR-COST-02).
import { describe, expect, it } from "vitest";
import { createUsageCounterRepo } from "./usage-counter-repo";
import type { Queryable, QueryResult } from "./port";

interface Call {
  readonly sql: string;
  readonly params?: readonly unknown[];
}

class FakeDb implements Queryable {
  readonly calls: Call[] = [];
  private readonly responses: unknown[][] = [];
  private error: unknown;

  enqueue(rows: unknown[]): this {
    this.responses.push(rows);
    return this;
  }

  /** Next `query` call rejects with this instead of returning a response. */
  throwNext(error: unknown): this {
    this.error = error;
    return this;
  }

  async query<Row>(sql: string, params?: readonly unknown[]): Promise<QueryResult<Row>> {
    this.calls.push({ sql, params });
    if (this.error !== undefined) {
      const error = this.error;
      this.error = undefined;
      throw error;
    }
    return { rows: (this.responses.shift() ?? []) as Row[] };
  }
}

describe("createUsageCounterRepo.get", () => {
  it("maps the row to a UsageCounterRecord", async () => {
    const db = new FakeDb().enqueue([{ tailorings_used: 2 }]);
    const repo = createUsageCounterRepo(db);

    expect(await repo.get("u1")).toEqual({ userId: "u1", tailoringsUsed: 2 });
    expect(db.calls[0].sql).toMatch(/SELECT tailorings_used FROM usage_counters/);
    expect(db.calls[0].params).toEqual(["u1"]);
  });

  it("returns null when the user has never tailored", async () => {
    const repo = createUsageCounterRepo(new FakeDb().enqueue([]));
    expect(await repo.get("nobody")).toBeNull();
  });
});

describe("createUsageCounterRepo.increment", () => {
  it("issues an upsert that creates or increments the row", async () => {
    const db = new FakeDb().enqueue([]);
    await createUsageCounterRepo(db).increment("u1");

    expect(db.calls[0].sql).toMatch(/INSERT INTO usage_counters/);
    expect(db.calls[0].sql).toMatch(/ON CONFLICT \(user_id\)/);
    expect(db.calls[0].sql).toMatch(/DO UPDATE SET tailorings_used = usage_counters\.tailorings_used \+ 1/);
    expect(db.calls[0].params).toEqual(["u1"]);
  });
});

describe("createUsageCounterRepo.reserve", () => {
  it("issues a WHERE-guarded upsert and reports granted when a row is returned", async () => {
    const db = new FakeDb().enqueue([{ tailorings_used: 1 }]);
    const granted = await createUsageCounterRepo(db).reserve("u1", 2);

    expect(granted).toBe(true);
    expect(db.calls[0].sql).toMatch(/INSERT INTO usage_counters/);
    expect(db.calls[0].sql).toMatch(/ON CONFLICT \(user_id\)/);
    expect(db.calls[0].sql).toMatch(
      /DO UPDATE SET tailorings_used = usage_counters\.tailorings_used \+ 1\s+WHERE usage_counters\.tailorings_used < \$2/,
    );
    expect(db.calls[0].sql).toMatch(/RETURNING tailorings_used/);
    expect(db.calls[0].params).toEqual(["u1", 2]);
  });

  it("reports not granted when the WHERE guard suppresses the update (no row returned)", async () => {
    const db = new FakeDb().enqueue([]);
    const granted = await createUsageCounterRepo(db).reserve("u1", 2);
    expect(granted).toBe(false);
  });

  it("reports not granted (not a raw throw) when the user id has no matching row in users — a stale session outliving the account", async () => {
    const db = new FakeDb().throwNext({
      code: "23503",
      constraint: "usage_counters_user_id_fkey",
      message: 'insert or update on table "usage_counters" violates foreign key constraint',
    });
    const granted = await createUsageCounterRepo(db).reserve("deleted-user", 2);
    expect(granted).toBe(false);
  });

  it("still throws a non-foreign-key-violation error (e.g. a connection failure)", async () => {
    const db = new FakeDb().throwNext(new Error("connection refused"));
    await expect(createUsageCounterRepo(db).reserve("u1", 2)).rejects.toThrow("connection refused");
  });
});

describe("createUsageCounterRepo.release", () => {
  it("issues a floored decrement", async () => {
    const db = new FakeDb().enqueue([]);
    await createUsageCounterRepo(db).release("u1");

    expect(db.calls[0].sql).toMatch(/UPDATE usage_counters/);
    expect(db.calls[0].sql).toMatch(/GREATEST\(0, tailorings_used - 1\)/);
    expect(db.calls[0].params).toEqual(["u1"]);
  });
});
