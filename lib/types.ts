export type EnergyLevel = "low" | "medium" | "high";

export type TaskStatus = "active" | "completed" | "archived";

export type FocusSessionStatus =
  | "active"
  | "paused"
  | "completed"
  | "abandoned";

export interface TaskStep {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  motivation?: string;
  energy?: EnergyLevel;
  steps: TaskStep[];
  status: TaskStatus;
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface FocusSession {
  id: string;
  taskId: string;
  stepId?: string;
  plannedMinutes: number;
  startedAt: string;
  endedAt?: string;
  pausedMs: number;
  pausedAt?: string;
  status: FocusSessionStatus;
}

export interface DailyStats {
  date: string;
  minutesFocused: number;
  sessionsCompleted: number;
  tasksTouched: string[];
  stepsCompleted: number;
  reflectionTags?: string[];
}
