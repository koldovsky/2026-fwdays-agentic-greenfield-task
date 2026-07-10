import { describe, expect, it } from "vitest";

import { createMemoryStorageAdapter } from "@/lib/storage/adapter";
import { TinyStartStorage } from "@/lib/storage/index";
import {
  buildDailyRecap,
  getRecapHeadline,
  getTodayRecap,
  saveReflectionTagToggle,
  toggleReflectionTag,
} from "@/lib/recap/daily-recap";

describe("daily recap", () => {
  it("builds recap stats from DailyStats", () => {
    const recap = buildDailyRecap(
      {
        date: "2026-07-10",
        minutesFocused: 12,
        sessionsCompleted: 2,
        tasksTouched: ["task_1", "task_2"],
        stepsCompleted: 3,
        reflectionTags: ["music"],
      },
      "2026-07-10",
    );

    expect(recap.minutesFocused).toBe(12);
    expect(recap.tasksTouched).toBe(2);
    expect(recap.stepsCompleted).toBe(3);
    expect(recap.reflectionTags).toEqual(["music"]);
  });

  it("reads today recap from storage", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());
    storage.upsertDailyStats({
      date: "2026-07-10",
      minutesFocused: 5,
      sessionsCompleted: 1,
      tasksTouched: ["task_1"],
      stepsCompleted: 1,
    });

    const recap = getTodayRecap(storage, new Date("2026-07-10T15:00:00"));
    expect(recap.minutesFocused).toBe(5);
    expect(recap.tasksTouched).toBe(1);
  });

  it("toggles reflection tags for today", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());
    const now = new Date("2026-07-10T15:00:00");

    saveReflectionTagToggle(storage, "music", now);
    let recap = getTodayRecap(storage, now);
    expect(recap.reflectionTags).toEqual(["music"]);

    saveReflectionTagToggle(storage, "music", now);
    recap = getTodayRecap(storage, now);
    expect(recap.reflectionTags).toEqual([]);
  });

  it("uses forgiving copy without guilt language", () => {
    expect(getRecapHeadline(buildDailyRecap(undefined, "2026-07-10"))).toContain(
      "counts",
    );
    expect(
      getRecapHeadline({
        date: "2026-07-10",
        minutesFocused: 5,
        tasksTouched: 1,
        stepsCompleted: 0,
        reflectionTags: [],
      }),
    ).toBe("You showed up. That counts.");
  });

  it("toggleReflectionTag adds and removes tags", () => {
    const base = {
      date: "2026-07-10",
      minutesFocused: 0,
      sessionsCompleted: 0,
      tasksTouched: [],
      stepsCompleted: 0,
    };

    const withTag = toggleReflectionTag(base, "breakdown");
    expect(withTag.reflectionTags).toEqual(["breakdown"]);

    const withoutTag = toggleReflectionTag(withTag, "breakdown");
    expect(withoutTag.reflectionTags).toEqual([]);
  });
});
