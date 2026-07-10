import type { FocusSession } from "@/lib/types";
import { getBrowserStorage } from "@/lib/storage/browser";

type SessionSnapshot = {
  digest: string;
  session: FocusSession | null;
};

const snapshotCache = new Map<string, SessionSnapshot>();

const EMPTY_SNAPSHOT: SessionSnapshot = {
  digest: "",
  session: null,
};

function readSessionForTask(taskId: string): FocusSession | null {
  const active = getBrowserStorage().getActiveSession();
  if (!active || active.taskId !== taskId) {
    return null;
  }

  return active;
}

export function getCachedSessionSnapshot(taskId: string): FocusSession | null {
  const session = readSessionForTask(taskId);
  const digest = session ? JSON.stringify(session) : "";

  const cached = snapshotCache.get(taskId);
  if (cached?.digest === digest) {
    return cached.session;
  }

  const next: SessionSnapshot =
    digest === "" ? EMPTY_SNAPSHOT : { digest, session };

  snapshotCache.set(taskId, next);
  return next.session;
}

export function subscribeToSessionStore(onStoreChange: () => void) {
  window.addEventListener("tinystart:change", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("tinystart:change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
