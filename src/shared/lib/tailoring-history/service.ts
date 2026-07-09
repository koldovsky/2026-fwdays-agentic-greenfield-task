// Tailoring-history read service (add-tailoring-history, FR-HISTORY-01/02). Pure
// orchestration over an injected tailorings port (the db repo satisfies it; a
// fake satisfies it in tests) — no session, no driver, no framework.
//
// The one non-trivial rule here is ownership (IDOR, NFR-SEC-02): `getHistoryItem`
// returns null for a record the caller does not own, so a route maps it to 404
// and the existence of another user's tailoring is never disclosed. The paid
// gate and the session boundary live at the route/page, not here.
import type { TailoringRecord, TailoringSummary } from "@/shared/lib/db";

export interface HistoryStores {
  readonly tailorings: {
    listByUser(userId: string): Promise<readonly TailoringSummary[]>;
    findById(id: string): Promise<TailoringRecord | null>;
  };
}

/** A user's tailoring summaries, newest first (the repo already orders them). */
export async function listHistory(
  stores: HistoryStores,
  userId: string,
): Promise<readonly TailoringSummary[]> {
  return stores.tailorings.listByUser(userId);
}

/**
 * One full stored tailoring the caller owns, or null. Returns null both when the
 * id does not exist AND when it belongs to another user — the caller cannot tell
 * the two apart (owner-scoped, no existence disclosure — NFR-SEC-02).
 */
export async function getHistoryItem(
  stores: HistoryStores,
  userId: string,
  id: string,
): Promise<TailoringRecord | null> {
  const record = await stores.tailorings.findById(id);
  if (record === null || record.userId !== userId) return null;
  return record;
}
