"use client";

import Link from "next/link";

import type { WizardOutcome } from "@/components/booking/wizard/wizard-confirm-step";
import { getResidentById } from "@/lib/booking/residents";
import { formatOpensAtLabel } from "@/lib/booking/tennis-window";
import type { Participant } from "@/lib/booking/wizard-types";

function label(p: Participant) {
  if (p.kind === "profile") return getResidentById(p.residentId)?.fullName ?? p.residentId;
  return "Other guest";
}

type WizardResultsStepProps = {
  outcomes: WizardOutcome[];
  onNewBooking: () => void;
};

export function WizardResultsStep({ outcomes, onNewBooking }: WizardResultsStepProps) {
  const scheduled = outcomes.filter((o) => o.kind === "scheduled");
  const submitted = outcomes.filter((o) => o.kind === "submitted");
  const ok = submitted.filter((o) => o.result.status === "success" && o.result.mhoaApproved);
  const failed = submitted.filter((o) => o.result.status !== "success" || !o.result.mhoaApproved);

  if (scheduled.length > 0 && submitted.length === 0) {
    return (
      <section className="space-y-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
        <div>
          <h2 className="text-xl font-semibold text-amber-950">Bookings queued</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {scheduled.length} scheduled — we will submit to MHOA when each date opens.
          </p>
        </div>

        <ul className="space-y-3">
          {scheduled.map((o, i) => (
            <li key={i} className="rounded-xl border border-amber-200 bg-white p-4 text-sm">
              <p className="font-semibold">{label(o.participant)}</p>
              <p className="text-zinc-600">
                {o.slot.date} · {o.slot.court}
                {o.slot.slot ? ` · ${o.slot.slot}` : " · Any time"}
              </p>
              <p className="mt-2 text-amber-900">
                Opens {formatOpensAtLabel(new Date(o.job.opensAt))} · status: {o.job.status}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/scheduled"
            className="rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            View scheduled queue
          </Link>
          <button
            type="button"
            onClick={onNewBooking}
            className="rounded-full border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900"
          >
            New booking
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
      <div>
        <h2 className="text-xl font-semibold text-emerald-950">Booking results</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {ok.length} confirmed · {failed.length} failed of {submitted.length} independent requests
          {scheduled.length > 0 ? ` · ${scheduled.length} queued` : ""}
        </p>
      </div>

      <ul className="space-y-3">
        {outcomes.map((o, i) => {
          if (o.kind === "scheduled") {
            return (
              <li
                key={i}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
              >
                <p className="font-semibold">{label(o.participant)}</p>
                <p className="text-zinc-600">{o.slot.date} · Queued for MHOA</p>
              </li>
            );
          }

          const success = o.result.status === "success" && o.result.mhoaApproved;
          return (
            <li
              key={i}
              className={`rounded-xl border p-4 text-sm ${
                success ? "border-emerald-200 bg-white" : "border-red-200 bg-red-50"
              }`}
            >
              <p className="font-semibold">{label(o.participant)}</p>
              <p className="text-zinc-600">
                {o.slot.court} · {o.slot.slot} · {o.slot.date}
              </p>
              {success ? (
                <p className="mt-2 text-emerald-800">Confirmed by Mahogany HOA</p>
              ) : (
                <p className="mt-2 text-red-700">
                  {o.result.status === "error" ? o.result.reason : "Not confirmed"}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3">
        {scheduled.length > 0 && (
          <Link
            href="/scheduled"
            className="rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            View scheduled queue
          </Link>
        )}
        <button
          type="button"
          onClick={onNewBooking}
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          New booking
        </button>
      </div>
    </section>
  );
}
