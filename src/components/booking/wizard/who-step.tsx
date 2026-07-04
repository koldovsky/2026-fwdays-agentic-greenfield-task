"use client";

import {
  RESIDENT_PROFILES,
  type ResidentProfile,
} from "@/lib/booking/residents";
import type { OtherContact, Participant } from "@/lib/booking/wizard-types";

type WhoStepProps = {
  participants: Participant[];
  otherContact: OtherContact;
  onToggleProfile: (residentId: string) => void;
  onToggleOther: () => void;
  onOtherContactChange: (patch: Partial<OtherContact>) => void;
  onBack: () => void;
  onNext: () => void;
  error: string | null;
};

function isProfileSelected(participants: Participant[], id: string) {
  return participants.some((p) => p.kind === "profile" && p.residentId === id);
}

function isOtherSelected(participants: Participant[]) {
  return participants.some((p) => p.kind === "other");
}

export function WhoStep({
  participants,
  otherContact,
  onToggleProfile,
  onToggleOther,
  onOtherContactChange,
  onBack,
  onNext,
  error,
}: WhoStepProps) {
  const count = participants.length;

  return (
    <section aria-labelledby="who-heading" className="space-y-6">
      <div>
        <h2 id="who-heading" className="text-xl font-semibold text-emerald-950">
          Who is booking?
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Select one or more people — each gets their own slot and a separate MHOA request.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Participants</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESIDENT_PROFILES.map((resident: ResidentProfile) => {
            const active = isProfileSelected(participants, resident.id);
            return (
              <button
                key={resident.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleProfile(resident.id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  active
                    ? "border-violet-400 bg-violet-50 ring-2 ring-violet-300"
                    : "border-zinc-200 bg-white hover:border-emerald-300"
                }`}
              >
                <span className="block font-semibold">{resident.label}</span>
                <span className="text-xs text-zinc-500">{resident.email}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={isOtherSelected(participants)}
            onClick={onToggleOther}
            className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
              isOtherSelected(participants)
                ? "border-violet-400 bg-violet-50 ring-2 ring-violet-300"
                : "border-zinc-200 bg-white hover:border-emerald-300"
            }`}
          >
            <span className="block font-semibold">Other guest</span>
            <span className="text-xs text-zinc-500">Enter contact manually</span>
          </button>
        </div>
        {count > 0 && (
          <p className="text-sm text-violet-800">
            {count} participant{count > 1 ? "s" : ""} — {count} slot{count > 1 ? "s" : ""} on the
            next step
          </p>
        )}
      </fieldset>

      {isOtherSelected(participants) && (
        <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Full name</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={otherContact.fullName}
              onChange={(e) => onOtherContactChange({ fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={otherContact.email}
              onChange={(e) => onOtherContactChange({ email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={otherContact.phone}
              onChange={(e) => onOtherContactChange({ phone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Address</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={otherContact.address}
              onChange={(e) => onOtherContactChange({ address: e.target.value })}
            />
          </div>
        </div>
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
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={count === 0}
          className="rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
        >
          Continue — Pick {count || ""} slot{count !== 1 ? "s" : ""}
        </button>
      </div>
    </section>
  );
}
