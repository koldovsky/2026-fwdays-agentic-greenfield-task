import type { InboxSession } from "@/types/inbox";

const KEY = "esp.recentSessions.v1";
const MAX = 8;

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadRecentSessions(): InboxSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveSession(session: InboxSession): InboxSession[] {
  if (!isBrowser()) return [];
  const existing = loadRecentSessions().filter((s) => s.id !== session.id);
  const next = [session, ...existing].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
  return next;
}

export function updateSession(id: string, patch: Partial<InboxSession>): InboxSession[] {
  if (!isBrowser()) return [];
  const next = loadRecentSessions().map((s) =>
    s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
  );
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearSessions(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
}
