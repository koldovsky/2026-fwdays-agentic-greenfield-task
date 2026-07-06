// apps/dashboard/components/ds — LessonBrief (dashboard tasks.md §6.5,
// DESIGN.md: "the teacher's prep sheet inside the request card,
// FR-INTAKE-06"): goal, tastes, dream song, experience — the get-to-know
// fields, each in its own bounded/scrollable region so a very long answer
// never grows the card (baseline spec's "Oversized and atypical field
// content" requirement). Renders nothing for a field that hasn't been
// collected yet (`null`) rather than an empty label.

import { BoundedText } from "./BoundedText.tsx";

export interface LessonBriefFields {
  goalText: string | null;
  tastes: string | null;
  dreamSong: string | null;
  experience: string | null;
}

function BriefField({ label, value }: { label: string; value: string | null }) {
  if (value === null || value.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
      {/* This field sits inside LessonBrief's own `bg-surface-hover` wrapper
       *  below, not the page's base `--surface` — the "more below" fade must
       *  blend into THAT color, or it reads as a mismatched seam. */}
      <BoundedText text={value} fadeSurfaceVar="--surface-hover" />
    </div>
  );
}

export function LessonBrief({ goalText, tastes, dreamSong, experience }: LessonBriefFields) {
  const hasAny = [goalText, tastes, dreamSong, experience].some((v) => v !== null && v.length > 0);
  if (!hasAny) return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-hover p-3 min-w-0">
      <BriefField label="Мета занять" value={goalText} />
      <BriefField label="Музичні смаки" value={tastes} />
      <BriefField label="Мрія-пісня" value={dreamSong} />
      <BriefField label="Досвід" value={experience} />
    </div>
  );
}
