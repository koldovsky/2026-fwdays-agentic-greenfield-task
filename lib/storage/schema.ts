import type { DailyStats, FocusSession, Task } from "@/lib/types";

export const STORAGE_KEY = "tinystart:v1";
export const STORE_VERSION = 1;

export interface StoreData {
  version: number;
  tasks: Task[];
  activeSession: FocusSession | null;
  sessions: FocusSession[];
  dailyStats: DailyStats[];
  lastActiveTaskId?: string;
}

export function createEmptyStore(): StoreData {
  return {
    version: STORE_VERSION,
    tasks: [],
    activeSession: null,
    sessions: [],
    dailyStats: [],
    lastActiveTaskId: undefined,
  };
}
