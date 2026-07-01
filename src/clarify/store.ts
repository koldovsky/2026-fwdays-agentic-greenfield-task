import type { OpenQuestion } from './types.js';

// Ephemeral in-memory Open Question store (ADR-0019): one small module-scoped Map keyed by Telegram
// chat_id, at most one pending question per user. Expiry is LAZY — a pure `isExpired` check on the
// next inbound message, never a timer/cron (invariant #5). Nothing here touches the DB or the model.

/** TTL for a pending Open Question (~10 min per ADR-0019/design open question); tune later. */
export const TTL_MS = 10 * 60 * 1000;

/** The store surface the bot depends on (injectable so handlers stay unit-testable). */
export interface ClarifyStore {
  set: (chatId: bigint, question: OpenQuestion) => void;
  peek: (chatId: bigint) => OpenQuestion | null;
  take: (chatId: bigint) => OpenQuestion | null;
}

const pending = new Map<bigint, OpenQuestion>();

export const set = (chatId: bigint, question: OpenQuestion): void => {
  pending.set(chatId, question);
};

export const peek = (chatId: bigint): OpenQuestion | null => pending.get(chatId) ?? null;

/** Read-and-remove: the resolve/expiry paths take the pending question so it can't be reused. */
export const take = (chatId: bigint): OpenQuestion | null => {
  const question = pending.get(chatId);
  if (!question) {
    return null;
  }
  pending.delete(chatId);

  return question;
};

/** The process-wide singleton store wired in index.ts (the module Map behind the interface). */
export const clarifyStore: ClarifyStore = { set, peek, take };

/** Pure TTL check against an injected clock — no timer, unit-testable (ADR-0019). */
export const isExpired = (askedAt: Date, now: Date): boolean =>
  now.getTime() - askedAt.getTime() > TTL_MS;
