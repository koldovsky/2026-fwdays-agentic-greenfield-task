// Job-description repository (add-tailoring-history, FR-HISTORY-01). Minimal:
// persist the JD text a tailoring was run against, so a stored tailoring has the
// `job_description_id` FK it requires. Depends only on the Queryable port.
//
// JD text is not PII the way CV text is (NFR-SEC-01 encrypts CV at rest; the JD
// is the employer's public posting), so it is stored as plaintext per the
// 0001_init schema. It is removed on account delete via FK cascade
// (NFR-GDPR-02, verified in account.integration.test.ts). It is retained user
// input but is NOT currently surfaced in the GDPR export (NFR-GDPR-01 covers the
// CV profile + tailoring history); the export carries only job_description_id.
import type { Queryable } from "./port";

export interface JobDescriptionRecord {
  readonly id: string;
  readonly createdAt: string;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Build a job-description repository over a {@link Queryable}. */
export function createJobDescriptionRepo(db: Queryable) {
  return {
    /** Insert the JD text for a user; returns the new record. */
    async save(userId: string, rawText: string): Promise<JobDescriptionRecord> {
      const { rows } = await db.query<{ id: string; created_at: string | Date }>(
        `INSERT INTO job_descriptions (user_id, raw_text)
         VALUES ($1, $2)
         RETURNING id, created_at`,
        [userId, rawText],
      );
      return { id: rows[0].id, createdAt: toIso(rows[0].created_at) };
    },
  };
}

export type JobDescriptionRepo = ReturnType<typeof createJobDescriptionRepo>;
