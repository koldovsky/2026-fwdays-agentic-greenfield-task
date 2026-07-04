"use client";

import { useState } from "react";

import type { PickedSlot } from "@/components/booking/book-availability";
import { getResidentById, intakeFromResident } from "@/lib/booking/residents";
import type { ScheduledJob, ScheduledJobInput } from "@/lib/booking/schedule/types";
import type { SubmitResult } from "@/lib/booking/submit";
import type { BookingIntake } from "@/lib/booking/types";
import {
  formatOpensAtLabel,
  getOpensAt,
  isWithinBookingWindow,
} from "@/lib/booking/tennis-window";
import type { BookingDraft, Participant, SlotAssignment } from "@/lib/booking/wizard-types";
import { participantKey } from "@/lib/booking/wizard-types";

const DEFAULT_WINDOW_START = "09:00";
const DEFAULT_WINDOW_END = "21:00";

function participantLabel(p: Participant): string {
  if (p.kind === "profile") {
    return getResidentById(p.residentId)?.fullName ?? p.residentId;
  }
  return "Other guest";
}

function intakeForAssignment(
  draft: BookingDraft,
  assignment: SlotAssignment,
): BookingIntake {
  const { slot } = assignment;
  const timePart = assignment.flexibleSlot ? "any available slot" : slot.slot;
  const courtPart = assignment.flexibleCourt ? "any court" : slot.court;
  const request = `Book ${courtPart} ${timePart} on ${slot.date}`;
  const p = assignment.participant;

  if (p.kind === "profile") {
    const resident = getResidentById(p.residentId)!;
    return intakeFromResident(resident, {
      facility: draft.facility,
      bookingRequest: request,
      attestationAccepted: draft.attestationAccepted,
    });
  }

  return {
    provider: "mahogany-hoa",
    facility: draft.facility,
    fullName: draft.otherContact.fullName,
    email: draft.otherContact.email,
    phone: draft.otherContact.phone,
    address: draft.otherContact.address,
    bookingRequest: request,
    attestationAccepted: draft.attestationAccepted,
  };
}

export function assignmentToScheduledInput(
  draft: BookingDraft,
  assignment: SlotAssignment,
): ScheduledJobInput {
  const p = assignment.participant;
  const { slot } = assignment;

  return {
    residentId: p.kind === "profile" ? p.residentId : "other",
    targetDate: slot.date,
    windowStart: DEFAULT_WINDOW_START,
    windowEnd: DEFAULT_WINDOW_END,
    courtPreference: assignment.flexibleCourt ? null : slot.court,
    slotLabel: assignment.flexibleSlot ? null : slot.slot || null,
    bookingRequest: intakeForAssignment(draft, assignment).bookingRequest,
    guestContact:
      p.kind === "other"
        ? {
            fullName: draft.otherContact.fullName,
            email: draft.otherContact.email,
            phone: draft.otherContact.phone,
            address: draft.otherContact.address,
          }
        : undefined,
  };
}

export type SubmitOutcome = {
  kind: "submitted";
  participant: Participant;
  slot: PickedSlot;
  result: SubmitResult;
};

export type ScheduledOutcome = {
  kind: "scheduled";
  participant: Participant;
  slot: PickedSlot;
  job: ScheduledJob;
};

export type WizardOutcome = SubmitOutcome | ScheduledOutcome;

type WizardConfirmStepProps = {
  draft: BookingDraft;
  assignments: SlotAssignment[];
  onBack: () => void;
  onComplete: (outcomes: WizardOutcome[]) => void;
};

export function WizardConfirmStep({
  draft,
  assignments,
  onBack,
  onComplete,
}: WizardConfirmStepProps) {
  const [attestation, setAttestation] = useState(draft.attestationAccepted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const needsSchedule = assignments.some((a) => !isWithinBookingWindow(a.slot.date));
  const sameDate = assignments.length > 1 && assignments.every(
    (a) => a.slot.date === assignments[0]!.slot.date,
  );
  const opensAtLabel =
    needsSchedule && assignments[0]
      ? formatOpensAtLabel(getOpensAt(assignments[0].slot.date))
      : null;

  function formatSlotLine(a: SlotAssignment): string {
    if (a.flexibleSlot) {
      const court = a.flexibleCourt ? "Any court" : a.slot.court;
      return `${a.slot.date} · ${court} · Any time (9 AM – 9 PM)`;
    }
    return `${a.slot.date} · ${a.slot.court} · ${a.slot.slot}`;
  }

  async function handleSubmitAll() {
    if (!attestation) {
      setError("Please accept MHOA rules and automation disclosure.");
      return;
    }
    setSubmitting(true);
    setError(null);

    if (needsSchedule) {
      try {
        setProgress("Scheduling bookings…");
        const jobs = assignments.map((a) =>
          assignmentToScheduledInput({ ...draft, attestationAccepted: attestation }, a),
        );
        const res = await fetch("/api/booking/schedule/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobs }),
        });
        const data = (await res.json()) as { jobs: ScheduledJob[]; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not schedule bookings.");
          setSubmitting(false);
          setProgress("");
          return;
        }

        const outcomes: ScheduledOutcome[] = assignments.map((a, i) => ({
          kind: "scheduled",
          participant: a.participant,
          slot: a.slot,
          job: data.jobs[i]!,
        }));
        setSubmitting(false);
        setProgress("");
        onComplete(outcomes);
      } catch {
        setError("Network error while scheduling.");
        setSubmitting(false);
        setProgress("");
      }
      return;
    }

    const outcomes: SubmitOutcome[] = [];

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]!;
      const label = participantLabel(assignment.participant);
      setProgress(`Submitting ${i + 1} of ${assignments.length}: ${label}…`);

      const intake = intakeForAssignment({ ...draft, attestationAccepted: attestation }, assignment);
      const selection = {
        court: assignment.slot.court,
        slotLabel: assignment.slot.slot,
      };

      try {
        const res = await fetch("/api/booking/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intake,
            selection,
            residentId:
              assignment.participant.kind === "profile"
                ? assignment.participant.residentId
                : null,
          }),
        });
        const data = (await res.json()) as SubmitResult;
        outcomes.push({
          kind: "submitted",
          participant: assignment.participant,
          slot: assignment.slot,
          result: data,
        });
      } catch {
        outcomes.push({
          kind: "submitted",
          participant: assignment.participant,
          slot: assignment.slot,
          result: {
            status: "error",
            runId: `err-${Date.now()}`,
            reason: "Network error during submit.",
          },
        });
      }
    }

    setSubmitting(false);
    setProgress("");
    onComplete(outcomes);
  }

  return (
    <section aria-labelledby="confirm-heading" className="space-y-6">
      <div>
        <h2 id="confirm-heading" className="text-xl font-semibold text-violet-950">
          Confirm — {assignments.length} independent booking{assignments.length > 1 ? "s" : ""}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {needsSchedule
            ? "These dates are not open on MHOA yet — we will queue and book automatically when the window opens."
            : "Each row is submitted separately to MHOA (separate form + captcha)."}
        </p>
      </div>

      {needsSchedule && opensAtLabel && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Scheduled booking</p>
          <p className="mt-1">
            MHOA opens these dates at <strong>{opensAtLabel}</strong>. Run{" "}
            <code className="text-xs">npm run schedule:run</code> hourly (or cron) to auto-submit.
          </p>
        </div>
      )}

      {sameDate && assignments.length > 1 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          MHOA allows <strong>one tennis booking per household per day</strong>. Multiple requests
          on the same date may cause the second to fail — consider consecutive slots on different
          days or one shared court time.
        </p>
      )}

      <ul className="space-y-3">
        {assignments.map((a) => (
          <li
            key={participantKey(a.participant)}
            className="rounded-xl border border-violet-200 bg-white p-4 text-sm"
          >
            <p className="font-semibold text-violet-950">{participantLabel(a.participant)}</p>
            <p className="mt-1 text-zinc-700">{formatSlotLine(a)}</p>
          </li>
        ))}
      </ul>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm">
        <input
          type="checkbox"
          checked={attestation}
          onChange={(e) => setAttestation(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          I am a Mahogany resident, I accept MHOA rules, and I understand Colibri submits each
          booking independently to mahoganyhoa.com.
        </span>
      </label>

      {progress && (
        <p className="text-sm text-violet-800" role="status">
          {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm"
        >
          Back
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmitAll}
          className={`rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50 ${
            needsSchedule
              ? "bg-amber-600"
              : "bg-gradient-to-r from-emerald-600 to-violet-600"
          }`}
        >
          {submitting
            ? needsSchedule
              ? "Scheduling…"
              : "Submitting…"
            : needsSchedule
              ? `Schedule ${assignments.length} booking${assignments.length > 1 ? "s" : ""}`
              : `Submit ${assignments.length} request${assignments.length > 1 ? "s" : ""} to MHOA`}
        </button>
      </div>
    </section>
  );
}
