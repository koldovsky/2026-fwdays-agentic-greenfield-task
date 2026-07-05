// GDPR account service against pglite (NFR-GDPR-01/02): a user with a CV
// profile and a tailoring exports everything we hold (including decrypted CV
// text) and can hard-delete the account, cascading to every child table.
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { createCvProfileRepo } from "@/shared/lib/db/cv-profile-repo";
import { runMigrations } from "@/shared/lib/db/migrate";
import type { Queryable } from "@/shared/lib/db/port";
import { createTailoringRepo } from "@/shared/lib/db/tailoring-repo";
import { createUserRepo } from "@/shared/lib/db/user-repo";
import type { CvProfile } from "@/shared/lib/scoring";
import { deleteAccount, exportAccountData } from "./service";

function adapter(pg: PGlite): Queryable {
  return {
    async query<Row>(sql: string, params?: readonly unknown[]) {
      const res = await pg.query<Row>(sql, params ? [...params] : undefined);
      return { rows: res.rows };
    },
  };
}

const key = randomBytes(32);
const profile: CvProfile = { skills: ["react"], sentences: ["Built an API"] };
const rawText = "Ada Lovelace — React engineer, приватні дані";

let db: Queryable;

beforeAll(async () => {
  db = adapter(new PGlite());
  await runMigrations(db);
}, 30_000);

function stores() {
  return {
    users: createUserRepo(db),
    cvProfiles: createCvProfileRepo(db, key),
    tailorings: createTailoringRepo(db),
  };
}

async function seedUserWithData() {
  const s = stores();
  const user = await s.users.create({ email: `u${Date.now()}@example.com`, name: "Ada", authProvider: "password" });
  const cv = await s.cvProfiles.save({ userId: user.id, rawText, profile });
  const jd = await db.query<{ id: string }>(
    `INSERT INTO job_descriptions (user_id, raw_text) VALUES ($1, $2) RETURNING id`,
    [user.id, "Senior engineer"],
  );
  await s.tailorings.save({
    userId: user.id,
    cvProfileId: cv.id,
    jobDescriptionId: jd.rows[0].id,
    jobTitle: "Senior engineer",
    matchScore: 77,
    checklist: [{ requirement: "React", importance: "must", status: "met", rationale: "so" }],
    bullets: [{ text: "Built an API", grounding: "met", included: true }],
  });
  // Seed the highest-consequence GDPR-delete children too: billing state and the
  // password hash must not survive a hard delete (NFR-GDPR-02).
  await db.query(
    `INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, 'pro', 'active')`,
    [user.id],
  );
  await db.query(
    `INSERT INTO usage_counters (user_id, tailorings_used) VALUES ($1, 3)`,
    [user.id],
  );
  await db.query(`INSERT INTO credentials (user_id, password_hash) VALUES ($1, $2)`, [
    user.id,
    "v1:stub-hash",
  ]);
  return { user, cvId: cv.id };
}

describe("exportAccountData", () => {
  it("returns user, decrypted CV text, and full tailoring history", async () => {
    const { user } = await seedUserWithData();

    const data = await exportAccountData(stores(), user.id);
    expect(data).not.toBeNull();
    expect(data?.user).toMatchObject({ id: user.id, email: user.email, name: "Ada" });
    expect(data?.cvProfiles).toHaveLength(1);
    expect(data?.cvProfiles[0].rawText).toBe(rawText);
    expect(data?.cvProfiles[0].profile).toEqual(profile);
    expect(data?.tailorings).toHaveLength(1);
    expect(data?.tailorings[0]).toMatchObject({ matchScore: 77 });
  }, 30_000);

  it("returns null for an unknown user", async () => {
    const data = await exportAccountData(stores(), "00000000-0000-0000-0000-000000000000");
    expect(data).toBeNull();
  });
});

describe("deleteAccount", () => {
  it("hard-deletes the user and cascades to all children", async () => {
    const { user } = await seedUserWithData();

    await deleteAccount(stores(), user.id);

    expect(await stores().users.findById(user.id)).toBeNull();
    // Every users-referencing table must be empty after the hard delete — most
    // critically subscriptions (billing) and credentials (password hash), plus
    // the tailoring children (checklist_items, bullets) keyed off tailorings.
    const orphans = await db.query<{ n: number }>(
      `SELECT
         (SELECT count(*) FROM cv_profiles WHERE user_id = $1)
       + (SELECT count(*) FROM tailorings WHERE user_id = $1)
       + (SELECT count(*) FROM job_descriptions WHERE user_id = $1)
       + (SELECT count(*) FROM subscriptions WHERE user_id = $1)
       + (SELECT count(*) FROM usage_counters WHERE user_id = $1)
       + (SELECT count(*) FROM credentials WHERE user_id = $1)
       + (SELECT count(*) FROM checklist_items WHERE tailoring_id IN
            (SELECT id FROM tailorings WHERE user_id = $1))
       + (SELECT count(*) FROM bullets WHERE tailoring_id IN
            (SELECT id FROM tailorings WHERE user_id = $1)) AS n`,
      [user.id],
    );
    expect(Number(orphans.rows[0].n)).toBe(0);
  }, 30_000);

  it("does not over-delete: another user's data survives", async () => {
    const victim = await seedUserWithData();
    const bystander = await seedUserWithData();

    await deleteAccount(stores(), victim.user.id);

    expect(await stores().users.findById(bystander.user.id)).not.toBeNull();
    const survivors = await db.query<{ n: number }>(
      `SELECT
         (SELECT count(*) FROM cv_profiles WHERE user_id = $1)
       + (SELECT count(*) FROM tailorings WHERE user_id = $1)
       + (SELECT count(*) FROM subscriptions WHERE user_id = $1)
       + (SELECT count(*) FROM credentials WHERE user_id = $1) AS n`,
      [bystander.user.id],
    );
    expect(Number(survivors.rows[0].n)).toBe(4);
  }, 30_000);
});
