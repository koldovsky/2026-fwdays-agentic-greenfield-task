import type { DailyStats } from "@/lib/types";
import type { TinyStartStorage } from "@/lib/storage/index";
import { localDateString } from "@/lib/storage/snooze";
import { isReflectionTagId, type ReflectionTagId } from "@/lib/recap/constants";

export interface DailyRecap {
  date: string;
  minutesFocused: number;
  tasksTouched: number;
  stepsCompleted: number;
  reflectionTags: ReflectionTagId[];
}

function emptyStats(date: string): DailyStats {
  return {
    date,
    minutesFocused: 0,
    sessionsCompleted: 0,
    tasksTouched: [],
    stepsCompleted: 0,
    reflectionTags: [],
  };
}

export function buildDailyRecap(stats: DailyStats | undefined, date: string): DailyRecap {
  const source = stats ?? emptyStats(date);

  return {
    date: source.date,
    minutesFocused: source.minutesFocused,
    tasksTouched: source.tasksTouched.length,
    stepsCompleted: source.stepsCompleted,
    reflectionTags: (source.reflectionTags ?? []).filter(isReflectionTagId),
  };
}

export function getTodayRecap(
  storage: TinyStartStorage,
  now = new Date(),
): DailyRecap {
  const date = localDateString(now);
  return buildDailyRecap(storage.getDailyStats(date), date);
}

export function toggleReflectionTag(
  stats: DailyStats,
  tagId: ReflectionTagId,
): DailyStats {
  const current = (stats.reflectionTags ?? []).filter(isReflectionTagId);
  const next = current.includes(tagId)
    ? current.filter((tag) => tag !== tagId)
    : [...current, tagId];

  return {
    ...stats,
    reflectionTags: next,
  };
}

export function saveReflectionTagToggle(
  storage: TinyStartStorage,
  tagId: ReflectionTagId,
  now = new Date(),
): DailyRecap {
  const date = localDateString(now);
  const existing = storage.getDailyStats(date) ?? emptyStats(date);
  const updated = toggleReflectionTag(existing, tagId);
  storage.upsertDailyStats(updated);
  return buildDailyRecap(updated, date);
}

export function getRecapHeadline(recap: DailyRecap): string {
  if (recap.minutesFocused === 0 && recap.tasksTouched === 0) {
    return "You opened the app. That counts too.";
  }

  return "You showed up. That counts.";
}

export function getRecapSubline(recap: DailyRecap): string {
  if (recap.minutesFocused === 0 && recap.tasksTouched === 0) {
    return "No pressure — tomorrow is a fresh tiny start.";
  }

  return "No streaks. No guilt. Just what you did today.";
}
