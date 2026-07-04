export type ResidentProfile = {
  id: string;
  label: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

/** Mahogany household members — MVP only, no auth (OOS-ACCT-01). */
export const RESIDENT_PROFILES: ResidentProfile[] = [
  {
    id: "max",
    label: "Max",
    fullName: "Max Bugaiov",
    email: "maxbugaiov@gmail.com",
    phone: "8257337503",
    address: "279 Marine DR SE",
  },
  {
    id: "nataliia",
    label: "Nataliia",
    fullName: "Nataliia Pokotylo",
    email: "pokotylo.nataliia@gmail.com",
    phone: "8257339616",
    address: "279 Marine DR SE",
  },
  {
    id: "yurii",
    label: "Yurii",
    fullName: "Yurii Smolin",
    email: "smolin.yurii93@gmail.com",
    phone: "4038319151",
    address: "3318-11 Mahogany Row SE",
  },
];

export const DEFAULT_RESIDENT_ID = "max";

export function getResidentById(id: string | null): ResidentProfile | undefined {
  if (!id) return undefined;
  return RESIDENT_PROFILES.find((r) => r.id === id);
}

export function getResidentByEmail(email: string): ResidentProfile | undefined {
  const normalized = email.trim().toLowerCase();
  return RESIDENT_PROFILES.find((r) => r.email.toLowerCase() === normalized);
}

export function intakeFromResident(
  resident: ResidentProfile,
  partial: Pick<
    import("@/lib/booking/types").BookingIntake,
    "facility" | "bookingRequest" | "attestationAccepted"
  >,
): import("@/lib/booking/types").BookingIntake {
  return {
    provider: "mahogany-hoa",
    facility: partial.facility,
    fullName: resident.fullName,
    email: resident.email,
    phone: resident.phone,
    address: resident.address,
    bookingRequest: partial.bookingRequest,
    attestationAccepted: partial.attestationAccepted,
  };
}
