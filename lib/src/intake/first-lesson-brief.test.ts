// Relocation prerequisite for `dashboard` tasks.md §5 — this suite guards
// the behavior-preserving MOVE of `compileFirstLessonBrief` out of
// `packages/bot/src/pipeline.ts` into `lib/`, so it is written to PASS
// (green) once implemented, not red-first (this file's own header comment,
// mirrored from the implementation's header). Adapted from
// `packages/bot/src/pipeline.test.ts`'s own `compileFirstLessonBrief` suite:
// same two scenarios, but driving the function with a plain structural
// object literal instead of a real `@kamerton/db` `RequestRow` — proving
// `lib/` needs no `@kamerton/db` row (not even for a test) to exercise this
// function, per TC-PURE-01.

import { describe, expect, it } from "vitest";
import { compileFirstLessonBrief, type FirstLessonBriefInput } from "./first-lesson-brief.ts";

function baseInput(overrides: Partial<FirstLessonBriefInput> = {}): FirstLessonBriefInput {
  return {
    student_name: null,
    student_age: null,
    format: null,
    goal_tag: null,
    goal_text: null,
    tastes: null,
    dream_song: null,
    experience: null,
    comfort: null,
    preferred_weekdays: null,
    preferred_time_range: null,
    ...overrides,
  };
}

describe("compileFirstLessonBrief (relocated from packages/bot/src/pipeline.ts, dashboard tasks.md relocation prerequisite)", () => {
  // @trace FR-INTAKE-01
  // @trace FR-INTAKE-02
  // @trace FR-INTAKE-03
  it("compiles a brief from a fully-answered structural input — a plain object literal, no @kamerton/db row needed", () => {
    const brief = compileFirstLessonBrief(
      baseInput({
        student_name: "Оксана",
        student_age: 9,
        format: "individual",
        goal_tag: "hobby",
        goal_text: "для задоволення",
        tastes: "поп, джаз",
        dream_song: "Червона рута",
        experience: "ніколи не займалась",
        comfort: "трохи хвилюється",
        preferred_weekdays: "вівторок, четвер",
        preferred_time_range: "після 16:00",
      }),
    );

    expect(brief).toContain("Оксана");
    expect(brief).toContain("9");
    expect(brief).toContain("Червона рута");
    expect(brief).not.toContain("null");
  });

  // @trace FR-INTAKE-03
  it("explicitly marks a skipped goal/tastes, never silently omitting them", () => {
    const brief = compileFirstLessonBrief(
      baseInput({
        student_name: "Тарас",
        student_age: 8,
        format: "group",
        experience: "трохи співав у школі",
        comfort: "комфортно",
        preferred_weekdays: "субота",
        preferred_time_range: "вранці",
      }),
    );

    expect(brief.toLowerCase()).toMatch(/не назвав.*мет|пропущен/);
    expect(brief.toLowerCase()).toMatch(/не назвав.*смак|пропущен/);
  });

  it("pins the exact 9-line shape, one field per line, present even when every field is null", () => {
    const brief = compileFirstLessonBrief(baseInput());
    const lines = brief.split("\n");
    expect(lines).toHaveLength(9);
    expect(lines[0]).toMatch(/^Учень\/учениця: /);
    expect(lines[1]).toMatch(/^Вік: /);
    expect(lines[2]).toMatch(/^Формат: /);
    expect(lines[8]).toMatch(/^Бажаний час: /);
  });
});
