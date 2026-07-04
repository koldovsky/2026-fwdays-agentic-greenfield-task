export type ProviderId = "mahogany-hoa";

export type FacilityType = "tennis" | "picnic";

export type BookingIntake = {
  provider: ProviderId;
  facility: FacilityType;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  bookingRequest: string;
  attestationAccepted: boolean;
};

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  "mahogany-hoa": "Mahogany HOA",
};

export const FACILITY_LABEL: Record<FacilityType, string> = {
  tennis: "Tennis Courts",
  picnic: "Beach Picnic Sites",
};

export const UNBOOKABLE_FACILITIES = [
  "Beach volleyball (coming soon on MHOA)",
  "Natural amphitheatre (coming soon)",
  "Community skatepark",
  "Volleyball / basketball / playground (first-come, first-served)",
] as const;
