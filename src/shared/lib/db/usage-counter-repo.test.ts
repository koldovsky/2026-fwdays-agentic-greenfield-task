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

  enqueue(rows: unknown[]): this {
    this.responses.push(rows);
    return this;
  }

  async query<Row>(sql: string, params?: readonly unknown[]): Promise<QueryResult<Row>> {
    this.calls.push({ sql, params });
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
