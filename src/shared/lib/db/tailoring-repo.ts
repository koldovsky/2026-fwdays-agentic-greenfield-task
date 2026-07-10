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

/**
 * The score + children written when a `pending` tailoring completes
 * (persist-tailoring-lifecycle, FR-TAILOR-04). Carries only the non-PII result
 * metadata — the JD row and job title are set on the `pending` insert
 * (`createPending`) so the completion path never re-touches them.
 */
export interface CompletePayload {
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
  const repo = {
    /**
     * Insert a `pending` tailoring at generation START (persist-tailoring-lifecycle,
     * FR-TAILOR-04, NFR-OBS-01). Carries only the JD linkage + extracted job title
     * (non-PII) + status; the score and children arrive later via `updateStatus`.
     * No CV text or PII is written here (NFR-SEC-01). Returns the new UUID.
     */
    async createPending(
      userId: string,
      jobDescriptionId: string,
      jobTitle: string | null,
      cvProfileId: string | null = null,
    ): Promise<string> {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO tailorings (user_id, cv_profile_id, job_description_id, job_title, match_score, status)
         VALUES ($1, $4, $2, $3, NULL, 'pending')
         RETURNING id`,
        [userId, jobDescriptionId, jobTitle, cvProfileId],
      );
      return rows[0].id;
    },

    /**
     * Move a `pending` tailoring to its terminal state (persist-tailoring-lifecycle).
     *
     * Transitions are **guarded + idempotent**: every UPDATE carries
     * `AND status = 'pending'` so a row that has already left the `pending` state
     * (e.g. swept to `failed` by the cleanup job, or already completed) is never
     * touched again. This enforces the one-way lifecycle pending → complete | failed
     * and makes the outcome order-independent (guard-tailoring-status-transitions).
     *
     * - `'complete'` with a `payload`: atomically set status + match_score while the
     *   row is still `pending`, then insert the checklist items and bullets. When the
     *   guarded UPDATE affects 0 rows (row already left `pending`) the child inserts
     *   are **skipped** — completion becomes a clean no-op and no orphan children are
     *   created. All statements run on the passed `db`; wrap it in a tx-scoped
     *   Queryable at the call site for all-or-nothing writes (the port stays
     *   transaction-agnostic).
     * - `'complete'` with no `payload`: set status only — a safe partial completion
     *   for a run that produced no children.
     * - `'failed'`: set status only (guard ensures a `complete` row is never
     *   overwritten by a late failure path).
     */
    async updateStatus(
      id: string,
      status: "complete" | "failed",
      payload?: CompletePayload,
    ): Promise<void> {
      if (status === "complete" && payload) {
        // Guard: only transition while the row is still `pending`. RETURNING id lets
        // us detect rows-affected via rows.length without a rowCount field (the port
        // exposes only `rows`, TC-PURE-01).
        const { rows: updated } = await db.query<{ id: string }>(
          `UPDATE tailorings SET status = 'complete', match_score = $2
           WHERE id = $1 AND status = 'pending'
           RETURNING id`,
          [id, payload.matchScore],
        );
        // If 0 rows were updated the row has already left `pending` — skip child
        // inserts so completion is a clean no-op (no orphan checklist_items/bullets).
        if (updated.length === 0) return;
        for (const item of payload.checklist) {
          await db.query(
            `INSERT INTO checklist_items (tailoring_id, requirement, importance, status, rationale)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, item.requirement, item.importance, item.status, item.rationale],
          );
        }
        for (const bullet of payload.bullets) {
          await db.query(
            `INSERT INTO bullets (tailoring_id, text, grounding, included)
             VALUES ($1, $2, $3, $4)`,
            [id, bullet.text, bullet.grounding, bullet.included],
          );
        }
        return;
      }
      // Guard: only transition while the row is still `pending` (covers both the
      // no-payload complete path and the failed path).
      await db.query(
        `UPDATE tailorings SET status = $2 WHERE id = $1 AND status = 'pending'`,
        [id, status],
      );
    },

    /**
     * Persist a completed tailoring in one call (backward-compatible wrapper over
     * `createPending` + `updateStatus('complete', payload)`). No behavior change for
     * existing callers: the returned record reflects the inserted row. Wrap the
     * passed `db` in a transaction at the call site for all-or-nothing writes.
     */
    async save(input: SaveTailoringInput): Promise<TailoringRecord> {
      const id = await repo.createPending(input.userId, input.jobDescriptionId, input.jobTitle, input.cvProfileId);
      await repo.updateStatus(id, "complete", {
        matchScore: input.matchScore,
        checklist: input.checklist,
        bullets: input.bullets,
      });
      const { rows } = await db.query<{ created_at: string | Date }>(
        `SELECT created_at FROM tailorings WHERE id = $1`,
        [id],
      );

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

    /**
     * History list for a user — summaries only, newest first (FR-HISTORY-01).
     * Only `complete` tailorings appear; `pending`/`failed` rows are lifecycle
     * bookkeeping and are filtered out (persist-tailoring-lifecycle).
     */
    async listByUser(userId: string): Promise<TailoringSummary[]> {
      const { rows } = await db.query<{
        id: string;
        job_title: string | null;
        match_score: number | null;
        created_at: string | Date;
      }>(
        `SELECT id, job_title, match_score, created_at
         FROM tailorings WHERE user_id = $1 AND status = 'complete' ORDER BY created_at DESC`,
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

    /**
     * Minimal read for the server-side export honesty gate
     * (server-side-export-gate, T5 #8, BC-HONESTY-02, NFR-SEC-04). Returns the
     * tailoring's owner + lifecycle status + the TEXTS of every persisted bullet
     * (regardless of `included` — see membership-gate.ts), or null if absent.
     *
     * Leaner than `findById` on purpose: the export gate needs neither the
     * checklist nor the JD/score/timestamps, only ownership (IDOR check), status
     * (must be `complete`), and the allowed bullet texts. No PII, no CV text.
     */
    async findExportGrant(
      id: string,
    ): Promise<{ id: string; userId: string; status: string; bullets: { text: string }[] } | null> {
      const { rows } = await db.query<{ id: string; user_id: string; status: string }>(
        `SELECT id, user_id, status FROM tailorings WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return null;
      const t = rows[0];
      const bullets = await db.query<{ text: string }>(
        `SELECT text FROM bullets WHERE tailoring_id = $1 ORDER BY ord`,
        [id],
      );
      return {
        id: t.id,
        userId: t.user_id,
        status: t.status,
        bullets: bullets.rows.map((b) => ({ text: b.text })),
      };
    },

    /** Delete a tailoring; FK cascade removes its checklist items + bullets. */
    async deleteById(id: string): Promise<void> {
      await db.query(`DELETE FROM tailorings WHERE id = $1`, [id]);
    },
  };
  return repo;
}

export type TailoringRepo = ReturnType<typeof createTailoringRepo>;
