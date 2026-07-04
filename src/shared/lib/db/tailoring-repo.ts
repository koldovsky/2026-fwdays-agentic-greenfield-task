// Tailoring repository (FR-TAILOR-04, FR-HISTORY-01/02). Persists a tailoring
// with its checklist items and bullets, and serves per-user history. Depends only
// on the Queryable port + shared types — no entities layer, no concrete driver.
import type { ChecklistStatus } from "@/shared/lib/scoring";
import type { Queryable } from "./port";

export type Importance = "must" | "nice";
export type Grounding = "met" | "partial" | "overclaim" | "manual";

export interface ChecklistItemInput {
  readonly requirement: string;
  readonly importance: Importance;
  readonly status: ChecklistStatus;
  readonly rationale: string;
}

export interface BulletInput {
  readonly text: string;
  readonly grounding: Grounding;
  readonly included: boolean;
}

export interface SaveTailoringInput {
  readonly userId: string;
  /**
   * Owning CV profile, or null. Nullable since add-tailoring-history: history is
   * persisted at generation time, where only the structured cvProfile (not the
   * raw text needed to encrypt a cv_profiles row) is available (migration 0004).
   */
  readonly cvProfileId: string | null;
  readonly jobDescriptionId: string;
  /** Role extracted from the JD for the history list, or null (FR-HISTORY-01). */
  readonly jobTitle: string | null;
  readonly matchScore: number | null;
  readonly checklist: readonly ChecklistItemInput[];
  readonly bullets: readonly BulletInput[];
}

export interface TailoringSummary {
  readonly id: string;
  readonly jobTitle: string | null;
  readonly matchScore: number | null;
  readonly createdAt: string;
}

export interface TailoringRecord extends TailoringSummary {
  readonly userId: string;
  readonly cvProfileId: string | null;
  readonly jobDescriptionId: string;
  readonly checklist: readonly ChecklistItemInput[];
  readonly bullets: readonly BulletInput[];
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Build a tailoring repository over a {@link Queryable}.
 *
 * NOTE: `save` performs several inserts; wrap the passed `db` in a transaction
 * (a tx-scoped Queryable) at the call site for all-or-nothing writes. The port
 * stays transaction-agnostic so any driver can supply one.
 */
export function createTailoringRepo(db: Queryable) {
  return {
    async save(input: SaveTailoringInput): Promise<TailoringRecord> {
      const { rows } = await db.query<{ id: string; created_at: string | Date }>(
        `INSERT INTO tailorings (user_id, cv_profile_id, job_description_id, job_title, match_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [
          input.userId,
          input.cvProfileId,
          input.jobDescriptionId,
          input.jobTitle,
          input.matchScore,
        ],
      );
      const id = rows[0].id;

      for (const item of input.checklist) {
        await db.query(
          `INSERT INTO checklist_items (tailoring_id, requirement, importance, status, rationale)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.requirement, item.importance, item.status, item.rationale],
        );
      }
      for (const bullet of input.bullets) {
        await db.query(
          `INSERT INTO bullets (tailoring_id, text, grounding, included)
           VALUES ($1, $2, $3, $4)`,
          [id, bullet.text, bullet.grounding, bullet.included],
        );
      }

      return {
        id,
        userId: input.userId,
        cvProfileId: input.cvProfileId,
        jobDescriptionId: input.jobDescriptionId,
        jobTitle: input.jobTitle,
        matchScore: input.matchScore,
        createdAt: toIso(rows[0].created_at),
        checklist: input.checklist,
        bullets: input.bullets,
      };
    },

    /** History list for a user — summaries only, newest first (FR-HISTORY-01). */
    async listByUser(userId: string): Promise<TailoringSummary[]> {
      const { rows } = await db.query<{
        id: string;
        job_title: string | null;
        match_score: number | null;
        created_at: string | Date;
      }>(
        `SELECT id, job_title, match_score, created_at
         FROM tailorings WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      );
      return rows.map((r) => ({
        id: r.id,
        jobTitle: r.job_title,
        matchScore: r.match_score,
        createdAt: toIso(r.created_at),
      }));
    },

    /** Full tailoring with checklist + bullets (FR-HISTORY-02), or null if absent. */
    async findById(id: string): Promise<TailoringRecord | null> {
      const { rows } = await db.query<{
        id: string;
        user_id: string;
        cv_profile_id: string | null;
        job_description_id: string;
        job_title: string | null;
        match_score: number | null;
        created_at: string | Date;
      }>(
        `SELECT id, user_id, cv_profile_id, job_description_id, job_title, match_score, created_at
         FROM tailorings WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return null;
      const t = rows[0];

      const checklist = await db.query<ChecklistItemInput>(
        `SELECT requirement, importance, status, rationale
         FROM checklist_items WHERE tailoring_id = $1 ORDER BY ord`,
        [id],
      );
      const bullets = await db.query<BulletInput>(
        `SELECT text, grounding, included FROM bullets WHERE tailoring_id = $1 ORDER BY ord`,
        [id],
      );

      return {
        id: t.id,
        userId: t.user_id,
        cvProfileId: t.cv_profile_id,
        jobDescriptionId: t.job_description_id,
        jobTitle: t.job_title,
        matchScore: t.match_score,
        createdAt: toIso(t.created_at),
        checklist: [...checklist.rows],
        bullets: [...bullets.rows],
      };
    },

    /** Delete a tailoring; FK cascade removes its checklist items + bullets. */
    async deleteById(id: string): Promise<void> {
      await db.query(`DELETE FROM tailorings WHERE id = $1`, [id]);
    },
  };
}

export type TailoringRepo = ReturnType<typeof createTailoringRepo>;
