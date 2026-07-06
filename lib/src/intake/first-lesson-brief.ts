// @kamerton/lib — pure first-lesson brief compiler (dashboard tasks.md §5
// "Relocation prerequisite"). Moved from packages/bot/src/pipeline.ts (S2
// `intake` tasks.md 5.4, where it was first written and tested) so
// apps/dashboard's server-side glue (dashboard-db.ts, tasks.md §5.5) can
// reuse it without importing packages/bot (which pulls in grammY) — and
// without lib/ picking up a runtime (or even type-only) dependency on
// `@kamerton/db` (TC-PURE-01: lib/ stays framework-free, zero package
// dependencies, per S1/S2 precedent, e.g. `dashboard/hall-status.ts`'s own
// header comment making the same choice for `BookingStatus`).
//
// `FirstLessonBriefInput` is a STRUCTURAL subset of a `requests` row —
// `@kamerton/db`'s `RequestRow` satisfies it structurally (having MORE
// fields than an interface requires is fine for an already-typed value
// passed through; TypeScript's excess-property check only applies to object
// LITERALS, not to variables), so `packages/bot/src/pipeline.ts` passes its
// `RequestRow` straight through unchanged, no adapter/mapping step needed.
//
// Behavior-preserving move: output is byte-for-byte identical to the
// original `packages/bot/src/pipeline.ts` implementation it replaces
// (verified by this file's test, adapted from `pipeline.test.ts`'s own
// `compileFirstLessonBrief` suite — both suites now exercise this SAME
// code, not two copies of it). `pipeline.ts` now imports and re-exports
// `compileFirstLessonBrief` from here so its own (unchanged) tests keep
// passing.

/** Mirrors `@kamerton/db`'s `RequestFormat` values, duplicated here as a
 *  literal type (not an import) so `lib/` needs zero dependency — not even
 *  type-only — on `@kamerton/db` (TC-PURE-01). */
export type FirstLessonBriefFormat = "individual" | "group" | null;

/** Mirrors `@kamerton/db`'s `RequestGoalTag` values, same reasoning as
 *  `FirstLessonBriefFormat` above. */
export type FirstLessonBriefGoalTag =
  | "karaoke"
  | "performance"
  | "confidence"
  | "hobby"
  | "other"
  | null;

/** The subset of a `requests` row `compileFirstLessonBrief` reads — a
 *  structural type so `lib/` needs no `@kamerton/db` import at all. */
export interface FirstLessonBriefInput {
  student_name: string | null;
  student_age: number | null;
  format: FirstLessonBriefFormat;
  goal_tag: FirstLessonBriefGoalTag;
  goal_text: string | null;
  tastes: string | null;
  dream_song: string | null;
  experience: string | null;
  comfort: string | null;
  preferred_weekdays: string | null;
  preferred_time_range: string | null;
}

/** Ukrainian label for a `format` column value — administrator-facing only,
 *  never sent to a lead (that copy lives in `@kamerton/lib`'s guardrail
 *  constants, `intake/copy.ts`). */
function formatLabel(format: FirstLessonBriefInput["format"]): string {
  if (format === "individual") return "індивідуальні";
  if (format === "group") return "групові";
  return "—";
}

const GOAL_TAG_LABELS: Record<string, string> = {
  karaoke: "караоке",
  performance: "виступи",
  confidence: "впевненість у собі",
  hobby: "для задоволення",
  other: "інше",
};

function goalTagLabel(goalTag: FirstLessonBriefInput["goal_tag"]): string {
  if (goalTag === null) return "";
  return GOAL_TAG_LABELS[goalTag] ?? goalTag;
}

/**
 * Composes the administrator-facing first-lesson brief from an
 * already-collected request row (`@trace FR-INTAKE-01..06`). Pure,
 * synchronous, no I/O. `goal_tag`/`goal_text` and `tastes`/`dream_song` DO
 * have skip variants and so may be `null`: a null goal or null tastes is
 * rendered as an EXPLICIT "лід не назвав мету занять" / "лід не назвав
 * музичні смаки" marker line, never silently omitted.
 */
export function compileFirstLessonBrief(row: FirstLessonBriefInput): string {
  const lines: string[] = [];

  lines.push(`Учень/учениця: ${row.student_name ?? "—"}`);
  lines.push(`Вік: ${row.student_age ?? "—"}`);
  lines.push(`Формат: ${formatLabel(row.format)}`);

  if (row.goal_tag !== null || row.goal_text !== null) {
    const tagLabel = goalTagLabel(row.goal_tag);
    const detail = [tagLabel, row.goal_text ?? undefined].filter((part) => part !== undefined && part !== "");
    lines.push(`Мета занять: ${detail.length > 0 ? detail.join(" — ") : "—"}`);
  } else {
    lines.push("Мета занять: лід не назвав мету занять");
  }

  if (row.tastes !== null || row.dream_song !== null) {
    const parts: string[] = [];
    if (row.tastes !== null) parts.push(row.tastes);
    if (row.dream_song !== null) parts.push(`мрія-пісня: ${row.dream_song}`);
    lines.push(`Музичні смаки: ${parts.join("; ")}`);
  } else {
    lines.push("Музичні смаки: лід не назвав музичні смаки");
  }

  lines.push(`Досвід: ${row.experience ?? "—"}`);
  lines.push(`Комфорт зі співом: ${row.comfort ?? "—"}`);
  lines.push(`Бажані дні: ${row.preferred_weekdays ?? "—"}`);
  lines.push(`Бажаний час: ${row.preferred_time_range ?? "—"}`);

  return lines.join("\n");
}
