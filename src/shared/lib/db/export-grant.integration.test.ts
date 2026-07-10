// Integration coverage for findExportGrant (server-side-export-gate, T5 #8,
// BC-HONESTY-02, NFR-SEC-04, FR-BULLETS-02). Proves the export honesty gate's
// data source end-to-end against a real migrated schema: it returns every
// persisted bullet TEXT — including included=false / overclaim-risk bullets —
// so a user can legitimately opt an overclaim bullet back in (FR-BULLETS-02);
// the gate is a text-membership check, not an `included` filter. Also proves
// the not-found shape and that the caller (not the repo) must do the IDOR
// ownership check.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { runMigrations } from "./migrate";
import type { Queryable } from "./port";
import { makeTestDb, type TestDb } from "./test-db";
import { createTailoringRepo } from "./tailoring-repo";

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

async function insertJd(userId: string, text = "Some job description"): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO job_descriptions (user_id, raw_text) VALUES ($1, $2) RETURNING id`,
    [userId, text],
  );
  return rows[0].id;
}

describe("findExportGrant (server-side-export-gate, T5 #8, BC-HONESTY-02, NFR-SEC-04)", () => {
  it("returns { id, userId, status: 'complete' } plus ALL persisted bullet texts in ord order, including included=false overclaim bullets (FR-BULLETS-02)", async () => {
    const userId = await insertUser("grant-owner@example.com");
    const jdId = await insertJd(userId, "Staff Engineer");
    const repo = createTailoringRepo(db);
    const id = await repo.createPending(userId, jdId, "Staff Engineer");

    await repo.updateStatus(id, "complete", {
      matchScore: 68,
      checklist: [
        { requirement: "Distributed systems", importance: "must", status: "met", rationale: "8yr" },
      ],
      bullets: [
        { text: "Owned the checkout service", grounding: "met", included: true },
        { text: "Led the entire platform org", grounding: "overclaim", included: false },
        { text: "Migrated the billing pipeline", grounding: "partial", included: true },
      ],
    });

    const grant = await repo.findExportGrant(id);

    expect(grant).not.toBeNull();
    expect(grant?.id).toBe(id);
    expect(grant?.userId).toBe(userId);
    expect(grant?.status).toBe("complete");

    // ALL bullet texts must be present, in insertion (ord) order — the
    // included=false overclaim bullet is NOT filtered out. The export gate is
    // a membership check against this full set, so a user who has opted the
    // overclaim bullet back into the export document is still granted.
    expect(grant?.bullets).toEqual([
      { text: "Owned the checkout service" },
      { text: "Led the entire platform org" },
      { text: "Migrated the billing pipeline" },
    ]);
  }, 30_000);

  it("returns null for a non-existent tailoring id", async () => {
    const grant = await createTailoringRepo(db).findExportGrant(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(grant).toBeNull();
  }, 30_000);

  it("caller-side IDOR check: a grant belonging to one user is rejected when checked against a different userId", async () => {
    const owner = await insertUser("grant-owner-2@example.com");
    const attacker = await insertUser("grant-attacker@example.com");
    const jdId = await insertJd(owner, "Principal Engineer");
    const repo = createTailoringRepo(db);
    const id = await repo.createPending(owner, jdId, "Principal Engineer");
    await repo.updateStatus(id, "complete", {
      matchScore: 90,
      checklist: [],
      bullets: [{ text: "Owned the release process", grounding: "met", included: true }],
    });

    const grant = await repo.findExportGrant(id);

    expect(grant).not.toBeNull();
    // The repo itself does not filter by requester — ownership enforcement is
    // the caller's job (mirrors findById's documented contract). Assert the
    // gate the caller must apply: grant.userId !== requester → reject (404).
    expect(grant?.userId).toBe(owner);
    expect(grant?.userId).not.toBe(attacker);
  }, 30_000);
});
