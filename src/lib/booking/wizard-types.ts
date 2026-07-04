import type { FacilityType } from "@/lib/booking/types";
import type { PickedSlot } from "@/components/booking/book-availability";

export type WizardStep = "what" | "who" | "when" | "confirm";

export type Participant =
  | { kind: "profile"; residentId: string }
  | { kind: "other"; contactKey: "other" };

export type OtherContact = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

export type SlotAssignment = {
  participant: Participant;
  slot: PickedSlot;
  /** No exact slot — runner picks first available in window. */
  flexibleSlot?: boolean;
  /** No court preference — runner picks any court. */
  flexibleCourt?: boolean;
};

export type BookingDraft = {
  facility: FacilityType;
  participants: Participant[];
  otherContact: OtherContact;
  assignments: SlotAssignment[];
  attestationAccepted: boolean;
};

export function participantKey(p: Participant): string {
  return p.kind === "profile" ? p.residentId : p.contactKey;
}

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: "what", label: "What" },
  { id: "who", label: "Who" },
  { id: "when", label: "When" },
  { id: "confirm", label: "Confirm" },
];
