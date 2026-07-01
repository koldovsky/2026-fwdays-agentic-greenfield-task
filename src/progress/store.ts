import { isExpired } from '../clarify/store.js';

// Ephemeral in-memory `/progress` arming flag (ADR-0019, design D4): a tiny module-scoped Map keyed
// by Telegram chat_id holding only the armed-at timestamp, so the NEXT photo is read as progress.
// Nothing here touches the DB or the model (invariant #1). Expiry is LAZY — reuse the `isExpired`
// helper + TTL from clarify/store (rule #12 — no second TTL). `take` reads-and-removes so a single
// `/progress` arms at most one photo.

/** The store surface the bot depends on (injectable so `handlePhoto` stays unit-testable). */
export interface ProgressStore {
  arm: (chatId: bigint) => void;
  /** Read-and-remove: returns the armed-at timestamp once (or null if never armed). */
  take: (chatId: bigint) => Date | null;
}

const armed = new Map<bigint, Date>();

export const arm = (chatId: bigint): void => {
  armed.set(chatId, new Date());
};

export const take = (chatId: bigint): Date | null => {
  const at = armed.get(chatId);
  if (!at) {
    return null;
  }
  armed.delete(chatId);

  return at;
};

/** The process-wide singleton store wired in index.ts (the module Map behind the interface). */
export const progressStore: ProgressStore = { arm, take };

/** Re-exported so the bot can gate a taken flag on freshness without importing clarify directly. */
export { isExpired };
