// CV-profile repo over a fake Queryable — proves encryption-at-rest wiring
// (NFR-SEC-01) and row↔model mapping without a live Postgres.
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CvProfile } from "@/shared/lib/scoring";
import { createCvProfileRepo } from "./cv-profile-repo";
import type { Queryable, QueryResult } from "./port";

interface Call {
  readonly sql: string;
  readonly params?: readonly unknown[];
}

/** Records every query and replays a queued rows response per call. */
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

const key = randomBytes(32);
const profile: CvProfile = { skills: ["react", "node.js"], sentences: ["Built an API"] };
const rawText = "Ada Lovelace — React Native engineer, 7 років досвіду";

describe("createCvProfileRepo.save", () => {
  it("encrypts raw text before it reaches the database", async () => {
    const db = new FakeDb().enqueue([
      { id: "p1", user_id: "u1", created_at: "2026-07-02T00:00:00.000Z" },
    ]);
    const repo = createCvProfileRepo(db, key);

    const record = await repo.save({ userId: "u1", rawText, profile });

    const [, encryptedParam, normalizedParam] = db.calls[0].params ?? [];
    expect(encryptedParam).toMatch(/^v1:/);
    expect(encryptedParam).not.toBe(rawText);
    // Plaintext must appear in no bound parameter.
    for (const p of db.calls[0].params ?? []) {
      expect(String(p)).not.toContain("Lovelace");
    }
    expect(normalizedParam).toBe(JSON.stringify(profile));
    expect(record).toEqual({
      id: "p1",
      userId: "u1",
      profile,
      createdAt: "2026-07-02T00:00:00.000Z",
    });
  });
});

describe("createCvProfileRepo.getRawText", () => {
  it("round-trips the encrypted text back to plaintext", async () => {
    const saveDb = new FakeDb().enqueue([
      { id: "p1", user_id: "u1", created_at: "2026-07-02T00:00:00.000Z" },
    ]);
    const repo = createCvProfileRepo(saveDb, key);
    await repo.save({ userId: "u1", rawText, profile });
    const envelope = (saveDb.calls[0].params ?? [])[1] as string;

    const readDb = new FakeDb().enqueue([{ encrypted_text: envelope }]);
    const readRepo = createCvProfileRepo(readDb, key);
    expect(await readRepo.getRawText("p1")).toBe(rawText);
  });

  it("returns null when no row matches", async () => {
    const repo = createCvProfileRepo(new FakeDb().enqueue([]), key);
    expect(await repo.getRawText("missing")).toBeNull();
  });
});

describe("createCvProfileRepo.findByUser / deleteByUser", () => {
  it("maps rows (parsing jsonb strings) newest-first", async () => {
    const db = new FakeDb().enqueue([
      { id: "p2", user_id: "u1", normalized: JSON.stringify(profile), created_at: new Date(0) },
    ]);
    const repo = createCvProfileRepo(db, key);
    const records = await repo.findByUser("u1");
    expect(records).toHaveLength(1);
    expect(records[0].profile).toEqual(profile);
    expect(records[0].createdAt).toBe(new Date(0).toISOString());
  });

  it("issues a scoped DELETE (FK cascade handles children)", async () => {
    const db = new FakeDb().enqueue([]);
    await createCvProfileRepo(db, key).deleteByUser("u1");
    expect(db.calls[0].sql).toMatch(/DELETE FROM cv_profiles WHERE user_id = \$1/);
    expect(db.calls[0].params).toEqual(["u1"]);
  });
});
