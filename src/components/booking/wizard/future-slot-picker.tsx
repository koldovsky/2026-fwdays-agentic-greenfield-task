"use client";

import { useState } from "react";

import type { SlotSelection } from "@/components/booking/availability-panel";
import {
  TENNIS_COURTS,
  TENNIS_SLOT_LABELS,
  type TennisCourt,
  consecutiveRunFrom,
  formatAggregatedSlotLabel,
} from "@/lib/booking/availability";
import type { Participant, SlotAssignment } from "@/lib/booking/wizard-types";
import { participantKey } from "@/lib/booking/wizard-types";

type FutureSlotPickerProps = {
  date: string;
  participants: Participant[];
  assignments: SlotAssignment[];
  onAssignmentsChange: (assignments: SlotAssignment[]) => void;
  participantLabel: (p: Participant) => string;
};

function blockedSlotsBeforeIndex(
  assignments: SlotAssignment[],
  participants: Participant[],
  activeIdx: number,
): Set<string> {
  const blocked = new Set<string>();
  for (const assignment of assignments) {
    const idx = participants.findIndex(
      (p) => participantKey(p) === participantKey(assignment.participant),
    );
    if (idx >= 0 && idx < activeIdx && !assignment.flexibleSlot) {
      blocked.add(assignment.slot.slot);
    }
  }
  return blocked;
}

function aggregatedLabelsForCount(
  count: number,
  blockedSlots: Set<string>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const slot of TENNIS_SLOT_LABELS) {
    const run = consecutiveRunFrom(TENNIS_SLOT_LABELS, slot, count, blockedSlots);
    if (run.length === count) {
      map[slot] = formatAggregatedSlotLabel(run);
    }
  }
  return map;
}

export function FutureSlotPicker({
  date,
  participants,
  assignments,
  onAssignmentsChange,
  participantLabel,
}: FutureSlotPickerProps) {
  const multiParticipant = participants.length > 1;
  const [courtMode, setCourtMode] = useState<"pick" | "any">("pick");
  const [selectedCourt, setSelectedCourt] = useState<TennisCourt>("East Court");

  const activeIdx = 0;
  const remaining = participants.length;
  const blocked = blockedSlotsBeforeIndex(assignments, participants, activeIdx);
  const allDone = assignments.length === participants.length;
  const isFlexible = assignments[0]?.flexibleSlot === true;

  const slotLabels = multiParticipant ? aggregatedLabelsForCount(remaining, blocked) : null;
  const displaySlots =
    multiParticipant && slotLabels
      ? TENNIS_SLOT_LABELS.filter((s) => slotLabels[s])
      : TENNIS_SLOT_LABELS;

  const groupBlockLabel =
    multiParticipant && allDone && !isFlexible
      ? formatAggregatedSlotLabel(assignments.map((a) => a.slot.slot))
      : null;

  const panelSelection: SlotSelection | null =
    assignments[0] && !isFlexible
      ? { court: assignments[0].slot.court, slot: assignments[0].slot.slot }
      : null;

  function clearAssignments() {
    onAssignmentsChange([]);
  }

  function handleSelect(sel: SlotSelection) {
    const run = consecutiveRunFrom(TENNIS_SLOT_LABELS, sel.slot, remaining, blocked);
    if (run.length !== remaining) return;

    onAssignmentsChange(
      participants.map((p, i) => ({
        participant: p,
        slot: { date, court: sel.court, slot: run[i]! },
        flexibleCourt: false,
        flexibleSlot: false,
      })),
    );
  }

  function handleAnyTime() {
    onAssignmentsChange(
      participants.map((p) => ({
        participant: p,
        slot: {
          date,
          court: courtMode === "any" ? "East Court" : selectedCourt,
          slot: "",
        },
        flexibleCourt: courtMode === "any",
        flexibleSlot: true,
      })),
    );
  }

  function handleAnyCourt() {
    setCourtMode("any");
    clearAssignments();
  }

  function handlePickCourt(court: TennisCourt) {
    setCourtMode("pick");
    setSelectedCourt(court);
    clearAssignments();
  }

  const activeCourt = courtMode === "any" ? null : selectedCourt;

  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-900">
        MHOA availability is not shown this far ahead. Pick a preferred court and time — we will
        book when the date opens.
      </p>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Court preference">
        {TENNIS_COURTS.map((court) => (
          <button
            key={court}
            type="button"
            role="tab"
            aria-selected={courtMode === "pick" && selectedCourt === court}
            onClick={() => handlePickCourt(court)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              courtMode === "pick" && selectedCourt === court
                ? "bg-violet-600 text-white"
                : "border border-zinc-200 bg-white"
            }`}
          >
            {court}
          </button>
        ))}
        <button
          type="button"
          onClick={handleAnyCourt}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            courtMode === "any" ? "bg-violet-600 text-white" : "border border-zinc-200 bg-white"
          }`}
        >
          Any court
        </button>
      </div>

      <button
        type="button"
        onClick={handleAnyTime}
        className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
          isFlexible
            ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
            : "border-zinc-200 bg-white hover:border-violet-300"
        }`}
      >
        <span className="font-medium">Any time (9 AM – 9 PM)</span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          First available slot when the booking window opens
        </span>
      </button>

      {multiParticipant && groupBlockLabel && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-950">
            {assignments[0]!.slot.court} · {groupBlockLabel}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {participants.map((p) => participantLabel(p)).join(" + ")} —{" "}
            {participants.length} consecutive slots
          </p>
        </div>
      )}

      {!allDone && !isFlexible && (
        <p className="text-sm font-medium text-violet-900">
          {multiParticipant
            ? `Pick a ${participants.length}-slot block on ${activeCourt ?? "any court"}`
            : `Choose a preferred slot on ${activeCourt ?? "any court"}`}
        </p>
      )}

      {!isFlexible && courtMode === "pick" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="font-semibold text-violet-950">{selectedCourt}</h3>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${selectedCourt} preferred slots`}>
            {displaySlots.map((slot) => {
              const display = slotLabels?.[slot] ?? slot;
              const selected =
                panelSelection?.court === selectedCourt && panelSelection.slot === slot;
              return (
                <li key={slot}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleSelect({ court: selectedCourt, slot })}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      selected
                        ? "bg-violet-600 text-white"
                        : "border border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                    }`}
                  >
                    {display}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!isFlexible && courtMode === "any" && !allDone && (
        <p className="text-sm text-zinc-600">
          Select &quot;Any time&quot; above, or pick a specific court to choose an exact slot.
        </p>
      )}
    </div>
  );
}
