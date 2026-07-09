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
import type { Slot } from "@kamerton/lib/src/slots/grid.ts";
import type { RequestCardFields } from "../../lib/agui-client.ts";
import { BoundedText } from "./BoundedText.tsx";
import { Card } from "./Card.tsx";
import { DecisionBar } from "./DecisionBar.tsx";
import { LessonBrief } from "./LessonBrief.tsx";
import { RequestTranscript } from "./RequestTranscript.tsx";
import { StatusBadge } from "./StatusBadge.tsx";

export interface RequestCardProps {
  fields: RequestCardFields;
  /** A compiled first-lesson brief string (pending-queue entries carry this
   *  instead of/alongside individually-patched fields). */
  brief?: string | null;
  status?: BookingStatus;
  requestId?: number;
  showDecisionBar?: boolean;
  /** Forwarded straight to `DecisionBar`'s own `candidateSlots` prop
   *  (booking-hitl S4's "Propose another time" picker) — optional so
   *  existing call sites that don't derive candidates yet still compile. */
  candidateSlots?: Slot[];
  /** The held slot's start, Europe/Kyiv wall-clock "YYYY-MM-DDTHH:mm" (a
   *  pending-queue entry's `slotStart`). When set, the card shows a prominent
   *  "Записаний на …" banner so the teacher immediately sees WHICH day/time
   *  the lead is booked for — the whole point of the queue. */
  bookedSlotStart?: string;
  /** When set (with a `requestId`), the card renders a collapsible
   *  `RequestTranscript` that lazy-loads the lead's full persisted
   *  conversation — so the teacher can read what was actually said, even for a
   *  conversation that finished before this dashboard tab was open. */
  showTranscript?: boolean;
}

/** Ukrainian short weekday labels (0 = Sunday), same style as HallMap/
 *  DecisionBar. */
const WEEKDAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

/** "2026-07-10T11:00" -> "Пт, 10.07 о 11:00" (Europe/Kyiv wall clock, already
 *  local — parsed as a calendar date so the weekday never shifts by timezone). */
function formatBookedSlot(slotStartIso: string): string {
  const [datePart, timePart = ""] = slotStartIso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return slotStartIso;
  const weekday = WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const time = timePart.slice(0, 5);
  return `${weekday}, ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")} о ${time}`;
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

export function RequestCard({
  fields,
  brief = null,
  status,
  requestId,
  showDecisionBar = false,
  candidateSlots,
  bookedSlotStart,
  showTranscript = false,
}: RequestCardProps) {
  return (
    <Card raised className="flex w-full max-w-full min-w-0 flex-col gap-4 overflow-x-hidden p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-lg font-semibold text-text">{fields.studentName ?? "Нова заявка"}</h3>
        {status ? <StatusBadge status={status} /> : null}
      </div>

      {bookedSlotStart !== undefined && bookedSlotStart.length > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-brand bg-brand-soft px-3 py-2">
          <span aria-hidden className="text-base leading-none">🗓️</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Записаний на</span>
          <span className="font-mono text-sm font-semibold text-text">{formatBookedSlot(bookedSlotStart)}</span>
        </div>
      ) : null}

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

      {showTranscript && requestId !== undefined ? <RequestTranscript requestId={requestId} /> : null}

      {showDecisionBar && requestId !== undefined ? (
        <DecisionBar requestId={requestId} candidateSlots={candidateSlots} />
      ) : null}
    </Card>
  );
}
