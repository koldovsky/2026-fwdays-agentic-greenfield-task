// apps/dashboard/components/ds — RequestCard (dashboard tasks.md §6.5,
// DESIGN.md "the hero — fields fill in live as STATE_DELTA events
// arrive"). Renders the collected intake fields (baseline spec's "Live
// request card state" requirement): identifying fields (name/age/format/
// weekday/time) at the top, the get-to-know fields inside a nested
// `LessonBrief`, an optional compiled `brief` string (for a pending-queue
// entry, whose fields already live in a compiled Ukrainian paragraph
// rather than individual `STATE_DELTA`-patched fields), an optional
// `StatusBadge`, and the `DecisionBar` when `showDecisionBar` is set
// (baseline spec's "New pending request appears in the queue" scenario:
// "the new request's card renders the DecisionBar").
//
// Every long-text value renders inside `BoundedText`/`LessonBrief`'s own
// bounded containers (`RequestCard.test.tsx`'s focused oversized-content
// test) so a multi-thousand-character answer never grows this card's own
// box and never adds a horizontal scrollbar (baseline spec's "Oversized
// and atypical field content" requirement).

import type { BookingStatus } from "@kamerton/lib/src/dashboard/hall-status.ts";
import type { RequestCardFields } from "../../lib/agui-client.ts";
import { BoundedText } from "./BoundedText.tsx";
import { Card } from "./Card.tsx";
import { DecisionBar } from "./DecisionBar.tsx";
import { LessonBrief } from "./LessonBrief.tsx";
import { StatusBadge } from "./StatusBadge.tsx";

export interface RequestCardProps {
  fields: RequestCardFields;
  /** A compiled first-lesson brief string (pending-queue entries carry this
   *  instead of/alongside individually-patched fields). */
  brief?: string | null;
  status?: BookingStatus;
  requestId?: number;
  showDecisionBar?: boolean;
}

function IdentifyingField({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  if (value === null || value.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
      <span className={`truncate text-sm text-text ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function RequestCard({ fields, brief = null, status, requestId, showDecisionBar = false }: RequestCardProps) {
  return (
    <Card raised className="flex w-full max-w-full min-w-0 flex-col gap-4 overflow-x-hidden p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-lg font-semibold text-text">{fields.studentName ?? "Нова заявка"}</h3>
        {status ? <StatusBadge status={status} /> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <IdentifyingField label="Вік" value={fields.studentAge !== null ? `${fields.studentAge} років` : null} mono />
        <IdentifyingField label="Формат" value={fields.format} />
        <IdentifyingField label="Дні" value={fields.preferredWeekdays} mono />
        <IdentifyingField label="Час" value={fields.preferredTimeRange} mono />
      </div>

      <LessonBrief
        goalText={fields.goalText}
        tastes={fields.tastes}
        dreamSong={fields.dreamSong}
        experience={fields.experience}
      />

      {brief !== null && brief.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Нотатки до першого заняття
          </span>
          {/* This block sits directly on the (raised) Card's own
           *  `bg-surface-raised`, not the page's base `--surface` or
           *  LessonBrief's `--surface-hover` — the "more below" fade must
           *  blend into THAT color. */}
          <BoundedText text={brief} maxHeightPx={160} fadeSurfaceVar="--surface-raised" />
        </div>
      ) : null}

      {showDecisionBar && requestId !== undefined ? <DecisionBar requestId={requestId} /> : null}
    </Card>
  );
}
