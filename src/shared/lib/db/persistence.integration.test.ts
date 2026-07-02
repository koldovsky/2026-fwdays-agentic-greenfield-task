// Live persistence verification against pglite (in-process Postgres) — applies
// the real migration and exercises the repo end-to-end. Proves, without any
// external infra: migrations apply + are idempotent, CV text is stored as
// ciphertext and decrypts back (NFR-SEC-01), and DELETE FROM users cascades to
// cv_profiles (NFR-GDPR-02, FR-CV-05).
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import type { CvProfile } from "@/shared/lib/scoring";
import { createCvProfileRepo } from "./cv-profile-repo";
import { runMigrations } from "./migrate";
import type { Queryable } from "./port";
import { createTailoringRepo } from "./tailoring-repo";

function adapter(pg: PGlite): Queryable {
  return {
    async query<Row>(sql: string, params?: readonly unknown[]) {
      const res = await pg.query<Row>(sql, params ? [...params] : undefined);
      return { rows: res.rows };
    },
  };
}

const key = randomBytes(32);
const profile: CvProfile = { skills: ["react", "node.js"], sentences: ["Built an API"] };
const rawText = "Ada Lovelace — React Native engineer, 7 років досвіду";

let db: Queryable;

beforeAll(async () => {
  db = adapter(new PGlite());
}, 30_000);

describe("migrations", () => {
  it("apply the init migration, then are idempotent", async () => {
    const applied = await runMigrations(db);
    expect(applied).toContain("0001_init.sql");
    expect(await runMigrations(db)).toEqual([]);
  }, 30_000);
});

describe("cv-profile round-trip + cascade", () => {
  it("stores ciphertext, decrypts back, and cascades on user delete", async () => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO users (email, auth_provider) VALUES ($1, $2) RETURNING id`,
      ["ada@example.com", "password"],
    );
    const userId = rows[0].id;

    const repo = createCvProfileRepo(db, key);
    const record = await repo.save({ userId, rawText, profile });

    // At rest: the column holds an AES-GCM envelope, never the plaintext.
    const stored = await db.query<{ encrypted_text: string }>(
      `SELECT encrypted_text FROM cv_profiles WHERE id = $1`,
      [record.id],
    );
    expect(stored.rows[0].encrypted_text).toMatch(/^v1:/);
    expect(stored.rows[0].encrypted_text).not.toContain("Lovelace");

    // Reads decrypt + map correctly.
    expect(await repo.getRawText(record.id)).toBe(rawText);
    const list = await repo.findByUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0].profile).toEqual(profile);

    // FK cascade: removing the user removes their CV profiles.
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
    const after = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM cv_profiles WHERE user_id = $1`,
      [userId],
    );
    expect(after.rows[0].n).toBe(0);
  }, 30_000);
});

describe("tailoring history + cascade", () => {
  it("persists tailoring with checklist + bullets, lists, loads, cascades", async () => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO users (email, auth_provider) VALUES ($1, $2) RETURNING id`,
      ["grace@example.com", "google"],
    );
    const userId = u.rows[0].id;
    const cv = await db.query<{ id: string }>(
      `INSERT INTO cv_profiles (user_id, encrypted_text, normalized)
       VALUES ($1, $2, $3::jsonb) RETURNING id`,
      [userId, "v1:stub", JSON.stringify(profile)],
    );
    const jd = await db.query<{ id: string }>(
      `INSERT INTO job_descriptions (user_id, raw_text) VALUES ($1, $2) RETURNING id`,
      [userId, "Senior RN engineer"],
    );

    const repo = createTailoringRepo(db);
    const saved = await repo.save({
      userId,
      cvProfileId: cv.rows[0].id,
      jobDescriptionId: jd.rows[0].id,
      matchScore: 82,
      checklist: [
        { requirement: "React Native", importance: "must", status: "met", rationale: "7y" },
        { requirement: "AWS", importance: "nice", status: "gap", rationale: "none found" },
      ],
      bullets: [
        { text: "Owned the mobile stack", grounding: "met", included: true },
        { text: "Led 12 engineers", grounding: "overclaim", included: false },
      ],
    });

    const summaries = await repo.listByUser(userId);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ id: saved.id, matchScore: 82 });

    const full = await repo.findById(saved.id);
    expect(full?.checklist).toHaveLength(2);
    expect(full?.bullets).toHaveLength(2);
    expect(full?.bullets[1]).toEqual({
      text: "Led 12 engineers",
      grounding: "overclaim",
      included: false,
    });

    // Cascade: deleting the tailoring removes its checklist items + bullets.
    await repo.deleteById(saved.id);
    const orphans = await db.query<{ n: number }>(
      `SELECT
         (SELECT count(*) FROM checklist_items WHERE tailoring_id = $1)
       + (SELECT count(*) FROM bullets WHERE tailoring_id = $1) AS n`,
      [saved.id],
    );
    expect(Number(orphans.rows[0].n)).toBe(0);
  }, 30_000);
});
