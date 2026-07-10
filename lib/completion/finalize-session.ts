import { getBrowserStorage } from "@/lib/storage/browser";
import type { FocusSession } from "@/lib/types";
import { recordCompletedSession } from "@/lib/completion/record-session";

export function finalizeFocusSession(session: FocusSession): void {
  const storage = getBrowserStorage();

  if (session.status === "completed") {
    recordCompletedSession(storage, session);
  }

  storage.setActiveSession(null);
  storage.archiveSession(session);
}
