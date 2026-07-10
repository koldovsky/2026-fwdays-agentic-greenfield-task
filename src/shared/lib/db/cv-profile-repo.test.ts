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

  // Task 4.2 — NFR-SEC-01, NFR-GDPR-01: a corrupt ciphertext (e.g. a rotated key)
  // must return null at the repo boundary, never throw to the caller. The caller
  // must never see the encryption key or any error detail. Defense-in-depth: the
  // service layer (service.ts) has its own try/catch, but the repo absorbs the
  // failure first so the surface area for accidental leakage is minimal.
  it("returns null when decryptString throws (e.g. wrong key / corrupt ciphertext) — does not re-throw (NFR-SEC-01)", async () => {
    // A wrong key will cause the AES-GCM auth tag to fail, making decryptString throw.
    const wrongKey = randomBytes(32);
    // Encrypt with the real key so we have a valid-looking envelope.
    const saveDb = new FakeDb().enqueue([
      { id: "p1", user_id: "u1", created_at: "2026-07-02T00:00:00.000Z" },
    ]);
    const writerRepo = createCvProfileRepo(saveDb, key);
    await writerRepo.save({ userId: "u1", rawText, profile });
    const envelope = (saveDb.calls[0].params ?? [])[1] as string;

    // Read with the wrong key — decryptString will throw inside getRawText.
    const readDb = new FakeDb().enqueue([{ encrypted_text: envelope }]);
    const readerRepo = createCvProfileRepo(readDb, wrongKey);

    // Must resolve to null, never reject.
    await expect(readerRepo.getRawText("p1")).resolves.toBeNull();
  });

  it("does not surface the key value or the ciphertext when decryption fails (NFR-SEC-01)", async () => {
    const wrongKey = randomBytes(32);
    const saveDb = new FakeDb().enqueue([
      { id: "p1", user_id: "u1", created_at: "2026-07-02T00:00:00.000Z" },
    ]);
    await createCvProfileRepo(saveDb, key).save({ userId: "u1", rawText, profile });
    const envelope = (saveDb.calls[0].params ?? [])[1] as string;

    const readDb = new FakeDb().enqueue([{ encrypted_text: envelope }]);
    const result = await createCvProfileRepo(readDb, wrongKey).getRawText("p1");

    // The returned value must not leak any fragment of the key or the ciphertext.
    const resultStr = String(result);
    expect(resultStr).not.toContain(wrongKey.toString("hex"));
    // rawText itself must not appear (would mean the wrong key somehow decrypted).
    expect(resultStr).not.toBe(rawText);
    expect(result).toBeNull();
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
