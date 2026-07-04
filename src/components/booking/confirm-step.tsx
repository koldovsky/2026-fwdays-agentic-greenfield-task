"use client";

import { useEffect, useState } from "react";

import type { PickedSlot } from "@/components/booking/book-availability";
import { AvailabilityPanel, type SlotSelection } from "@/components/booking/availability-panel";
import type { AvailabilityResult } from "@/lib/booking/availability";
import { pickDefaultSlot } from "@/lib/booking/availability";
import { parseResidentIds } from "@/lib/booking/parse-residents";
import type { SubmitResult, BookingSelection } from "@/lib/booking/submit";
import type { ParsedBookingIntent } from "@/lib/booking/parse";
import type { ValidationError } from "@/lib/booking/validate-rules";
import type { BookingIntake } from "@/lib/booking/types";
import { FACILITY_LABEL } from "@/lib/booking/types";
import type { ScheduledJob } from "@/lib/booking/schedule/types";
import {
  formatOpensAtLabel,
  getOpensAt,
  isWithinBookingWindow,
} from "@/lib/booking/tennis-window";

type ConfirmStepProps = {
  intake: BookingIntake;
  parsed: ParsedBookingIntent;
  validationErrors: ValidationError[];
  pickedSlot: PickedSlot | null;
  residentId: string | null;
  onBack: () => void;
  onComplete: (result: SubmitResult) => void;
  onScheduled: (jobs: ScheduledJob[]) => void;
};

export function ConfirmStep({
  intake,
  parsed,
  validationErrors,
  pickedSlot,
  residentId,
  onBack,
  onComplete,
  onScheduled,
}: ConfirmStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [selection, setSelection] = useState<SlotSelection | null>(
    pickedSlot ? { court: pickedSlot.court, slot: pickedSlot.slot } : null,
  );

  const beyondWindow = validationErrors.some((e) => e.code === "BC-MHOA-TENNIS-04");
  const needsSchedule = beyondWindow || !isWithinBookingWindow(parsed.date);
  const blockingErrors = validationErrors.filter((e) => e.code !== "BC-MHOA-TENNIS-04");
  const canLoadAvailability =
    blockingErrors.length === 0 && intake.facility === "tennis" && !needsSchedule;

  const parsedResidents = parseResidentIds(intake.bookingRequest);
  const scheduleResidents =
    parsedResidents.length > 0
      ? parsedResidents
      : residentId
        ? [residentId]
        : ["max"];
  const householdConflict =
    scheduleResidents.length > 1 &&
    parsed.slotsRequested <= 1 &&
    needsSchedule === false;

  useEffect(() => {
    if (pickedSlot) {
      setSelection({ court: pickedSlot.court, slot: pickedSlot.slot });
      return;
    }
    if (!canLoadAvailability) return;

    let cancelled = false;
    async function load() {
      setLoadingAvailability(true);
      setAvailability(null);
      setSelection(null);
      try {
        const res = await fetch("/api/booking/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: parsed.date }),
        });
        const data = (await res.json()) as AvailabilityResult;
        if (cancelled) return;
        setAvailability(data);
        if (data.status === "ok") {
          const defaultPick = pickDefaultSlot(
            data.courts,
            parsed.windowStart,
            parsed.windowEnd,
            parsed.courtOrSite,
          );
          if (defaultPick) setSelection(defaultPick);
        }
      } catch {
        if (!cancelled) {
          setAvailability({
            status: "error",
            date: parsed.date,
            reason: "Could not reach availability service.",
            fetchedAt: new Date().toISOString(),
          });
        }
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    canLoadAvailability,
    parsed.date,
    parsed.windowStart,
    parsed.windowEnd,
    parsed.courtOrSite,
    pickedSlot,
  ]);

  const canSubmit =
    canLoadAvailability &&
    !loadingAvailability &&
    (pickedSlot !== null || (availability?.status === "ok" && selection !== null));

  async function handleSubmit() {
    if (!selection) return;
    setSubmitting(true);
    setSubmitError(null);
    const bookingSelection: BookingSelection = {
      court: selection.court,
      slotLabel: selection.slot,
    };
    try {
      const res = await fetch("/api/booking/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake, selection: bookingSelection }),
      });
      const data = (await res.json()) as SubmitResult & {
        errors?: ValidationError[];
      };

      if (res.status === 400 && data.errors) {
        setSubmitError(data.errors.map((e) => e.message).join(" "));
        return;
      }

      if (data.status === "error") {
        setSubmitError(data.reason);
        return;
      }
      if (data.status === "success") {
        onComplete(data);
      }
    } catch {
      setSubmitError("Could not reach booking service.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchedule() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/booking/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingRequest: intake.bookingRequest,
          residentIds: scheduleResidents,
          targetDate: parsed.date,
          slotLabel: selection?.slot ?? pickedSlot?.slot ?? null,
          court: selection?.court ?? pickedSlot?.court ?? parsed.courtOrSite,
        }),
      });
      const data = (await res.json()) as { jobs: ScheduledJob[]; error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not schedule booking.");
        return;
      }
      onScheduled(data.jobs);
    } catch {
      setSubmitError("Could not reach scheduling service.");
    } finally {
      setSubmitting(false);
    }
  }

  const opensAt = getOpensAt(parsed.date);

  return (
    <section
      aria-labelledby="confirm-heading"
      className="space-y-6 rounded-2xl border border-violet-200 bg-violet-50/50 p-6"
    >
      <div>
        <h2 id="confirm-heading" className="text-xl font-semibold text-violet-950">
          Review your booking request
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {needsSchedule
            ? "This date is not open on MHOA yet — schedule and we will book when the window opens."
            : pickedSlot
              ? "You picked a slot on the previous page — confirm and submit."
              : "Check availability on both courts, pick a slot, then submit."}
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500">Facility</dt>
          <dd className="text-zinc-900">{FACILITY_LABEL[intake.facility]}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Full name</dt>
          <dd className="text-zinc-900">{intake.fullName}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Email</dt>
          <dd className="text-zinc-900">{intake.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Phone</dt>
          <dd className="text-zinc-900">{intake.phone}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500">Address</dt>
          <dd className="text-zinc-900">{intake.address}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500">Your request</dt>
          <dd className="whitespace-pre-wrap text-zinc-900">{intake.bookingRequest}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-violet-300 bg-white p-4 text-sm">
        <p className="font-medium text-violet-900">Parsed intent</p>
        <ul className="mt-2 space-y-1 text-zinc-700">
          <li>
            Date: <strong>{parsed.date}</strong>
          </li>
          <li>
            Time window:{" "}
            <strong>
              {parsed.windowStart} – {parsed.windowEnd}
            </strong>
          </li>
          <li>
            Slot duration: <strong>{parsed.slotDurationMinutes} min</strong>
          </li>
          <li>
            Residents: <strong>{scheduleResidents.join(", ")}</strong>
          </li>
          <li>
            Court preference:{" "}
            <strong>{parsed.courtOrSite ?? "Any available"}</strong>
          </li>
        </ul>
      </div>

      {needsSchedule && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Scheduled booking required</p>
          <p className="mt-1">
            MHOA only opens dates <strong>1–7 days ahead</strong>.{" "}
            <strong>{parsed.date}</strong> opens at{" "}
            <strong>{formatOpensAtLabel(opensAt)}</strong>. We will check slots and
            book automatically when the calendar opens (run{" "}
            <code className="text-xs">npm run schedule:run</code> hourly).
          </p>
          {scheduleResidents.length > 1 && (
            <p className="mt-2 text-amber-900">
              Note: MHOA allows <strong>one tennis booking per household per day</strong>.
              Scheduling for {scheduleResidents.join(" and ")} may mean only the first
              succeeds unless you use different dates.
            </p>
          )}
        </div>
      )}

      {canLoadAvailability && !pickedSlot && (
        <div className="rounded-xl border border-violet-300 bg-violet-50/80 p-4">
          <AvailabilityPanel
            availability={
              availability ?? {
                status: "error",
                date: parsed.date,
                reason: "",
                fetchedAt: "",
              }
            }
            windowStart={parsed.windowStart}
            windowEnd={parsed.windowEnd}
            selection={selection}
            onSelect={setSelection}
            loading={loadingAvailability || !availability}
          />
        </div>
      )}

      {pickedSlot && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm">
          <p className="font-medium text-emerald-900">Slot from book page</p>
          <p className="mt-1">
            {pickedSlot.court} · {pickedSlot.slot} · {pickedSlot.date}
          </p>
        </div>
      )}

      {householdConflict && (
        <p className="text-sm text-amber-800" role="status">
          Multiple residents on the same day may hit MHOA&apos;s one-booking-per-household rule.
        </p>
      )}

      {blockingErrors.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Cannot submit yet</p>
          <ul className="mt-1 list-disc pl-5">
            {blockingErrors.map((e) => (
              <li key={e.code}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {submitting && (
        <p className="text-sm text-violet-800" role="status">
          {needsSchedule ? "Scheduling…" : "Submitting to MHOA…"}
        </p>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-white disabled:opacity-50"
        >
          Edit details
        </button>
        {needsSchedule && blockingErrors.length === 0 && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSchedule}
            className="rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
          >
            {submitting ? "Scheduling…" : `Schedule for ${scheduleResidents.length} resident(s)`}
          </button>
        )}
        {!needsSchedule && (
          <button
            type="button"
            disabled={!canSubmit || submitting || blockingErrors.length > 0}
            onClick={handleSubmit}
            className="rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit to MHOA"}
          </button>
        )}
      </div>
    </section>
  );
}
