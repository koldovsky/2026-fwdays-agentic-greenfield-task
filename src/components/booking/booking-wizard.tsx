"use client";

import { useEffect, useState } from "react";

import { WhatStep } from "@/components/booking/wizard/what-step";
import { WhoStep } from "@/components/booking/wizard/who-step";
import { WhenStep } from "@/components/booking/wizard/when-step";
import {
  WizardConfirmStep,
  type WizardOutcome,
} from "@/components/booking/wizard/wizard-confirm-step";
import { WizardResultsStep } from "@/components/booking/wizard/wizard-results-step";
import { prefetchTennisAvailability } from "@/lib/booking/availability-cache";
import type {
  BookingDraft,
  OtherContact,
  SlotAssignment,
  WizardStep,
} from "@/lib/booking/wizard-types";
import type { FacilityType } from "@/lib/booking/types";
import { validateEmail, validateFullName, validatePhone } from "@/lib/booking/validation";

const EMPTY_OTHER: OtherContact = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
};

function initialDraft(): BookingDraft {
  return {
    facility: "tennis",
    participants: [],
    otherContact: { ...EMPTY_OTHER },
    assignments: [],
    attestationAccepted: false,
  };
}

export function BookingWizard() {
  const [step, setStep] = useState<WizardStep>("what");
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [whoError, setWhoError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<WizardOutcome[] | null>(null);

  useEffect(() => {
    if (draft.facility === "tennis") {
      prefetchTennisAvailability();
    }
  }, [draft.facility]);

  function reset() {
    setStep("what");
    setDraft(initialDraft());
    setWhoError(null);
    setOutcomes(null);
  }

  function toggleProfile(residentId: string) {
    setDraft((d) => {
      const exists = d.participants.some(
        (p) => p.kind === "profile" && p.residentId === residentId,
      );
      const participants = exists
        ? d.participants.filter(
            (p) => !(p.kind === "profile" && p.residentId === residentId),
          )
        : [...d.participants, { kind: "profile" as const, residentId }];
      return { ...d, participants, assignments: [] };
    });
  }

  function toggleOther() {
    setDraft((d) => {
      const exists = d.participants.some((p) => p.kind === "other");
      const participants = exists
        ? d.participants.filter((p) => p.kind !== "other")
        : [...d.participants, { kind: "other" as const, contactKey: "other" as const }];
      return { ...d, participants, assignments: [] };
    });
  }

  function validateWho(): boolean {
    if (draft.participants.length === 0) {
      setWhoError("Select at least one participant.");
      return false;
    }
    const other = draft.participants.find((p) => p.kind === "other");
    if (other) {
      const { fullName, email, phone, address } = draft.otherContact;
      if (validateFullName(fullName)) {
        setWhoError("Other guest: enter full name.");
        return false;
      }
      if (validateEmail(email)) {
        setWhoError("Other guest: enter valid email.");
        return false;
      }
      if (validatePhone(phone, draft.facility)) {
        setWhoError("Other guest: enter valid phone.");
        return false;
      }
      if (!address.trim()) {
        setWhoError("Other guest: enter address.");
        return false;
      }
    }
    setWhoError(null);
    return true;
  }

  if (outcomes) {
    return (
      <WizardResultsStep outcomes={outcomes} onNewBooking={reset} />
    );
  }

  return (
    <div className="space-y-4">
      {step === "what" && (
        <WhatStep
          facility={draft.facility}
          onChange={(facility: FacilityType) =>
            setDraft((d) => ({ ...d, facility, assignments: [] }))
          }
          onNext={() => setStep("who")}
        />
      )}

      {step === "who" && (
        <WhoStep
          participants={draft.participants}
          otherContact={draft.otherContact}
          onToggleProfile={toggleProfile}
          onToggleOther={toggleOther}
          onOtherContactChange={(patch) =>
            setDraft((d) => ({ ...d, otherContact: { ...d.otherContact, ...patch } }))
          }
          onBack={() => setStep("what")}
          onNext={() => {
            if (validateWho()) setStep("when");
          }}
          error={whoError}
        />
      )}

      {step === "when" && draft.facility === "tennis" && (
        <WhenStep
          participants={draft.participants}
          assignments={draft.assignments}
          onAssignmentsChange={(assignments: SlotAssignment[]) =>
            setDraft((d) => ({ ...d, assignments }))
          }
          onBack={() => setStep("who")}
          onNext={() => setStep("confirm")}
        />
      )}

      {step === "when" && draft.facility !== "tennis" && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
          <p className="font-medium text-amber-950">Picnic booking wizard coming soon</p>
          <button type="button" onClick={() => setStep("who")} className="mt-3 underline">
            Back
          </button>
        </section>
      )}

      {step === "confirm" && (
        <WizardConfirmStep
          draft={draft}
          assignments={draft.assignments}
          onBack={() => setStep("when")}
          onComplete={(results) => setOutcomes(results)}
        />
      )}

    </div>
  );
}
