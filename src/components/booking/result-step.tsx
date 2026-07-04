"use client";

import Link from "next/link";

import type { SubmitSuccess } from "@/lib/booking/submit";

type ResultStepProps = {
  result: SubmitSuccess;
  onNewBooking: () => void;
};

export function ResultStep({ result, onNewBooking }: ResultStepProps) {
  const approved = result.mhoaApproved;

  return (
    <section
      aria-labelledby="result-heading"
      className={`space-y-6 rounded-2xl border p-6 ${
        approved
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div>
        <h2
          id="result-heading"
          className={`text-xl font-semibold ${approved ? "text-emerald-950" : "text-amber-950"}`}
        >
          {approved ? "Confirmed by Mahogany HOA" : "Booking recorded (demo)"}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {approved
            ? "MHOA accepted this tennis court reservation."
            : "Stub mode — no request was sent to mahoganyhoa.com."}
        </p>
        <p className="mt-1 text-sm text-zinc-500">Run ID: {result.runId}</p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500">Booked by</dt>
          <dd className="text-zinc-900">{result.fullName}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Confirmation email</dt>
          <dd className="text-zinc-900">{result.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Facility</dt>
          <dd className="text-zinc-900">{result.facility}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Date</dt>
          <dd className="text-zinc-900">{result.date}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Court</dt>
          <dd className="text-zinc-900">{result.court}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Time slot</dt>
          <dd className="text-zinc-900">{result.slot}</dd>
        </div>
        {approved && (
          <div className="sm:col-span-2">
            <dt className="font-medium text-zinc-500">Confirmed at</dt>
            <dd className="text-zinc-900">{new Date(result.confirmedAt).toLocaleString()}</dd>
          </div>
        )}
      </dl>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Cancellation (FR-RESULT-03)</p>
        <p className="mt-1">
          Tennis:{" "}
          <a className="text-violet-700 underline" href="mailto:reception@mahoganyhoa.com">
            reception@mahoganyhoa.com
          </a>{" "}
          · (403) 453-1221
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onNewBooking}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white ${
            approved ? "bg-emerald-600" : "bg-amber-600"
          }`}
        >
          New booking
        </button>
        {approved && (
          <Link
            href="/bookings"
            className="rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800"
          >
            View my bookings
          </Link>
        )}
      </div>
    </section>
  );
}
