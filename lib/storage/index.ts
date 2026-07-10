import type { DailyStats, FocusSession, Task } from "@/lib/types";

import type { StorageAdapter } from "@/lib/storage/adapter";
import { mergeDailyStats } from "@/lib/storage/daily-stats";
import {
  STORAGE_KEY,
  createEmptyStore,
  type StoreData,
} from "@/lib/storage/schema";

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class TinyStartStorage {
  constructor(private readonly adapter: StorageAdapter) {}

  load(): StoreData {
    try {
      const raw = this.adapter.getItem(STORAGE_KEY);
      if (!raw) {
        return createEmptyStore();
      }

      const parsed = JSON.parse(raw) as StoreData;
      return {
        ...createEmptyStore(),
        ...parsed,
        tasks: parsed.tasks ?? [],
        sessions: parsed.sessions ?? [],
        dailyStats: parsed.dailyStats ?? [],
      };
    } catch {
      return createEmptyStore();
    }
  }

  save(data: StoreData): void {
    try {
      this.adapter.setItem(STORAGE_KEY, JSON.stringify(data));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tinystart:change"));
      }
    } catch {
      // Storage may be unavailable in private browsing or when quota is exceeded.
    }
  }

  getTasks(): Task[] {
    return this.load().tasks;
  }

  getTask(id: string): Task | undefined {
    return this.getTasks().find((task) => task.id === id);
  }

  upsertTask(task: Task): Task {
    const data = this.load();
    const index = data.tasks.findIndex((entry) => entry.id === task.id);
    const nextTask = { ...task, updatedAt: new Date().toISOString() };

    if (index === -1) {
      data.tasks = [...data.tasks, nextTask];
    } else {
      data.tasks = data.tasks.map((entry, entryIndex) =>
        entryIndex === index ? nextTask : entry,
      );
    }

    this.save(data);
    return nextTask;
  }

  deleteTask(id: string): void {
    const data = this.load();
    data.tasks = data.tasks.filter((task) => task.id !== id);
    this.save(data);
  }

  getActiveSession(): FocusSession | null {
    const session = this.load().activeSession;
    if (!session) {
      return null;
    }

    if (session.status === "active" || session.status === "paused") {
      return session;
    }

    return null;
  }

  setActiveSession(session: FocusSession | null): void {
    const data = this.load();
    data.activeSession = session;
    this.save(data);
  }

  getSessions(): FocusSession[] {
    return this.load().sessions;
  }

  archiveSession(session: FocusSession): void {
    const data = this.load();
    data.activeSession =
      data.activeSession?.id === session.id ? null : data.activeSession;
    data.sessions = [
      ...data.sessions.filter((entry) => entry.id !== session.id),
      session,
    ];
    this.save(data);
  }

  getDailyStats(date: string): DailyStats | undefined {
    return this.load().dailyStats.find((entry) => entry.date === date);
  }

  upsertDailyStats(stats: DailyStats): DailyStats {
    const data = this.load();
    const index = data.dailyStats.findIndex((entry) => entry.date === stats.date);
    const nextStats =
      index === -1
        ? stats
        : mergeDailyStats(data.dailyStats[index], stats);

    if (index === -1) {
      data.dailyStats = [...data.dailyStats, nextStats];
    } else {
      data.dailyStats = data.dailyStats.map((entry, entryIndex) =>
        entryIndex === index ? nextStats : entry,
      );
    }

    this.save(data);
    return nextStats;
  }

  clear(): void {
    this.adapter.removeItem(STORAGE_KEY);
  }

  getLastActiveTaskId(): string | undefined {
    return this.load().lastActiveTaskId;
  }

  setLastActiveTaskId(taskId: string): void {
    const data = this.load();
    data.lastActiveTaskId = taskId;
    this.save(data);
  }
}
