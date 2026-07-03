// Subscriptions repo over a fake Queryable — proves row->model mapping and the
// upsert shape without a live Postgres (FR-BILLING-01, TC-STACK-06).
import { describe, expect, it } from "vitest";
import { createSubscriptionRepo } from "./subscription-repo";
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

describe("createSubscriptionRepo.get", () => {
  it("maps the row to a SubscriptionRecord, normalizing Date to ISO-8601", async () => {
    const periodEnd = new Date("2026-08-02T00:00:00.000Z");
    const db = new FakeDb().enqueue([
      { id: "s1", user_id: "u1", plan: "pro", status: "active", current_period_end: periodEnd },
    ]);
    const repo = createSubscriptionRepo(db);

    expect(await repo.get("u1")).toEqual({
      id: "s1",
      userId: "u1",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2026-08-02T00:00:00.000Z",
    });
    expect(db.calls[0].sql).toMatch(/FROM subscriptions WHERE user_id = \$1/);
    expect(db.calls[0].params).toEqual(["u1"]);
  });

  it("keeps a null period end (Free has no period)", async () => {
    const db = new FakeDb().enqueue([
      { id: "s2", user_id: "u2", plan: "free", status: "active", current_period_end: null },
    ]);
    const record = await createSubscriptionRepo(db).get("u2");
    expect(record?.currentPeriodEnd).toBeNull();
  });

  it("returns null when the user has never paid", async () => {
    const repo = createSubscriptionRepo(new FakeDb().enqueue([]));
    expect(await repo.get("nobody")).toBeNull();
  });
});

describe("createSubscriptionRepo.upsert", () => {
  it("issues an upsert keyed on user_id that replaces plan, status, and period end", async () => {
    const db = new FakeDb().enqueue([]);
    await createSubscriptionRepo(db).upsert({
      userId: "u1",
      plan: "job_hunt_pass",
      status: "active",
      currentPeriodEnd: "2026-08-02T00:00:00.000Z",
    });

    expect(db.calls[0].sql).toMatch(/INSERT INTO subscriptions/);
    expect(db.calls[0].sql).toMatch(/ON CONFLICT \(user_id\)/);
    expect(db.calls[0].sql).toMatch(/DO UPDATE SET plan = EXCLUDED\.plan/);
    expect(db.calls[0].params).toEqual([
      "u1",
      "job_hunt_pass",
      "active",
      "2026-08-02T00:00:00.000Z",
    ]);
  });
});
