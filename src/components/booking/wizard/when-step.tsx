"use client";

import { useEffect, useState } from "react";

import { AvailabilityPanel, type SlotSelection } from "@/components/booking/availability-panel";
import { FutureSlotPicker } from "@/components/booking/wizard/future-slot-picker";
import type { AvailabilityResult } from "@/lib/booking/availability";
import {
  buildAggregatedSlotLabels,
  consecutiveRunFrom,
  filterAvailabilityForGroup,
  formatAggregatedSlotLabel,
} from "@/lib/booking/availability";
import {
  getTennisAvailability,
  peekTennisAvailability,
  retryTennisAvailability,
} from "@/lib/booking/availability-cache";
import { getResidentById } from "@/lib/booking/residents";
import type { Participant, SlotAssignment } from "@/lib/booking/wizard-types";
import { participantKey } from "@/lib/booking/wizard-types";
import {
  formatOpensAtLabel,
  getBookableDates,
  getMaxSchedulableDate,
  getMinSchedulableDate,
  getOpensAt,
  isSchedulableDate,
} from "@/lib/booking/tennis-window";

function participantLabel(p: Participant): string {
  if (p.kind === "profile") {
    return getResidentById(p.residentId)?.label ?? p.residentId;
  }
  return "Other guest";
}

function blockedSlotsBeforeIndex(
  assignments: SlotAssignment[],
  participants: Participant[],
  activeIdx: number,
): Map<string, Set<string>> {
  const blocked = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const idx = participants.findIndex(
      (p) => participantKey(p) === participantKey(assignment.participant),
    );
    if (idx >= 0 && idx < activeIdx) {
      const court = assignment.slot.court;
      const set = blocked.get(court) ?? new Set<string>();
      set.add(assignment.slot.slot);
      blocked.set(court, set);
    }
  }
  return blocked;
}

type WhenStepProps = {
  participants: Participant[];
  assignments: SlotAssignment[];
  onAssignmentsChange: (assignments: SlotAssignment[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function WhenStep({
  participants,
  assignments,
  onAssignmentsChange,
  onBack,
  onNext,
}: WhenStepProps) {
  const bookableDates = getBookableDates(new Date(), 7);
  const [dateSource, setDateSource] = useState<"tabs" | "picker">("tabs");
  const [selectedDate, setSelectedDate] = useState(bookableDates[0] ?? "");
  const [pickerDate, setPickerDate] = useState(getMinSchedulableDate());
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(
    () => !(bookableDates[0] && peekTennisAvailability(bookableDates[0])),
  );
  const [availability, setAvailability] = useState<AvailabilityResult | null>(() => {
    const first = bookableDates[0];
    return first ? peekTennisAvailability(first) ?? null : null;
  });

  const effectiveDate = dateSource === "picker" ? pickerDate : selectedDate;
  const isFutureSchedule = isSchedulableDate(effectiveDate);

  const activeParticipant = participants[activeIdx];
  const completedCount = assignments.length;
  const allDone = completedCount === participants.length;

  useEffect(() => {
    if (isFutureSchedule || !effectiveDate) return;

    const cached = peekTennisAvailability(effectiveDate);
    if (cached) {
      setAvailability(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setAvailability(null);

    void getTennisAvailability(effectiveDate).then((result) => {
      if (!cancelled) {
        setAvailability(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [effectiveDate, isFutureSchedule]);

  const takenSlots: SlotSelection[] = assignments
    .filter((a) => !a.flexibleSlot)
    .map((a) => ({
      court: a.slot.court,
      slot: a.slot.slot,
    }));

  const currentAssignment = activeParticipant
    ? assignments.find((a) => participantKey(a.participant) === participantKey(activeParticipant))
    : undefined;

  const multiParticipant = participants.length > 1;
  const blockedBeforeActive = blockedSlotsBeforeIndex(assignments, participants, activeIdx);

  const panelAvailability =
    availability && availability.status === "ok"
      ? filterAvailabilityForGroup(
          availability,
          participants.length,
          activeIdx,
          blockedBeforeActive,
        )
      : availability;

  const slotLabels =
    availability && availability.status === "ok"
      ? buildAggregatedSlotLabels(
          availability,
          participants.length,
          activeIdx,
          blockedBeforeActive,
        )
      : undefined;

  const groupBlockLabel =
    multiParticipant && assignments.length === participants.length && !assignments[0]?.flexibleSlot
      ? formatAggregatedSlotLabel(assignments.map((a) => a.slot.slot))
      : null;

  const panelSelection: SlotSelection | null =
    multiParticipant && assignments.length > 0 && !assignments[0]?.flexibleSlot
      ? { court: assignments[0]!.slot.court, slot: assignments[0]!.slot.slot }
      : currentAssignment && !currentAssignment.flexibleSlot
        ? { court: currentAssignment.slot.court, slot: currentAssignment.slot.slot }
        : null;

  function resetAssignments() {
    onAssignmentsChange([]);
    setActiveIdx(0);
  }

  function handleRetryAvailability() {
    if (!effectiveDate || isFutureSchedule) return;
    setLoading(true);
    void retryTennisAvailability(effectiveDate).then((result) => {
      setAvailability(result);
      setLoading(false);
    });
  }

  function handleSelect(sel: SlotSelection) {
    if (!activeParticipant || !availability || availability.status !== "ok") return;

    const courtData = availability.courts.find((c) => c.court === sel.court);
    if (!courtData) return;

    const remaining = participants.length - activeIdx;
    const blocked =
      blockedSlotsBeforeIndex(assignments, participants, activeIdx).get(sel.court) ??
      new Set<string>();

    const run = consecutiveRunFrom(courtData.slots, sel.slot, remaining, blocked);
    if (run.length !== remaining) return;

    const kept = assignments.filter((a) => {
      const idx = participants.findIndex(
        (p) => participantKey(p) === participantKey(a.participant),
      );
      return idx >= 0 && idx < activeIdx;
    });

    const next: SlotAssignment[] = [...kept];
    for (let i = 0; i < remaining; i++) {
      next.push({
        participant: participants[activeIdx + i]!,
        slot: { date: effectiveDate, court: sel.court, slot: run[i]! },
      });
    }

    onAssignmentsChange(next);
    setActiveIdx(participants.length - 1);
  }

  function goToParticipant(idx: number) {
    if (multiParticipant) {
      onAssignmentsChange([]);
      setActiveIdx(0);
      return;
    }
    setActiveIdx(idx);
  }

  function selectTabDate(date: string) {
    setDateSource("tabs");
    setSelectedDate(date);
    resetAssignments();
  }

  function selectScheduleLater() {
    setDateSource("picker");
    setPickerDate((current) =>
      isSchedulableDate(current) ? current : getMinSchedulableDate(),
    );
    resetAssignments();
  }

  function selectPickerDate(date: string) {
    if (!date || !isSchedulableDate(date)) return;
    setDateSource("picker");
    setPickerDate(date);
    resetAssignments();
  }

  const opensAtLabel = isFutureSchedule
    ? formatOpensAtLabel(getOpensAt(effectiveDate))
    : null;

  return (
    <section aria-labelledby="when-heading" className="space-y-6">
      <div>
        <h2 id="when-heading" className="text-xl font-semibold text-emerald-950">
          When — pick a slot for each person
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {multiParticipant
            ? "Pick one combined time block — each person gets the next 45-minute slot in that block."
            : "Each participant gets one slot."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Bookable dates">
        {bookableDates.map((date) => {
          const active = dateSource === "tabs" && date === selectedDate;
          const label = new Date(date + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTabDate(date)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-emerald-600 text-white" : "border border-zinc-200 bg-white"
              }`}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={dateSource === "picker"}
          onClick={selectScheduleLater}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            dateSource === "picker"
              ? "bg-amber-600 text-white"
              : "border border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          Schedule later
        </button>
      </div>

      {dateSource === "picker" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <label htmlFor="schedule-later-date" className="text-sm font-medium text-amber-950">
            Pick a future date (beyond 7 days)
          </label>
          <input
            id="schedule-later-date"
            type="date"
            aria-label="Future booking date"
            min={getMinSchedulableDate()}
            max={getMaxSchedulableDate()}
            value={pickerDate}
            onChange={(e) => selectPickerDate(e.target.value)}
            className="mt-2 block w-full max-w-xs rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
          />
          {isFutureSchedule && opensAtLabel && (
            <p className="mt-2 text-xs text-amber-900">
              Opens on MHOA: <strong>{opensAtLabel}</strong>
            </p>
          )}
        </div>
      )}

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

      {!multiParticipant && !isFutureSchedule && (
        <ul className="space-y-2">
          {participants.map((p, idx) => {
            const key = participantKey(p);
            const assigned = assignments.find((a) => participantKey(a.participant) === key);
            const isActive = idx === activeIdx;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => goToParticipant(idx)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
                    isActive
                      ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                      : assigned
                        ? "border-emerald-200 bg-emerald-50/80"
                        : "border-zinc-200 bg-white"
                  }`}
                >
                  <span className="font-medium">
                    {idx + 1}. {participantLabel(p)}
                  </span>
                  {assigned ? (
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      {assigned.flexibleSlot
                        ? "Any time (9 AM – 9 PM)"
                        : `${assigned.slot.court} · ${assigned.slot.slot}`}
                    </span>
                  ) : isActive ? (
                    <span className="mt-0.5 block text-xs text-violet-700">Choose a slot below</span>
                  ) : (
                    <span className="mt-0.5 block text-xs text-zinc-400">Waiting</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {multiParticipant && !groupBlockLabel && !isFutureSchedule && (
        <ul className="space-y-2">
          {participants.map((p, idx) => (
            <li
              key={participantKey(p)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500"
            >
              {idx + 1}. {participantLabel(p)}
            </li>
          ))}
        </ul>
      )}

      {activeParticipant && !allDone && multiParticipant && !isFutureSchedule && (
        <p className="text-sm font-medium text-violet-900">
          Pick a {participants.length}-slot block on one court
        </p>
      )}

      {activeParticipant && !allDone && !multiParticipant && !isFutureSchedule && (
        <p className="text-sm font-medium text-violet-900">
          Choosing slot for {participantLabel(activeParticipant)} (1 of 1)
        </p>
      )}

      {isFutureSchedule ? (
        <FutureSlotPicker
          date={effectiveDate}
          participants={participants}
          assignments={assignments}
          onAssignmentsChange={onAssignmentsChange}
          participantLabel={participantLabel}
        />
      ) : (
        <AvailabilityPanel
          availability={
            panelAvailability ?? {
              status: "error",
              date: effectiveDate,
              reason: "",
              fetchedAt: "",
            }
          }
          windowStart="00:00"
          windowEnd="23:59"
          selection={panelSelection}
          onSelect={handleSelect}
          loading={loading}
          takenSlots={takenSlots.filter(
            (t) =>
              !(
                panelSelection &&
                t.court === panelSelection.court &&
                t.slot === panelSelection.slot
              ),
          )}
          emptyHint={
            multiParticipant && !loading && panelAvailability?.status === "ok"
              ? "No back-to-back blocks for this many people on this date — try another day."
              : undefined
          }
          slotLabels={slotLabels}
          onRetry={handleRetryAvailability}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onBack} className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm">
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!allDone}
          className="rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
        >
          Review {participants.length} booking{participants.length > 1 ? "s" : ""}
        </button>
      </div>
    </section>
  );
}
