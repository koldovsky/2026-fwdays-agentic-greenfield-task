// TTL cleanup for abandoned pending tailorings (persist-tailoring-lifecycle,
// NFR-COST-02, NFR-OBS-01). A `pending` row is created at generation START and
// reserves a free-tier slot; a browser-close / server-restart mid-run leaves the
// row `pending` forever, indefinitely locking that user's lifetime budget. This
// sweep marks rows that have been `pending` beyond a TTL as `failed`, releasing
// the intent to complete while keeping the audit trail.
//
// Framework-free (TC-PURE-01): depends only on the Queryable port + a computed
// cutoff timestamp — no next/*, no DOM, no fs, no clock global baked into the
// query. The caller (a cron job or a one-off maintenance script) supplies the
// TTL; the cutoff is computed here from `Date.now()` at call time. The UPDATE is
// bounded by `status = 'pending'`, so it is idempotent and safe to run
// concurrently — a row already flipped to `failed`/`complete` is never matched.
import type { Queryable } from "./port";

/**
 * Mark every tailoring that has been `pending` longer than `olderThanMs` as
 * `failed`. Returns the number of rows updated. Idempotent: re-running touches
 * only rows still `pending`.
 */
export async function markAbandonedPending(
  db: Queryable,
  olderThanMs: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  // RETURNING (not a driver-specific rowCount) keeps this on the Queryable port
  // contract, which exposes only `rows` (TC-PURE-01). One row per updated record.
  const { rows } = await db.query<{ id: string }>(
    `UPDATE tailorings SET status = 'failed'
     WHERE status = 'pending' AND created_at < $1
     RETURNING id`,
    [cutoff],
  );
  return rows.length;
}
